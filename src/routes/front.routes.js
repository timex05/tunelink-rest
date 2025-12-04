const express = require('express');
const { prisma } = require('../utils/prisma');
const { getAuthenticatedUserId } = require('../utils/jwt');
const { needsAuth, canAuth} = require('../middleware/auth')

const router = express.Router();


// ToDo: überprüfen
router.get('/', canAuth, async (req, res) => {
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

    const result = [];

    
    res.status(200).json({treelist: result});
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;