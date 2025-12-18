const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Token generieren
const generateToken = (userId, expiresIn = JWT_EXPIRES_IN, type = 'basic') => {
  return jwt.sign(
    { userId: userId, type: type },
    JWT_SECRET,
    { expiresIn: expiresIn }
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
  return jwt.sign(payload, JWT_SECRET, { exp: 0 });
};

module.exports = {
  generateToken,
  verifyToken,
  extractToken,
  invalidateToken
};