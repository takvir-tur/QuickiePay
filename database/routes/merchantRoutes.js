const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getMerchantProfile } = require('../controllers/merchantController');

router.get('/profile', verifyToken, getMerchantProfile);

module.exports = router;