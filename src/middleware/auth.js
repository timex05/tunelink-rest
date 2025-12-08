const { verifyToken, extractToken } = require('../utils/jwt');



const needsAuth = (req, res, next) => {
  try {
    const token = extractToken(req);
    const decoded = verifyToken(token);
    
    req.userId = decoded.userId;
    req.token = token;
    console.log(req.userId);
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

const canAuth = (req, res, next) => {
  try {
    const token = extractToken(req);
    console.log("Token: " + token);
    const decoded = verifyToken(token);
    
    req.userId = decoded.userId;
    console.log("userId: " + req.userId);
    
  } catch (error) {
    console.error(error);
  } finally {
    next();
  }
}


module.exports = { needsAuth, canAuth };