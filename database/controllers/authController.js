require('dotenv').config();
const pool = require('../db_connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- 1. Nutun Add

// REGISTER USER
async function registerUser(req, res) {
  const { full_name, phone_number, email, pin, national_id } = req.body;

  if (!full_name || !phone_number || !pin) {
    return res.status(400).json({ error: 'Full name, phone number, and PIN are required' });
  }

  try {
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE phone_number = $1 OR (email IS NOT NULL AND email = $2)',
      [phone_number, email || null]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User with this phone or email already exists' });
    }

    const saltRounds = 10;
    const pin_hash = await bcrypt.hash(pin, saltRounds);

    const newUserQuery = `
      INSERT INTO users (full_name, phone_number, email, pin_hash, national_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, full_name, phone_number, email, created_at
    `;

    const result = await pool.query(newUserQuery, [
      full_name,
      phone_number,
      email || null,
      pin_hash,
      national_id || null,
    ]);

    res.status(201).json({
      message: 'User registered successfully! 🎉',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('Error registering user:', err.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
}

// LOGIN USER (JWT Token Added)
async function loginUser(req, res) {
  const { phone_number, pin } = req.body;

  if (!phone_number || !pin) {
    return res.status(400).json({ error: 'Phone number and PIN are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE phone_number = $1', [phone_number]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    const isPinValid = await bcrypt.compare(pin, user.pin_hash);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // <-- 2. Token Create Kora Hoise (Valid for 7 days)
    const token = jwt.sign(
      { userId: user.user_id, phone: user.phone_number },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // <-- 3. Response-e Token Pathano Hoise
    res.json({
      message: 'Login successful! 🚀',
      token: token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        phone_number: user.phone_number,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('Error logging in:', err.message);
    res.status(500).json({ error: 'Server error during login' });
  }
}

module.exports = { registerUser, loginUser };