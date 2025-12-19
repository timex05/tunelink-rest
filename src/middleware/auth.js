const { verifyToken, extractToken } = require('../utils/jwt');



const needsAuth = (type = 'basic') => {

  return ((req, res, next) => {
    try {
      const token = extractToken(req);
      const decoded = verifyToken(token);

      req.userId = decoded.userId;
      req.token = decoded;
      console.log(req.userId);
      if (decoded.type !== type) {
        return res.status(403).json({ message: 'Insufficient permissions.' });
      }
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Authentication failed.' });
    }
  });
}

const canAuth = (req, res, next) => {
  try {
    const token = extractToken(req);
    console.log("Token: " + token);
    if(token){
      const decoded = verifyToken(token);
      req.userId = decoded.userId;
      req.token = decoded;
      console.log("userId: " + req.userId);
    }
    
    
  } catch (error) {
    console.error(error);
  } finally {
    next();
  }
}


module.exports = { needsAuth, canAuth };