const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");
const authMiddleware = require("../middleware/auth");

// ✅ ดึง supplier ทั้งหมด → ฝ่ายจัดซื้อ
router.get(
  "/suppliers",
  authMiddleware(["purchasing_staff", "purchasing"]),
  supplierController.getSuppliers
);

// ✅ ดึง supplier ตาม id → ฝ่ายจัดซื้อ
router.get(
  "/suppliers/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  supplierController.getSupplier
);

// ✅ เพิ่ม supplier → ฝ่ายจัดซื้อ
router.post(
  "/suppliers",
  authMiddleware(["purchasing_staff", "purchasing"]),
  supplierController.createSupplier
);

// ✅ อัปเดต supplier → ฝ่ายจัดซื้อ
router.put(
  "/suppliers/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  supplierController.updateSupplier
);

// ✅ เปลี่ยนสถานะ supplier (active/inactive) → ฝ่ายจัดซื้อ
router.patch(
  "/suppliers/:id/status",
  authMiddleware(["purchasing_staff", "purchasing"]),
  supplierController.toggleSupplierStatus
);

// ✅ ลบ supplier → ฝ่ายจัดซื้อ
router.delete(
  "/suppliers/:id",
  authMiddleware(["purchasing_staff", "purchasing"]),
  supplierController.deleteSupplier
);

module.exports = router;
