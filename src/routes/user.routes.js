const express = require('express');
const { prisma } = require('../utils/prisma');
const { needsAuth, canAuth } = require('../middleware/auth');
const { encryptPassword, comparePassword } = require('../utils/password');
const { generateToken, extractToken, invalidateToken } = require('../utils/jwt');

const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const { sendMailAws } = require("../utils/mail");

const cooldown = require("../middleware/requestLimiter");

const needsCaptcha = require('../middleware/needsCaptcha');





const router = express.Router();

// POST /api/user - User registrieren
router.post('/', needsCaptcha, async (req, res) => {

  try {
    const { user, website_url, confirm_url } = req.body;
    const existingUser = await prisma.user.findUnique({ 
      where: { email: user.email } 
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email exists already." });
    }

    const hashedPassword = await encryptPassword(user.password);

    if(confirm_url === undefined || confirm_url.length == ""){
    
      await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          nickname: user.name
        }
      });
      const result = await sendMailAws({
        destination: user.email,
        template: 'welcome',
        values: {
          username: user.name,
          website_url: website_url
        }
      });
      if (!result.success) {
        console.error("Failed to send welcome email:", result.error);
      }

      return res.status(200).json({ message: "User created." });
    } else {
      const new_user = await prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          nickname: user.name,
          state: 'PENDING_CONFIRMATION'
        }
      });
      const result = await sendMailAws({
        destination: user.email,
        template: 'confirm',
        values: {
          username: user.name,
          confirm_url: `${confirm_url}?token=${generateToken(new_user.id, '24h', 'email-confirmation')}&email=${user.email}`,
          expiration_time: "24 Hours"
        }
      });
      if (!result.success) {
        console.error("Failed to send welcome email:", result.error);
      }
      return res.status(200).json({ message: "User created. Please confirm your email." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// POST /api/user/auth - User einloggen
router.post('/auth', needsCaptcha,  async (req, res) => {
  try {
    const { credentials, website_url } = req.body;
    const user = await prisma.user.findUnique({ 
      where: { email: credentials.email } 
    });
    
    if (!user || !(await comparePassword(credentials.password, user.password))) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if(user.state === 'PENDING_CONFIRMATION'){
      return res.status(403).json({ message: "Please confirm your email address first. Check Your Inbox." });
    }

    if(user.lastlogin === null){
      // First Login
      const result = await sendMailAws({
        destination: user.email,
        template: 'welcome',
        values: {
          username: user.nickname,
          website_url: website_url
        }
      });
      if (!result.success) {
        console.error("Failed to send welcome email:", result.error);
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastlogin: new Date().toISOString()
      }
    });

    const token = generateToken(user.id);

    res.status(200).json({ 
      token: {value: token, validInMinutes: 1440 }, // 24 hours 
      user: {
        id: user.id,
        name: user.nickname,
        profileImg: {
          url: user.image,
          default: user.dummyProfileType
        },
        email: user.email
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// DELETE /api/user/auth - User ausloggen
router.delete('/auth', needsAuth(), async (req, res) => {
    res.status(200).json({ message: "Logged out successfully" });
});

router.put('/confirm', needsAuth('email-confirmation'), async (req, res) => {
  try {
    const { website_url } = req.body;
    console.log("UserId: " + req.userId);
    const user = await prisma.user.findUnique({ 
      where: { id: req.userId }
    });
    if(!user){
      return res.status(400).json({ message: "User not found." });
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        state: 'ACTIVE'
      }
    });

    const result = await sendMailAws({
      destination: user.email,
      template: 'welcome',
      values: {
        username: user.nickname,
        website_url: website_url
      }
    });

    if (!result.success) {
      console.error("Failed to send welcome email:", result.error);
    }

    return res.status(200).json({ message: "Email confirmed." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// GET /api/user/me - Eigene User-Daten abrufen
router.get('/me', needsAuth(), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
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
        description: user.description,
        permissions: { canEdit: true }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// PUT /api/user/me - Eigene Daten ändern
router.put('/me', needsAuth(), async (req, res) => {
  try {
    const { user } = req.body;
    const updateData = {};
    
    if (user.name) updateData.nickname = user.name;
    if (user.email) updateData.email = user.email;
    if (user.password) updateData.password = await encryptPassword(user.password);
    if (user.profileImg && user.profileImg.url !== undefined) updateData.image = user.profileImg.url;
    if (user.isNewsLetter !== undefined) updateData.isNewsLetter = user.isNewsLetter;
    if (user.description !== undefined) updateData.description = user.description;
    if (user.profileImg && user.profileImg.default !== undefined) updateData.dummyProfileType = user.profileImg.default;

    await prisma.user.update({
      where: { id: req.userId },
      data: updateData
    });

    res.status(200).json({ message: "User updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// GET /api/user/:id - User aufrufen
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    
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
    res.status(500).json({ message: "Internal Error." });
  }
});

router.get('/:id/tree', canAuth, async (req, res) => {
  try {
    const trees = await prisma.linktree.findMany({
      where: { ownerId: req.params.id, isPublic: true },
      include: {
        _count: { select: { likes: true, comments: true } },
        owner: true
      },
      orderBy: { createdAt: 'desc' }
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
    result.treelist = trees.map(t => {
      console.log(req.userId + "  " + t.ownerId);
      return {
      id: t.id,
      title: t.title,
      interpret: t.interpret,
      album: t.album || null,
      description: t.description,
      cover: t.cover || null,
      releaseDate: new Date(t.releaseDate).toISOString(),
      urls: {
        amazonmusic: t.amazonmusicUrl || null,
        applemusic: t.applemusicUrl || null,
        soundcloud: t.soundcloudUrl || null,
        spotify: t.spotifyUrl || null,
        youtube: t.youtubeUrl || null,
        youtubemusic: t.youtubemusicUrl || null,
      },
      ytId: t.ytId || null,
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
      permissions: (req.userId && req.userId == t.ownerId ? {canEdit: true, canDelete: true}: {canEdit: false, canDelete: false})
    }});
    

    // Return an empty list if no trees found
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error" });
  }
});

router.post('/auth/google', async (req, res) => {
  const { googleToken, website_url } = req.body;
  try {
    // Google ID Token prüfen
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    // Google liefert User-Infos
    const payload = ticket.getPayload();

    // Google User-Daten
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Prüfen ob User in deiner DB existiert
    const googleUser = await prisma.user.findUnique({
      where: {oauthId_oauthProvider: { oauthId: googleId, oauthProvider: 'GOOGLE' }}
    });

    if(googleUser){
      const token = generateToken(googleUser.id);
      await prisma.user.update({
        where: { id: googleUser.id },
        data: {
          lastlogin: new Date().toISOString()
        }
      });
      res.status(200).json({
        token: {value: token, validInMinutes: 1440 }, // 24 hours 
        user: {
          id: googleUser.id,
          name: googleUser.nickname,
          profileImg: googleUser.profileImg,
          email: googleUser.email
        }
      });
      return;
    } 

    const emailUser = await prisma.user.findUnique({
      where: {email: email}
    });

    if(emailUser){
      res.status(400).json({ message: "User exists with this Email adress." })
      return;
    }

    const user = await prisma.user.create({
      data: {
        email: email,
        nickname: name,
        image: picture,
        oauthId: googleId,
        oauthProvider: 'GOOGLE'
      }
    });
    const result = await sendMailAws({
      destination: user.email,
      template: 'welcome',
      values: {
        username: user.nickname,
        website_url: website_url
      }
    });

    if (!result.success) {
      console.error("Failed to send welcome email:", result.error);
    }

    const token = generateToken(user.id);
    res.status(200).json({
      token: {value: token, validInMinutes: 1440 }, // 24 hours 
      user: {
        id: user.id,
        name: user.nickname,
        profileImg: user.profileImg,
        email: user.email
      }
    });
    return;

  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Google token invalid" });
  }
});

router.post('/auth/forgot', cooldown(), needsCaptcha, async (req, res) => {
  const { email, resetUrl } = req.body;

  

  const user = await prisma.user.findFirst({ 
    where: { email: email, oauthId: null } 
  });

  if(!user){
    res.status(400).json({ message: 'Given email is not assouciated with an account.' })
    return;
  } 

  const token = generateToken(user.id, '15m', 'password-reset');
  const link = `${resetUrl}?token=${token}&email=${user.email}`

  const result = await sendMailAws({
    template: "reset",
    destination: user.email,
    values: {
      reset_url: link,
      expiration_time: "15 Minutes"
    }
  });

  if(result.success){
    res.status(200).json({ message: 'Mail send. Also check ur spam inbox.' })
    return;
  }
  console.error(result.error);
  res.status(500).json({ message: 'Could not send Mail.' });  
});

router.post('/auth/reset', needsAuth('password-reset'), async (req, res) => {
  const { password } = req.body;
  
  try{
    const hashedPassword = await encryptPassword(password);
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        password: hashedPassword
      }
    });

    res.status(200).json({ message: "Password changed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  } 
});

module.exports = router;