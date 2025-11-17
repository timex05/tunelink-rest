const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const { getAuthenticatedUserId } = require('../utils/jwt');

// GET /api/comments/tree - Alle kommentierte Trees
router.get('/tree', auth, async (req, res) => {
  try {
    const commentedTrees = await prisma.linktree.findMany({
      where: {
        comments: {
          some: {
            ownerId: req.user.userId
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
    if (getAuthenticatedUserId(req)) {
      const treeIds = commentedTrees.map(t => t.id).filter(Boolean);
      if (treeIds.length > 0) {
        const likes = await prisma.like.findMany({
          where: { userId: currentUserId, linktreeId: { in: treeIds } },
          select: { linktreeId: true }
        });
        likedSet = new Set(likes.map(l => l.linktreeId));
      }
    }

    let result = {};
    // map trees to expected output shape
    result.treelist = commentedTrees.map(t => ({
      id: t.id,
      title: t.title,
      interpret: t.interpret,
      album: t.album || null,
      description: t.description,
      cover: t.cover || null,
      isPublic: t.isPublic,
      releaseDate: t.releaseDate,
      urls: {
        amazonmusic: t.amazonmusicUrl || null,
        applemusic: t.applemusicUrl || null,
        soundcloud: t.soundcloudUrl || null,
        spotify: t.spotifyUrl || null,
        youtube: t.youtubeUrl || null,
        youtubemusic: t.youtubemusicUrl || null,
      },
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
    
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;