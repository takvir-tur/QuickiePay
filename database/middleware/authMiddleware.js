const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = require('../db_connection');

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('[AuthMiddleware] Access Denied: No token provided');
    return res.status(401).json({ error: 'Access Denied: No token provided' });
  }

  try {
    // Verify the token using your secret key
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user is frozen globally
    const user_id = verified.user_id;
    const result = await pool.query(`
      SELECT 
        COALESCE(pa.status, ag.status, m.status, b.status, 'ACTIVE') AS status
      FROM users u
      LEFT JOIN personal_accounts pa ON u.user_id = pa.user_id
      LEFT JOIN agents ag ON u.user_id = ag.user_id
      LEFT JOIN merchants m ON u.user_id = m.user_id
      LEFT JOIN billers b ON u.user_id = b.user_id
      WHERE u.user_id = $1
    `, [user_id]);

    if (result.rows.length > 0 && result.rows[0].status === 'BLOCKED') {
      console.error(`[AuthMiddleware] Access Denied: User ${user_id} is blocked`);
      return res.status(403).json({ error: 'Account has been frozen by administration.' });
    }

    req.user = verified; // Save the decoded user data into the request
    next();
  } catch (err) {
    console.error('[AuthMiddleware] Access Denied: Invalid or expired token', err.message);
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