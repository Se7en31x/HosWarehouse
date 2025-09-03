const express = require('express');
const router = express.Router();
const expiredController = require('../controllers/expiredController');
const authMiddleware = require('../middleware/auth');

// ✅ ดึงข้อมูลของหมดอายุทั้งหมด
router.get(
  '/expired',
  authMiddleware(['manage', 'marehouse_manager']),
  expiredController.getAll
);

// ✅ เพิ่ม action สำหรับ lot ที่หมดอายุ
router.post(
  '/expired/action',
  authMiddleware(['manage', 'marehouse_manager']),
  expiredController.addAction
);

// ✅ ดูประวัติการจัดการ lot ที่หมดอายุ
router.get(
  '/expired/actions/:lot_id',
  authMiddleware(['manage', 'marehouse_manager']),
  expiredController.getActionsByLotId
);

module.exports = router;
