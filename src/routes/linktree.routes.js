const express = require('express');
const { prisma } = require('../utils/prisma');
const { needsAuth, canAuth} = require('../middleware/auth');
const { extractToken, verifyToken } = require('../utils/jwt');

const router = express.Router();

// GET /api/tree/:id - Einzelnen Tree abrufen
router.get('/:id', canAuth, async (req, res) => {
  try {
    // Try to extract authenticated user (optional)
    

    const tree = await prisma.linktree.findUnique({
      where: { id: req.params.id, isPublic: true },
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

    if(!tree){
      res.status(404).json({ message: "Tree not found." });
      return;
    }
    
    // Increment clicks
    await prisma.linktree.update({
      where: { id: req.params.id },
      data: { clicks: { increment: 1 } }
    });

    // Check if current user liked this tree (if authenticated)
    let userLiked = false;
    let currentUserId = req.userId;
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
        id: tree.id, 
        title: tree.title, 
        interpret: tree.interpret, 
        album: tree.album || null, 
        description: tree.description, 
        cover: tree.cover || null, 
        releaseDate: new Date(tree.releaseDate).toISOString(), 
        ytId: tree.ytId || null, 
        urls: {
          amazonmusic: tree.amazonmusicUrl || null, 
          applemusic: tree.applemusicUrl || null, 
          soundcloud: tree.soundcloudUrl || null, 
          spotify: tree.spotifyUrl || null, 
          youtube: tree.youtubeUrl || null, 
          youtubemusic: tree.youtubemusicUrl || null
        },
        analytics: {
          clicks: tree.clicks, 
          likes: { count: tree._count.likes, liked: userLiked }, 
          comments: tree._count.comments
        },
        owner: {
          id: (tree.owner && tree.owner.id) || tree.ownerId || null,
          name: (tree.owner && tree.owner.nickname) || tree.ownerName || null,
          profileImg: {
            url: (tree.owner && tree.owner.image) || tree.ownerImage || null,
            default: (tree.owner && tree.owner.dummyProfileType) ||  tree.dummyProfileType || null
          }
        },
        permissions: (req.userId && req.userId == tree.ownerId ? {canEdit: true, canDelete: true}: {canEdit: false, canDelete: false})
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

router.get('/:id/edit', needsAuth, async (req, res) => {
  try {   

    const tree = await prisma.linktree.findUnique({
      where: { id: req.params.id },
    });

    if(!tree){
      res.status(404).json({ message: "Tree not found." });
      return;
    }

    if(tree.ownerId !== req.userId){
      res.status(403).json({ message: "Unauthorized." });
      return;
    }

    let result = {}
    result.tree = {
        id: tree.id, 
        title: tree.title, 
        interpret: tree.interpret, 
        album: tree.album || null, 
        description: tree.description, 
        cover: tree.cover || null, 
        releaseDate: new Date(tree.releaseDate).toISOString(), 
        ytId: tree.ytId || null,
        isPublic: tree.isPublic || null, 
        urls: {
          amazonmusic: tree.amazonmusicUrl || null, 
          applemusic: tree.applemusicUrl || null, 
          soundcloud: tree.soundcloudUrl || null, 
          spotify: tree.spotifyUrl || null, 
          youtube: tree.youtubeUrl || null, 
          youtubemusic: tree.youtubemusicUrl || null
        },
        permissions: {canEdit: true, canDelete: true}
    }

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// GET /api/tree - Alle eigenen Trees abrufen
router.get('/', needsAuth, async (req, res) => {
  try {
    const trees = await prisma.linktree.findMany({
      where: { ownerId: req.userId },
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
    if (req.userId) {
      const treeIds = trees.map(t => t.id).filter(Boolean);
      if (treeIds.length > 0) {
        const likes = await prisma.like.findMany({
          where: { userId: req.userId, linktreeId: { in: treeIds } },
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
      releaseDate: new Date(t.releaseDate).toISOString(),
      ytId: t.ytId || null,
      urls: {
        amazonmusic: t.amazonmusicUrl || null,
        applemusic: t.applemusicUrl || null,
        soundcloud: t.soundcloudUrl || null,
        spotify: t.spotifyUrl || null,
        youtube: t.youtubeUrl || null,
        youtubemusic: t.youtubemusicUrl || null,
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
          default: (t.owner && t.owner.dummyProfileType) ||  t.dummyProfileType || null
        }
      },
      permissions: (req.userId == t.ownerId ? {canEdit: true, canDelete: true}: {canEdit: false, canDelete: false})
    }));
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// POST /api/tree - Tree erstellen
router.post('/', needsAuth, async (req, res) => {
  try {
    const { urls, ...baseTree } = req.body.tree;


    let releaseDate = null;

    if (baseTree.releaseDate) {

      releaseDate = new Date(baseTree.releaseDate).toISOString();
    }


    const treeData = {
      ...baseTree,
      releaseDate: releaseDate,
      spotifyUrl: urls.spotify,
      youtubeUrl: urls.youtube,
      applemusicUrl: urls.applemusic,
      amazonmusicUrl: urls.amazonmusic,
      soundcloudUrl: urls.soundcloud,
      youtubemusicUrl: urls.youtubemusic,
      ownerId: req.userId
    };

    await prisma.linktree.create({ data: treeData });

    res.status(200).json({ message: 'Tree created.' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// PUT /api/tree/:id - Tree bearbeiten
router.put('/:id', needsAuth, async (req, res) => {
  try {
    const tree = await prisma.linktree.findUnique({
      where: { id: req.params.id }
    });

    if(!tree){
      return res.status(404).json({ message: "Tree not found." });
    }
    
    if (tree.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    const { urls, ...baseTree } = req.body.tree;


    let releaseDate = null;
    
    if (baseTree.releaseDate) {
    
      releaseDate = new Date(baseTree.releaseDate).toISOString();
    }
  
  
    const treeData = {
      ...baseTree,
      releaseDate: releaseDate,
      spotifyUrl: urls.spotify,
      youtubeUrl: urls.youtube,
      applemusicUrl: urls.applemusic,
      amazonmusicUrl: urls.amazonmusic,
      soundcloudUrl: urls.soundcloud,
      youtubemusicUrl: urls.youtubemusic,
      ownerId: req.userId
    };

    await prisma.linktree.update({
      where: { id: req.params.id },
      data: treeData
    });

    res.status(200).json({ message: 'Tree updated.' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// DELETE /api/tree/:id - Tree löschen
router.delete('/:id', needsAuth, async (req, res) => {
  try {
    const tree = await prisma.linktree.findUnique({
      where: { id: req.params.id }
    });

    if(!tree){
      return res.status(404).json({ message: "Tree not found." });
    }
    
    if (tree.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    await prisma.linktree.delete({
      where: { id: req.params.id }
    });

    res.status(200).json({ message: 'Tree deleted.' });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// PUT /api/tree/:id/likes - Tree liken
router.put('/:id/likes', needsAuth, async (req, res) => {
  try {
    await prisma.like.create({
      data: {
        userId: req.userId,
        linktreeId: req.params.id
      }
    });
    res.status(200).json({ message: 'Tree liked.' });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// DELETE /api/tree/:id/likes - Tree like löschen
router.delete('/:id/likes', needsAuth, async (req, res) => {
  try {
    await prisma.like.deleteMany({
      where: {
        userId: req.userId,
        linktreeId: req.params.id
      }
    });
    res.status(200).json({ message: 'Tree like removed.' });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// GET /api/tree/:id/comments - Kommentare abrufen
router.get('/:id/comments', canAuth,  async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { linktreeId: req.params.id },
      include: { owner: true },
      orderBy: { createdAt: 'desc' }
    });

    let result = {};
    result.commentlist = comments.map(c => ({
      id: c.id,
      message: c.message,
      created: c.createdAt,
      owner: {
        id: (c.owner && c.owner.id) || c.ownerId || null,
        name: (c.owner && c.owner.nickname) || c.ownerName || null,
        profileImg: {
          url: (c.owner && c.owner.image) || c.ownerImage || null,
          default: (c.owner && c.owner.dummyProfileType) ||  c.dummyProfileType || null
        }
      },
      permissions: (req.userId && req.userId == c.ownerId ? {canDelete: true}: {canDelete: false})

    }))



    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// PUT /api/tree/:id/comments - Tree kommentieren
router.put('/:id/comments', needsAuth, async (req, res) => {
  try {
    await prisma.comment.create({
      data: {
        message: req.body.message,
        ownerId: req.userId,
        linktreeId: req.params.id
      }
    });
    res.status(200).json({ message: 'Tree commented.' });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// DELETE /api/tree/:id/comments/:commentId - Tree Kommentar löschen
router.delete('/:id/comments/:commentId', needsAuth, async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({
      where: { id: req.params.commentId }
    });
    if(!comment){
      return res.status(404).json({ message: "Comment not found." });
    }

    if (comment.ownerId !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    await prisma.comment.delete({
      where: { id: req.params.commentId }
    });

    res.status(200).json({ message: 'Commend removed.' });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

module.exports = router;