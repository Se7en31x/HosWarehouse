const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/manageReturnController');
const authMiddleware = require('../middleware/auth');

// ✅ รวมคำขอยืม (สำหรับหน้า list)
router.get(
  '/manage/returns/queue',
  authMiddleware(['manage', 'marehouse_manager']),
  ctrl.getBorrowQueue
);

// ✅ รายละเอียดคำขอ + line items + ประวัติคืน (สำหรับหน้า detail)
router.get(
  '/manage/returns/request/:request_id',
  authMiddleware(['manage', 'marehouse_manager']),
  ctrl.getManageReturnDetail
);

// ✅ รับคืน (กดจากหน้า detail)
router.post(
  '/manage/returns/receive',
  authMiddleware(['manage', 'marehouse_manager']),
  ctrl.receiveReturn
);

module.exports = router;
