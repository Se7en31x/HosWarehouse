const express = require("express");
const router = express.Router();
const purchaseRequestController = require("../controllers/purchaseRequestController");
const authMiddleware = require("../middleware/auth");

// ✅ ดึงสินค้า (สำหรับเลือกตอนสร้าง PR) → เฉพาะ purchasing
router.get(
  "/pr/items",
  authMiddleware(["marehouse_manager"]),
  purchaseRequestController.getItems
);

// ✅ ดึง PR Header ทั้งหมด → เฉพาะ purchasing
router.get(
  "/pr",
  authMiddleware(["purchasing"]),
  purchaseRequestController.getAllPurchaseRequests
);

// ✅ ดึง PR Items flatten (ทุกรายการ) → เฉพาะ purchasing
router.get(
  "/pr/details",
  authMiddleware(["purchasing"]),
  purchaseRequestController.getAllPurchaseRequestItems
);

// ✅ ดึงรายละเอียด PR ทีละตัว → เฉพาะ purchasing
router.get(
  "/pr/:id",
  authMiddleware(["purchasing"]),
  purchaseRequestController.getPurchaseRequestById
);

// ✅ เพิ่มใหม่ (สร้าง PR) → เฉพาะ purchasing
router.post(
  "/pr",
  authMiddleware(["marehouse_manager"]),
  purchaseRequestController.createPurchaseRequest
);

module.exports = router;
