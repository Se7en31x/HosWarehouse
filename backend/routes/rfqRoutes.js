// routes/rfqRoutes.js
const express = require("express");
const router = express.Router();
const rfqController = require("../controllers/rfqController");
const authMiddleware = require("../middleware/auth");

// ✅ สร้าง RFQ → ต้องเป็นฝ่ายจัดซื้อ
router.post(
  "/rfq",
  authMiddleware(["purchasing_staff", "purchasing"]),
  rfqController.createRFQ
);

// ✅ ดึง RFQ ทั้งหมด → ฝ่ายจัดซื้อ
router.get(
  "/rfq",
  authMiddleware(["purchasing_staff", "purchasing"]),
  rfqController.getAllRFQs
);

// ✅ ดึง RFQ ที่ยัง pending → ฝ่ายจัดซื้อ
router.get(
  "/rfq/pending",
  authMiddleware(["purchasing_staff", "purchasing"]),
  rfqController.getPendingRFQs
);

// ✅ ดึง RFQ รายการเดียวตาม ID → ฝ่ายจัดซื้อ
router.get(
  "/rfq/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  rfqController.getRFQById
);

module.exports = router;
