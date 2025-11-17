const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { getAuthenticatedUserId } = require('../utils/jwt');


// ToDo: überprüfen
router.get('/front', async (req, res) => {
  try {
    // Query params: q (string), category or categories (comma-separated list), sort, dir
    const q = req.query.q || req.query.search || '';
    const rawCategories = req.query.category || req.query.categories || '';
    const categories = rawCategories
      ? Array.isArray(rawCategories)
        ? rawCategories
        : rawCategories.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
      : [];

    const sort = req.query.sort || null;
    const dir = (req.query.dir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const result = {};

    // Helper: build orderBy for trees
    let orderBy = undefined;
    if (sort === 'likes') {
      orderBy = { likes: { _count: dir } };
    } else if (sort === 'comments') {
      orderBy = { comments: { _count: dir } };
    } else if (sort === 'clicks') {
      orderBy = { clicks: dir };
    } else if (sort === 'releaseDate') {
      orderBy = { releaseDate: dir };
    }

    // If categories includes 'users', return matching users
    if (categories.length === 0 || categories.includes('users')) {
      if (q) {
        const users = await prisma.user.findMany({
          where: {
            nickname: { contains: q, mode: 'insensitive' }
          },
          select: {
            id: true,
            nickname: true,
            image: true
          },
          take: 50
        });

        result.users = users.map(u => ({ id: u.id, name: u.nickname, profileImage: u.image || null }));
      } else if (categories.includes('users')) {
        // explicit request for users without query -> return empty list or top users
        result.users = [];
      }
    }

    // If categories empty or includes 'tree' or 'artist' -> search trees
    const treeCategories = categories.length === 0 ? ['tree', 'artist'] : categories.filter(c => ['tree', 'artist'].includes(c));
    if (treeCategories.length > 0) {
      const where = { isPublic: true };

      // Build OR conditions based on requested categories
      const or = [];
      if (q) {
        if (treeCategories.includes('tree')) {
          or.push({ title: { contains: q, mode: 'insensitive' } });
          or.push({ description: { contains: q, mode: 'insensitive' } });
        }
        if (treeCategories.includes('artist')) {
          or.push({ interpret: { contains: q, mode: 'insensitive' } });
        }
        // also allow searching by owner nickname when querying trees
        or.push({ owner: { nickname: { contains: q, mode: 'insensitive' } } });
      }

      if (or.length > 0) where.OR = or;

      let trees = [];

      if (sort === 'relevance') {
        // Perform relevance calculation in SQL for accurate ordering and pagination.
        // Weights: likes=0.5, comments=0.3, clicks=0.2
        const wLikes = 0.5, wComments = 0.3, wClicks = 0.2;
        const take = 100;

        if (q) {
          const qLike = `%${q}%`;
          const rows = await prisma.$queryRaw`
            SELECT l.id, l.title, l.description, l.interpret, l.album, l.cover, l.isPublic, l.releaseDate,
                   l.amazonmusicUrl, l.applemusicUrl, l.soundcloudUrl, l.spotifyUrl, l.youtubeUrl, l.youtubemusicUrl, l.ytId, l.clicks,
                   COALESCE(lk.likes, 0) AS likes, COALESCE(cm.comments, 0) AS comments,
                   (COALESCE(lk.likes, 0) * ${wLikes} + COALESCE(cm.comments, 0) * ${wComments} + COALESCE(l.clicks, 0) * ${wClicks}) AS score,
                   u.id AS ownerId, u.nickname AS ownerName, u.image AS ownerImage
            FROM linktree l
            LEFT JOIN (SELECT linktreeId, COUNT(*) AS likes FROM \`like\` GROUP BY linktreeId) lk ON lk.linktreeId = l.id
            LEFT JOIN (SELECT linktreeId, COUNT(*) AS comments FROM comment GROUP BY linktreeId) cm ON cm.linktreeId = l.id
            LEFT JOIN \`user\` u ON u.id = l.ownerId
            WHERE l.isPublic = true
              AND (l.title LIKE ${qLike} OR l.description LIKE ${qLike} OR l.interpret LIKE ${qLike} OR u.nickname LIKE ${qLike})
            ORDER BY score ${dir}
            LIMIT ${take}
          `;
          trees = rows;
        } else {
          const take = 100;
          const rows = await prisma.$queryRaw`
            SELECT l.id, l.title, l.description, l.interpret, l.album, l.cover, l.isPublic, l.releaseDate,
                   l.amazonmusicUrl, l.applemusicUrl, l.soundcloudUrl, l.spotifyUrl, l.youtubeUrl, l.youtubemusicUrl, l.ytId, l.clicks,
                   COALESCE(lk.likes, 0) AS likes, COALESCE(cm.comments, 0) AS comments,
                   (COALESCE(lk.likes, 0) * ${wLikes} + COALESCE(cm.comments, 0) * ${wComments} + COALESCE(l.clicks, 0) * ${wClicks}) AS score,
                   u.id AS ownerId, u.nickname AS ownerName, u.image AS ownerImage
            FROM linktree l
            LEFT JOIN (SELECT linktreeId, COUNT(*) AS likes FROM \`like\` GROUP BY linktreeId) lk ON lk.linktreeId = l.id
            LEFT JOIN (SELECT linktreeId, COUNT(*) AS comments FROM comment GROUP BY linktreeId) cm ON cm.linktreeId = l.id
            LEFT JOIN \`user\` u ON u.id = l.ownerId
            WHERE l.isPublic = true
            ORDER BY score ${dir}
            LIMIT ${take}
          `;
          trees = rows;
        }
      } else {
        trees = await prisma.linktree.findMany({
          where,
          orderBy: orderBy ? orderBy : { createdAt: 'desc' },
          include: {
            owner: { select: { id: true, nickname: true, image: true } },
            _count: { select: { likes: true, comments: true } }
          },
          take: 100
        });
      }

      // If user is authenticated, compute which trees are liked by the user
      let likedSet = null;
      if (getAuthenticatedUserId(req)) {
        const treeIds = trees.map(t => t.id).filter(Boolean);
        if (treeIds.length > 0) {
          const likes = await prisma.like.findMany({
            where: { userId: currentUserId, linktreeId: { in: treeIds } },
            select: { linktreeId: true }
          });
          likedSet = new Set(likes.map(l => l.linktreeId));
        }
      }

      // map trees to expected output shape
      result.treelist = trees.map(t => ({
        id: t.id,
        title: t.title,
        interpret: t.interpret,
        album: t.album || null,
        description: t.description,
        cover: t.cover || null,
        isPublic: t.isPublic,
        releaseDate: t.releaseDate,
        amazonmusicUrl: t.amazonmusicUrl || null,
        applemusicUrl: t.applemusicUrl || null,
        soundcloudUrl: t.soundcloudUrl || null,
        spotifyUrl: t.spotifyUrl || null,
        youtubeUrl: t.youtubeUrl || null,
        youtubemusicUrl: t.youtubemusicUrl || null,
        ytId: t.ytId || null,
        clicks: t.clicks || 0,
        likes: { count: (t._count && t._count.likes) || t.likes || 0, liked: likedSet ? likedSet.has(t.id) : null},
        comments: (t._count && t._count.comments) || t.comments || 0,
        owner: {
          id: (t.owner && t.owner.id) || t.ownerId || null,
          name: (t.owner && t.owner.nickname) || t.ownerName || null,
          profileImage: (t.owner && t.owner.image) || t.ownerImage || null
        }
      }));
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;