const express = require("express");
const router = express.Router();
const purchaseRequestController = require("../controllers/purchaseRequestController");

// ✅ ดึงสินค้า (ใช้ในหน้าเลือกสินค้า)
router.get("/pr/items", purchaseRequestController.getItems);

// ✅ ดึง PR Header ทั้งหมด
router.get("/pr", purchaseRequestController.getAllPurchaseRequests);

// ✅ ดึง PR Items flatten (ทุกรายการ)
router.get("/pr/details", purchaseRequestController.getAllPurchaseRequestItems);

// ✅ ดึงรายละเอียด PR ทีละตัว
router.get("/pr/:id", purchaseRequestController.getPurchaseRequestById);

// ✅ เพิ่มใหม่ (สร้าง PR ทีละรายการ)
router.post("/pr", purchaseRequestController.createPurchaseRequest);

module.exports = router;
