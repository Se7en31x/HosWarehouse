const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const authMiddleware = require("../middleware/auth"); // ✅ import middleware


// ✅ รายงานคงคลัง (เฉพาะผู้ดูแลคลัง)
router.get(
  "/report/inventory/summary",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getInventorySummary
);

router.get(
  "/report/inventory/by-department",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getInventoryByDepartment
);

// ✅ รายงานเบิก/ยืม
router.get(
  "/report/outflow",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getOutflowReport
);

// ✅ รายงานรับเข้า
router.get(
  "/report/inflow",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getInflowReport
);

// ✅ รายงานการนำออก (ตัดสต็อก, ชำรุด, หมดอายุ)
router.get(
  "/report/general-outflow",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getGeneralOutflowReport
);

// ✅ รายงานการคืน
router.get(
  "/report/return",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getReturnReport
);

// ✅ รายงานของหมดอายุ
router.get(
  "/report/expired",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getExpiredReport
);

// ✅ รายงานของชำรุด
router.get(
  "/report/damaged",
  authMiddleware(["manage", "warehouse_manager"]),
  reportController.getDamagedReport
);

module.exports = router;