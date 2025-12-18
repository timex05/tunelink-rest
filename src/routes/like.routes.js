const express = require('express');
const { prisma } = require('../utils/prisma');
const { needsAuth, canAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/like/tree - Alle gelikete Trees
router.get('/tree', needsAuth(), async (req, res) => {
  try {
    const likedTrees = await prisma.linktree.findMany({
      where: {
        likes: {
          some: {
            userId: req.userId
          }
        }
      },
      include: {
        owner: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    let likedSet = null;
    const treeIds = likedTrees.map(t => t.id).filter(Boolean);
    if (treeIds.length > 0) {
      const likes = await prisma.like.findMany({
        where: { userId: req.userId, linktreeId: { in: treeIds } },
        select: { linktreeId: true }
      });
      likedSet = new Set(likes.map(l => l.linktreeId));
    }
    

    // map trees to expected output shape
    const result = {}
    result.treelist = likedTrees.map(t => ({
      id: t.id,
      title: t.title,
      interpret: t.interpret,
      album: t.album || null,
      description: t.description,
      cover: t.cover || null,
      releaseDate: new Date(t.releaseDate).toISOString(),
      ytId: t.ytId || null,
      urls: {
        amazonmusic: t.amazonmusicUrl || null,
        applemusic: t.applemusicUrl || null,
        soundcloud: t.soundcloudUrl || null,
        spotify: t.spotifyUrl || null,
        youtube: t.youtubeUrl || null,
        youtubemusic: t.youtubemusicUrl || null
      },
      analytics: {
        clicks: t.clicks || 0,
        likes: { count: (t._count && t._count.likes) || t.likes || 0, liked: likedSet ? likedSet.has(t.id) : null},
        comments: (t._count && t._count.comments) || t.comments || 0
      },
      owner: {
        id: (t.owner && t.owner.id) || t.ownerId || null,
        name: (t.owner && t.owner.nickname) || t.ownerName || null,
        profileImg: {
          url: (t.owner && t.owner.image) || t.ownerImage || null,
          default: (t.owner && t.owner.dummyProfileType) || t.dummyProfileType || null
        }
      },
      permissions: (req.userId == t.ownerId ? {canEdit: true, canDelete: true}: {canEdit: false, canDelete: false})
    }));
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Error." });
  }
});


module.exports = router;