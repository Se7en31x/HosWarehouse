const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceiptController');

// GET /api/goods-receipts
router.get('/goods-receipts', goodsReceiptController.getAllGoodsReceipts);

// POST /api/goods-receipts
router.post('/goods-receipts', goodsReceiptController.createGoodsReceipt);

// GET /api/goods-receipts/:id
router.get('/goods-receipts/:id', goodsReceiptController.getGoodsReceiptById);

module.exports = router;