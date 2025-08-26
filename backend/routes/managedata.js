const express = require('express');
const router = express.Router();
const manageDataController = require('../controllers/manageDataController');
const upload = require('../middleware/upload'); // เพิ่มตรงนี้


// ดึงข้อมูลทั้งหมด
router.get('/manageData', manageDataController.getManageData);

// ดึงข้อมูลรายการเดียว (เช่นใช้ในหน้าแก้ไข)
router.get('/manageData/:id', manageDataController.getItemById);

// อัปเดตข้อมูลพัสดุ
router.put('/manageData/:id', upload.single('item_img'), manageDataController.updateItem);

// ลบข้อมูลแบบ soft delete
router.delete('/deleteItem/:id', manageDataController.deleteItem);

module.exports = router;
