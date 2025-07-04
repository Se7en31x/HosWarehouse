const express = require("express");
const router = express.Router();
const myRequestController = require("../controllers/myRequestController");

// ✅ เปลี่ยนจาก "/" → "/my-requests"
router.get("/my-requests", myRequestController.getMyRequests);
router.put("/my-requests/:id/cancel", myRequestController.cancelRequest);

module.exports = router;
