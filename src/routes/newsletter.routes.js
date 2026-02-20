const express = require('express');
const { prisma } = require('../utils/prisma');
const { needsAuth, canAuth} = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const { sendMailAws } = require('../utils/mail');

const router = express.Router();

// POST /api/newsletter - Newsletter abonnieren
router.post('/', async (req, res) => {
  try {
    const { email, website_url, unsubscribe_url } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: "Invalid Email." });
    }

    const existingUser = await prisma.user.findUnique({ 
      where: { email: email } 
    });

    if (existingUser) {
      existingUser.isNewsLetter = true;
      await prisma.user.update({
        where: { email: email },
        data: existingUser
      });
    } else {
      const existingNewsletterEntry = await prisma.newsletter.findUnique({ 
        where: { email: email } 
      });

      if (existingNewsletterEntry) {
        return res.status(400).json({ message: "Email already subscribed." });
      }
      await prisma.newsletter.create({
        data: { email }
      });
    }

    const result = await sendMailAws({
      destination: email,
      template: 'newsletter_sub',
      values: {
        website_url: website_url,
        unsubscribe_url: unsubscribe_url
      }
    });
    if (!result.success) {
      console.error("Failed to send subscription email:", result.error);
    }
    res.status(200).json({ message: "Successfully subscribed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Error." });
  }
});

// DELETE /api/newsletter/:email - Newsletter abbestellen
router.delete('/:email', async (req, res) => {
  try {
    const { email } = req.body;
    email = email || req.params.email;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: "Invalid Email." });
    }

    await prisma.newsletter.delete({
      where: { email: email }
    });

    const existingUser = await prisma.user.findUnique({ 
      where: { email: email } 
    });

    if(existingUser){
      existingUser.isNewsLetter = false;
      await prisma.user.update({
        where: { email: email },
        data: existingUser
      });
    }

    res.status(200).json({ message: "Successfully unsubscribed." });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: "Invalid Email." });
    }

    await prisma.newsletter.delete({
      where: { email: email }
    });

    const existingUser = await prisma.user.findUnique({ 
      where: { email: email } 
    });

    if(existingUser){
      existingUser.isNewsLetter = false;
      await prisma.user.update({
        where: { email: email },
        data: existingUser
      });
    }

    res.status(200).json({ message: "Successfully unsubscribed." });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// GET /api/newsletter - Liste aller Newsletter-Abos
router.get('/', adminAuth, async (req, res) => {
  try {
    const subscribers = await prisma.newsletter.findMany({
      select: { email: true }
    });
    res.status(200).json({ emaillist: subscribers.map(s => s.email) });
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
});

// PUT /api/newsletter - Newsletter schreiben
router.put('/', adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    // Hier würde die eigentliche Email-Versand-Logik implementiert werden
    // z.B. AWS SES

    res.status(200).json({ message: "Newsletter sent." });
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
});

module.exports = router;