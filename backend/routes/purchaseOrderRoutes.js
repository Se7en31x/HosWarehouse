const express = require("express");
const router = express.Router();
const poController = require("../controllers/purchaseOrderController");
const upload = require("../middleware/upload");   // ใช้ตัวเดียว
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

// ✅ อัปโหลดไฟล์แนบ PO → ฝ่ายจัดซื้อ
router.post(
  "/po/:id/upload",
  authMiddleware(["purchasing_staff", "purchasing"]),
  upload.array("files", 10),    // 👈 ใช้ upload ตัวเดียว
  poController.uploadPOFiles
);

// ✅ อัปเดตไฟล์แนบ PO → ฝ่ายจัดซื้อ
router.put(
  "/po/:id/attachments",
  authMiddleware(["purchasing_staff", "purchasing"]),
  upload.array("files", 10),    // 👈 ใช้ upload ตัวเดียว
  poController.updatePOAttachments
);

// ✅ ดึงไฟล์แนบของ PO (คืน signed URL) → ฝ่ายจัดซื้อ
router.get(
  "/po/:id/files",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.getPOFiles
);

// ✅ mark PO ว่าใช้แล้วใน GR → ฝ่ายจัดซื้อ
router.put(
  "/po/:id/mark-used",
  authMiddleware(["purchasing_staff", "purchasing"]),
  poController.markPOAsUsed
);

module.exports = router;
