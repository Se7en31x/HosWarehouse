// routes/inventory.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// ✅ ดึงทั้งหมด
router.get('/inventoryCheck', inventoryController.getAllItems);

// ✅ ดึงตาม id
router.get('/inventoryCheck/:id', inventoryController.getItemById);
router.post('/damaged', inventoryController.reportDamaged);
module.exports = router;
