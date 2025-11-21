const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { generateToken, extractToken, invalidateToken } = require('../utils/jwt');

// POST /api/users - User registrieren
router.post('/', async (req, res) => {
  try {
    const { user } = req.body;
    const existingUser = await prisma.user.findUnique({ 
      where: { email: user.email } 
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email exists already." });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    await prisma.user.create({
      data: {
        email: user.email,
        password: hashedPassword,
        nickname: user.name
      }
    });

    res.status(200).json({ message: "User created." });
  } catch (error) {
    res.status(500).json({ message: "Internal Error" });
  }
});

// POST /api/users/auth - User einloggen
router.post('/auth', async (req, res) => {
  try {
    const { credentials } = req.body;
    const user = await prisma.user.findUnique({ 
      where: { email: credentials.email } 
    });
    
    if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = generateToken(user.id);

    res.status(200).json({ 
      token: {value: token, validInMinutes: 1440 }, // 24 hours 
      user: {
        id: user.id,
        name: user.nickname,
        profileImage: user.image || null,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// DELETE /api/users/auth - User ausloggen
router.delete('/auth', auth, async (req, res) => {
  try {
    // Accept token either in request body { token } or in Authorization header
    const tokenFromBody = req.body && req.body.token;
    const token = tokenFromBody || extractToken(req.headers.authorization);

    if (!token) {
      return res.status(400).json({ message: "No token provided." });
    }

    // Stateless invalidation: re-sign the payload with expiresIn: 0
    invalidateToken(token);

    // Instruct client to remove token locally as well
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid Token." });
  }
});

// GET /api/users/me - Eigene User-Daten abrufen
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    res.status(200).json({
      user: {
        id: user.id,
        name: user.nickname,
        profileImg: {
          url: user.image,
          default: user.dummyProfileType
        },
        email: user.email,
        createdAt: user.createdAt,
        isNewsLetter: user.isNewsLetter,
        description: user.description
      }
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
});

// PUT /api/users/me - Eigene Daten ändern
router.put('/me', auth, async (req, res) => {
  try {
    const { user } = req.body;
    const updateData = {};
    
    if (user.name) updateData.nickname = user.name;
    if (user.email) updateData.email = user.email;
    if (user.password) updateData.password = await bcrypt.hash(user.password, 10);
    if (user.profileImg.url !== undefined) updateData.image = user.profileImg.url;
    if (user.isNewsLetter !== undefined) updateData.isNewsLetter = user.isNewsLetter;
    if (user.description !== undefined) updateData.description = user.description;
    if (user.profileImg.default !== undefined) updateData.dummyProfileType = user.profileImg.default;

    await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData
    });

    res.status(200).json({ message: "User updated." });
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
});

// GET /api/users/:id - User aufrufen
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });
    if (!user) throw new Error('User not found');
    
    res.status(200).json({
      user: {
        id: user.id,
        name: user.nickname,
        description: user.description,
        createdAt: user.createdAt,
        profileImg: {
          url: user.image,
          default: user.dummyProfileType
        }
      }
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
});

router.get('/:id/tree', async (req, res) => {
  try {
    // Find all linktrees that belong to the user with id = req.params.id
    const trees = await prisma.linktree.findMany({
      where: { ownerId: req.params.id, isPublic: true },
      include: {
        _count: { select: { likes: true, comments: true } },
        owner: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
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

    let result = {};
    result.treelist = trees.map(t => ({
      id: t.id,
      title: t.title,
      interpret: t.interpret,
      album: t.album || null,
      description: t.description,
      cover: t.cover || null,
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
        profileImage: {
          url: (t.owner && t.owner.image) || t.ownerImage || null,
          default: (t.owner && t.owner.dummyProfileType) || t.dummyProfileType || null
        }
      }
    }));

    // Return an empty list if no trees found
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Internal Error" });
  }
});

module.exports = router;