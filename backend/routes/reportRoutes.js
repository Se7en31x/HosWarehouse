const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// ✅ รายงานคงคลัง
router.get("/report/inventory/summary", reportController.getInventorySummary);
router.get("/report/inventory/by-department", reportController.getInventoryByDepartment);

// ✅ รายงานเบิก/ยืม
router.get("/report/outflow", reportController.getOutflowReport);

// ✅ รายงานรับเข้า
router.get("/report/inflow", reportController.getInflowReport);

// ✅ รายงานการคืน
router.get("/report/return", reportController.getReturnReport);
router.get("/report/expired", reportController.getExpiredReport);
router.get("/report/damaged", reportController.getDamagedReport);

module.exports = router;
