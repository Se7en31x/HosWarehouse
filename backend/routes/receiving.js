const express = require('express');
const router = express.Router();
const receivingController = require('../controllers/receivingController');

// Route เพื่อดึงรายการสินค้าทั้งหมด
// Endpoint: GET /api/receiving/
router.get('/receiving', receivingController.handleGetAllItems);

// Route เพื่อค้นหาสินค้าด้วย Barcode
// Endpoint: GET /api/receiving/barcode?barcode=<value>
router.get('/barcode', receivingController.handleFindItemByBarcode);

// Route เพื่อบันทึกการรับเข้าสินค้า
// Endpoint: POST /api/receiving/
router.post('/receiving', receivingController.handleRecordReceiving);

module.exports = router;