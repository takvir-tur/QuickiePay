const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { getAllUsers, getUserById } = require('../controllers/userController');

router.get('/:id', verifyToken, getUserById);

module.exports = router;