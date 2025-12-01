const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

// Token generieren
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Token verifizieren
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Token aus Authorization Header extrahieren
const extractToken = (req) => {
  let { token } = req.body;
  if(!token){
    token = req.query.token;
  }
  return token;
};

// Token ungültig machen
const invalidateToken = (token) => {
  const payload = jwt.decode(token);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: 0 });
};

const getAuthenticatedUserId = (req) => {
  let currentUserId = null;
  try {
    const token = extractToken(req);
    const decoded = verifyToken(token);
    currentUserId =  decoded && decoded.userId ? decoded.userId : null;
  } catch (e) {
    // ignore - treat as unauthenticated
    return null;
  }
  return currentUserId;
}

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  invalidateToken,
  getAuthenticatedUserId
};