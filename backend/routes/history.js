const express = require("express");
const router = express.Router();
const historyCtrl = require("../controllers/historyController");
const authMiddleware = require("../middleware/auth");

// ✅ Withdraw History
router.get(
  "/history/withdraw",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getWithdrawHistory
);

// ✅ Borrow History
router.get(
  "/history/borrow",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getBorrowHistory
);

// ✅ Stock In History
router.get(
  "/history/stockin",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getStockinHistory
);

// ✅ Expired Items History
router.get(
  "/history/expired",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getExpiredHistory
);

// ✅ Damaged Items (Flat)
router.get(
  "/history/damaged",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getDamagedHistory
);

// ✅ Damaged Items (Grouped by ID)
router.get(
  "/history/damaged/:id",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getDamagedDetail
);

// ✅ Stock Out (เฉพาะหัวเอกสาร)
router.get(
  "/history/stockout",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getStockoutHistory
);

// ✅ Stock Out (รายละเอียดเอกสารเดียว)
router.get(
  "/history/stockout/:id",
  authMiddleware(["manage", "warehouse_manager"]),
  historyCtrl.getStockoutById
);

module.exports = router;
