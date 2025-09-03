const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const authMiddleware = require("../middleware/auth");

// ✅ staff: สำหรับสร้างคำขอใหม่
router.post(
  "/requests",
  authMiddleware(["staff", "doctor", "nurse", "pharmacist"]), 
  requestController.handleCreateRequest
);

// ✅ manage: สำหรับดึงคำขอทั้งหมด
router.get(
  "/requests",
  authMiddleware(["manage", "marehouse_manager"]), 
  requestController.getRequests
);

module.exports = router;
