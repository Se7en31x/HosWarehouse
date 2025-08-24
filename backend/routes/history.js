const express = require("express");
const router = express.Router();
const historyCtrl = require("../controllers/historyController");

// Withdraw
router.get("/history/withdraw", historyCtrl.getWithdrawHistory);

// Borrow
router.get("/history/borrow", historyCtrl.getBorrowHistory);

// Import
router.get("/history/import", historyCtrl.getImportHistory);

// Expired
router.get("/history/expired", historyCtrl.getExpiredHistory);

// Damaged (Flat)
router.get("/history/damaged", historyCtrl.getDamagedHistory);

// Damaged (Grouped by ID)
router.get("/history/damaged/:id", historyCtrl.getDamagedDetail);

// Stock Out (เฉพาะหัวเอกสาร)
router.get("/history/stockout", historyCtrl.getStockoutHistory);

// Stock Out (รายละเอียดเอกสารเดียว)
router.get("/history/stockout/:id", historyCtrl.getStockoutById);

module.exports = router;
