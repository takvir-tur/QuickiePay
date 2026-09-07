const jwt = require('jsonwebtoken');
require('dotenv').config();

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No token provided' });
  }

  try {
    // Verify the token using your secret key
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Save the decoded user data into the request
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

const verifyAdmin = (req, res, next) => {
  // req.user is set by your verifyToken middleware
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Super Admin privileges required.' });
  }
  next(); 
};

module.exports = { verifyToken, verifyAdmin };