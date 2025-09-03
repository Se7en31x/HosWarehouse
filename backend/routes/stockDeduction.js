const express = require('express');
const router = express.Router();
const stockDeductionController = require('../controllers/stockDeductionController');
const authMiddleware = require('../middleware/auth');

// ✅ ดึงคำขอที่พร้อมหักสต็อก
router.get(
  '/stockDeduction/ready',
  authMiddleware(['manage', 'marehouse_manager']),
  stockDeductionController.getRequestsReadyForDeduction
);

// ✅ ดึงรายละเอียดคำขอหักสต็อก
router.get(
  '/stockDeduction/:requestId/details',
  authMiddleware(['manage', 'marehouse_manager']),
  stockDeductionController.getDeductionRequestDetails
);

// ✅ ดำเนินการหักสต็อก
router.put(
  '/stockDeduction/:requestId/process',
  authMiddleware(['manage', 'marehouse_manager']),
  stockDeductionController.processStockDeduction
);

module.exports = router;
