const express = require("express");
const router = express.Router();
const purchaseRequestController = require("../controllers/purchaseRequestController");
const authMiddleware = require("../middleware/auth");

// ✅ ดึงสินค้า (สำหรับเลือกตอนสร้าง PR) → เฉพาะ warehouse_manager
router.get(
  "/pr/items",
  authMiddleware(["marehouse_manager"]),
  purchaseRequestController.getItems
);

// ✅ ดึง PR Header ทั้งหมด → ฝ่ายจัดซื้อ
router.get(
  "/pr",
  authMiddleware(["purchasing_staff", "purchasing"]), // ✅ อนุญาตทั้ง staff และ manager
  purchaseRequestController.getAllPurchaseRequests
);

// ✅ ดึง PR Items flatten (ทุกรายการ) → ฝ่ายจัดซื้อ
router.get(
  "/pr/details",
  authMiddleware(["purchasing_staff", "purchasing"]),
  purchaseRequestController.getAllPurchaseRequestItems
);

// ✅ ดึงรายละเอียด PR ทีละตัว → ฝ่ายจัดซื้อ
router.get(
  "/pr/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  purchaseRequestController.getPurchaseRequestById
);

// ✅ เพิ่มใหม่ (สร้าง PR) → เฉพาะ warehouse_manager
router.post(
  "/pr",
  authMiddleware(["marehouse_manager"]),
  purchaseRequestController.createPurchaseRequest
);

module.exports = router;
