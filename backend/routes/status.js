// routes/status.js
const express = require('express');
const router = express.Router();
const statusController = require('../controllers/statusController');

// GET /api/status
router.get('/status', statusController.getStatus);

module.exports = router;
