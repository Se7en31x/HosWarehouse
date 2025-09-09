const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const authMiddleware = require("../middleware/auth");

// ✅ staff: สำหรับสร้างคำขอใหม่
router.post(
  "/requests",
  authMiddleware([ "doctor", "nurse", "nurse_assistant", "pharmacist"]), 
  requestController.handleCreateRequest
);

// ✅ manage: สำหรับดึงคำขอทั้งหมด
router.get(
  "/requests",
  authMiddleware(["manage", "warehouse_manager","warehouse_manager"]), 
  requestController.getRequests
);

module.exports = router;
