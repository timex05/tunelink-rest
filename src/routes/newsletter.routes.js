const express = require('express');
const { prisma } = require('../utils/prisma');
const { needsAuth, canAuth} = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// POST /api/newsletter - Newsletter abonnieren
router.post('/', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: "Invalid Email." });
    }

    await prisma.newsletter.create({
      data: { email }
    });
    res.status(200).json({ message: "Successfully subscribed." });
  } catch (error) {
    res.status(500).json({ message: "Internal Error." });
  }
});

// DELETE /api/newsletter/:email - Newsletter abbestellen
router.delete('/:email', async (req, res) => {
  try {
    await prisma.newsletter.delete({
      where: { email: req.params.email }
    });
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
    // z.B. mit nodemailer oder einem Email-Service

    res.status(200).json({ message: "Newsletter sent." });
  } catch (error) {
    res.status(400).json({ message: "Invalid token." });
  }
});

module.exports = router;