const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const { extractToken, verifyToken, getAuthenticatedUserId } = require('../utils/jwt');

// GET /api/tree/:id - Einzelnen Tree abrufen
router.get('/:id', async (req, res) => {
  try {
    // Try to extract authenticated user (optional)
    

    const tree = await prisma.linktree.findUnique({
      where: { id: req.params.id },
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
    
    // Increment clicks
    await prisma.linktree.update({
      where: { id: req.params.id },
      data: { clicks: { increment: 1 } }
    });

    // Check if current user liked this tree (if authenticated)
    let userLiked = false;
    let currentUserId = getAuthenticatedUserId(req);
    if (currentUserId && tree) {
      const like = await prisma.like.findUnique({
        where: {
          userId_linktreeId: {
            userId: currentUserId,
            linktreeId: tree.id
          }
        }
      });
      userLiked = like !== null;
    }
    let result = {}
    result.tree = {
      tree: {
        id: tree.id, 
        title: tree.title, 
        interpret: tree.interpret, 
        album: tree.album || null, 
        description: tree.description, 
        cover: tree.cover || null, 
        releaseDate: tree.releaseDate, 
        urls: {
          amazonmusic: tree.amazonmusicUrl || null, 
          applemusic: tree.applemusicUrl || null, 
          soundcloud: tree.soundcloudUrl || null, 
          spotify: tree.spotifyUrl || null, 
          youtube: tree.youtubeUrl || null, 
          youtubemusic: tree.youtubemusicUrl || null
        },
        ytId: tree.ytId || null, 
        clicks: tree.clicks, 
        likes: { count: tree._count.likes, liked: userLiked}, 
        comments: tree._count.comments
      }
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/tree - Alle eigenen Trees abrufen
router.get('/', auth, async (req, res) => {
  try {
    const trees = await prisma.linktree.findMany({
      where: { ownerId: req.user.userId },
      include: {
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        owner: true
      },
    });

    let likedSet = null;
    if (req.user.id) {
      const treeIds = trees.map(t => t.id).filter(Boolean);
      if (treeIds.length > 0) {
        const likes = await prisma.like.findMany({
          where: { userId: currentUserId, linktreeId: { in: treeIds } },
          select: { linktreeId: true }
        });
        likedSet = new Set(likes.map(l => l.linktreeId));
      }
    }

    let result = {};

    result.treelist = trees.map(t => ({
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

// POST /api/tree - Tree erstellen
router.post('/', auth, async (req, res) => {
  try {
    const treeData = {
      ...req.body,
      ownerId: req.user.userId
    };
    await prisma.linktree.create({ data: treeData });
    res.status(200).json({ message: 'Linktree erfolgreich erstellt' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/tree/:id - Tree bearbeiten
router.put('/:id', auth, async (req, res) => {
  try {
    const tree = await prisma.linktree.findUnique({
      where: { id: req.params.id }
    });
    
    if (!tree || tree.ownerId !== req.user.userId) {
      throw new Error('Unauthorized');
    }

    await prisma.linktree.update({
      where: { id: req.params.id },
      data: req.body
    });

    res.status(200).json({ message: 'Linktree erfolgreich aktualisiert' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/tree/:id - Tree löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    const tree = await prisma.linktree.findUnique({
      where: { id: req.params.id }
    });
    
    if (!tree || tree.ownerId !== req.user.userId) {
      throw new Error('Unauthorized');
    }

    await prisma.linktree.delete({
      where: { id: req.params.id }
    });

    res.status(200).json({ message: 'Linktree erfolgreich gelöscht' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/tree/:id/likes - Tree liken
router.put('/:id/likes', auth, async (req, res) => {
  try {
    await prisma.like.create({
      data: {
        userId: req.user.userId,
        linktreeId: req.params.id
      }
    });
    res.status(200).json({ message: 'Like erfolgreich hinzugefügt' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/tree/:id/likes - Tree like löschen
router.delete('/:id/likes', auth, async (req, res) => {
  try {
    await prisma.like.deleteMany({
      where: {
        userId: req.user.userId,
        linktreeId: req.params.id
      }
    });
    res.status(200).json({ message: 'Like erfolgreich entfernt' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET /api/tree/:id/comments - Kommentare abrufen
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { linktreeId: req.params.id },
      include: { owner: true },
      orderBy: { createdAt: 'desc' }
    });

    comments = comments.map(c => ({
      id: c.id,
      message: c.message,
      createdAt: c.createdAt,
      owner: {
        id: (c.owner && c.owner.id) || c.ownerId || null,
        name: (c.owner && c.owner.nickname) || c.ownerName || null,
        profileImage: (c.owner && c.owner.image) || c.ownerImage || null
      }
    }))

    let result = {};

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/tree/:id/comments - Tree kommentieren
router.put('/:id/comments', auth, async (req, res) => {
  try {
    await prisma.comment.create({
      data: {
        message: req.body.message,
        ownerId: req.user.userId,
        linktreeId: req.params.id
      }
    });
    res.status(200).json({ message: 'Kommentar erfolgreich erstellt' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/tree/:id/comments/:commentId - Tree Kommentar löschen
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.commentId }
    });
    
    if (!comment || comment.ownerId !== req.user.userId) {
      throw new Error('Unauthorized');
    }

    await prisma.comment.delete({
      where: { id: req.params.commentId }
    });

    res.status(200).json({ message: 'Kommentar erfolgreich gelöscht' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;