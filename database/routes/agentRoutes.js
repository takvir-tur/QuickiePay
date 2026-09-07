const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getAgentProfile } = require('../controllers/agentController');

router.get('/profile', verifyToken, getAgentProfile);

module.exports = router;