const express = require('express');
const router = express.Router();
const { getAllUsers } = require('../controllers/userController');

// When a GET request comes in, send it to the getAllUsers function
router.get('/', getAllUsers);

module.exports = router;