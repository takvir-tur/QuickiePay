const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getSystemConfigs } = require('../utils/configHelper');

// GET /api/system/configs
router.get('/configs', verifyToken, async (req, res) => {
  try {
    const configs = await getSystemConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error fetching system configs:', error);
    res.status(500).json({ error: 'Failed to fetch system configurations' });
  }
});

module.exports = router;
