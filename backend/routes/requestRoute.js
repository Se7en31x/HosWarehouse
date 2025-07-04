// routes/requestRoute.js
const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");

// ✅ สำหรับสร้างคำขอใหม่
router.post("/requests", requestController.handleCreateRequest);
router.get("/requests", requestController.getRequests);
module.exports = router;
