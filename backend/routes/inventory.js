// routes/inventory.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/manageDataController');

// ดึงข้อมูลรายการเดียว
router.get('/inventoryCheck/:id', inventoryController.getItemById);

module.exports = router;
