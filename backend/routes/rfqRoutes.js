// routes/rfqRoutes.js
const express = require("express");
const router = express.Router();
const rfqController = require("../controllers/rfqController");

router.post("/rfq", rfqController.createRFQ);
router.get("/rfq", rfqController.getAllRFQs);
router.get("/rfq/:id", rfqController.getRFQById);

module.exports = router;
