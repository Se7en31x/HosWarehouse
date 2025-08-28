const express = require("express");
const router = express.Router();
const poController = require("../controllers/purchaseOrderController");
const uploadPO = require("../middleware/uploadPO");

// ✅ ดึง PO ทั้งหมด
router.get("/po", poController.getAllPOs);

// ✅ ดึง PO ตาม id
router.get("/po/:id", poController.getPOById);

// ✅ สร้าง PO ปกติ
router.post("/po", poController.createPO);

// ✅ อัปเดต PO
router.put("/po/:id", poController.updatePO);

// ✅ สร้าง PO จาก RFQ
router.post("/po/from-rfq", poController.createPOFromRFQ);

// ✅ อัปโหลดไฟล์ PO (เชื่อมกับ po_files table)
router.post("/po/:id/upload", uploadPO.array("files", 10), poController.uploadPOFiles);
router.put("/po/:id/attachments", uploadPO.array("files", 10), poController.updatePOAttachments);

// ✅ mark PO ว่าใช้แล้วใน GR
router.put("/po/:id/mark-used", poController.markPOAsUsed);

module.exports = router;
