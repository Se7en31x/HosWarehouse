const express = require("express");
const router = express.Router();
const grController = require("../controllers/goodsReceiptController");
const authMiddleware = require("../middleware/auth");

// ✅ GR Report → ต้องอยู่บนสุด (กันชนกับ /gr/:id)
router.get(
  "/gr/report",
  authMiddleware(["purchasing_staff", "purchasing"]),
  grController.getGRReport
);

// ✅ GR List → ฝ่ายจัดซื้อ
router.get(
  "/gr",
  authMiddleware(["purchasing_staff", "purchasing"]),
  grController.getAllGoodsReceipts
);

// ✅ GR Detail → ฝ่ายจัดซื้อ
router.get(
  "/gr/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  grController.getGoodsReceiptById
);

// ✅ Create GR → ฝ่ายจัดซื้อ
router.post(
  "/gr",
  authMiddleware(["purchasing_staff", "purchasing"]),
  grController.createGoodsReceipt
);

// ✅ Receive more → ฝ่ายจัดซื้อ
router.post(
  "/gr/:id/receive-more",
  authMiddleware(["purchasing_staff", "purchasing"]),
  grController.receiveMore
);

module.exports = router;
