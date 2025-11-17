const { verifyToken, extractToken } = require('../utils/jwt');
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    const decoded = verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.role !== 'ADMIN') {
      throw new Error('Not authorized as admin');
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Admin authentication failed' });
  }
};