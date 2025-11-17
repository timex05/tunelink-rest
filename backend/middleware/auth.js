const { verifyToken, extractToken } = require('../utils/jwt');

module.exports = (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};