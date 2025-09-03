const express = require('express');
const router = express.Router();
const manageDataController = require('../controllers/manageDataController');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth'); // ✅ import auth

// ✅ ดึงข้อมูลทั้งหมด (เฉพาะผู้ดูแลคลัง)
router.get(
  '/manageData',
  authMiddleware(['manage', 'marehouse_manager']),
  manageDataController.getManageData
);

// ✅ ดึงข้อมูลรายการเดียว (เฉพาะผู้ดูแลคลัง)
router.get(
  '/manageData/:id',
  authMiddleware(['manage', 'marehouse_manager']),
  manageDataController.getItemById
);

// ✅ อัปเดตข้อมูลพัสดุ (เฉพาะผู้ดูแลคลัง)
router.put(
  '/manageData/:id',
  authMiddleware(['manage', 'marehouse_manager']),
  upload.single('item_img'),
  manageDataController.updateItem
);

// ✅ ลบข้อมูลแบบ soft delete (เฉพาะผู้ดูแลคลัง)
router.delete(
  '/deleteItem/:id',
  authMiddleware(['manage', 'marehouse_manager']),
  manageDataController.deleteItem
);

module.exports = router;
