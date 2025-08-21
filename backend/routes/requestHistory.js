const express = require("express");
const router = express.Router();
const requestHistoryController = require("../controllers/requestHistoryController");

// ✅ GET รายการคำขอทั้งหมด
router.get("/my-requests", requestHistoryController.getAllRequests);

// ✅ GET รายละเอียดคำขอ
router.get("/my-requests/:id", requestHistoryController.getRequestById);

module.exports = router;
