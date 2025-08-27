// routes/goodsReceiptRoutes.js
const express = require("express");
const router = express.Router();
const grController = require("../controllers/goodsReceiptController");

// GR List
router.get("/gr", grController.getAllGoodsReceipts);

// GR Detail
router.get("/gr/:id", grController.getGoodsReceiptById);

// Create GR
router.post("/gr", grController.createGoodsReceipt);

module.exports = router;
