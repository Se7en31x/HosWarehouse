const express = require('express');
const router = express.Router();
const receivingController = require('../controllers/receivingController');
const authMiddleware = require('../middleware/auth');

// ✅ ดึงรายการสินค้าทั้งหมด
router.get(
    '/receiving',
    authMiddleware(['manage', 'marehouse_manager']),
    receivingController.handleGetAllItems
);

// ✅ ค้นหาสินค้าด้วย Barcode
router.get(
    '/receiving/barcode',
    authMiddleware(['manage', 'marehouse_manager']),
    receivingController.handleFindItemByBarcode
);  

// ✅ บันทึกการรับเข้าสินค้า
router.post(
    '/receiving',
    authMiddleware(['manage', 'marehouse_manager']),
    receivingController.handleRecordReceiving
);

module.exports = router;
