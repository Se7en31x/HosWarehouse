const express = require('express');
const router = express.Router();
const transactionHistoryController = require('../controllers/transactionHistoryController');

router.get('/transactionHistory', transactionHistoryController.getAllLogs);

module.exports = router;