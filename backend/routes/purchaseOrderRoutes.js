const express = require("express");
const router = express.Router();
const poController = require("../controllers/purchaseOrderController");
const uploadPO = require("../middleware/uploadPO");
const authMiddleware = require("../middleware/auth");

// ✅ ดึง PO ทั้งหมด → ฝ่ายจัดซื้อ
router.get(
  "/po",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.getAllPOs
);

// ✅ ดึง PO ตาม id → ฝ่ายจัดซื้อ
router.get(
  "/po/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.getPOById
);

// ✅ สร้าง PO ปกติ → ฝ่ายจัดซื้อ
router.post(
  "/po",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.createPO
);

// ✅ อัปเดต PO → ฝ่ายจัดซื้อ
router.put(
  "/po/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.updatePO
);

// ✅ สร้าง PO จาก RFQ → ฝ่ายจัดซื้อ
router.post(
  "/po/from-rfq",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.createPOFromRFQ
);

// ✅ อัปโหลดไฟล์ PO → ฝ่ายจัดซื้อ
router.post(
  "/po/:id/upload",
  authMiddleware(["purchasing_staff", "purchasing"]),
  uploadPO.array("files", 10),
  poController.uploadPOFiles
);

router.put(
  "/po/:id/attachments",
  authMiddleware(["purchasing_staff", "purchasing"]),
  uploadPO.array("files", 10),
  poController.updatePOAttachments
);

// ✅ mark PO ว่าใช้แล้วใน GR → ฝ่ายจัดซื้อ
router.put(
  "/po/:id/mark-used",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.markPOAsUsed
);

module.exports = router;
