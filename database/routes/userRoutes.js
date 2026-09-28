const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { 
  getUserById, 
  getProfile, 
  updateProfile, 
  changePin 
} = require('../controllers/userController');

// Profile & Settings
router.get('/profile/me', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-pin', verifyToken, changePin);

// By user ID (for dashboard user data)
router.get('/:id', verifyToken, getUserById);

module.exports = router;