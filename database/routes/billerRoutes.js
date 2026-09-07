const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getBillerProfile } = require('../controllers/billerController');

// ফ্রন্টএন্ডের ফেচ করা URL (/api/billers/profile) এর সাথে রুটটি মেলানো হলো
router.get('/profile', verifyToken, getBillerProfile);

module.exports = router;