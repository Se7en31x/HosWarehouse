// routes/myRequest.js
const express = require("express");
const router = express.Router();
const myRequestController = require("../controllers/myRequestController");

router.get("/myRequest", myRequestController.getMyRequests);
router.get("/myRequestDetail/:id", myRequestController.getRequestDetailByUser);
router.put("/myRequest/:id/cancel", myRequestController.cancelRequestById);
router.delete("/myRequest/:id", myRequestController.deleteRequestById);

module.exports = router;