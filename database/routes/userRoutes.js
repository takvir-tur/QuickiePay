const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById } = require('../controllers/userController');

// When a GET request comes in, send it to the getAllUsers function
router.get('/', getAllUsers);
router.get('/:id', getUserById);

module.exports = router;