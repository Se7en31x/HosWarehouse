// backend/Routes/requestRoute.js
const express = require('express');
const router = express.Router();
const checkBorrow = require('../models/checkBorrowModel');

// 👉 เช็คทั้ง user
router.get('/check-pending-borrow/:userId', checkBorrow.checkPendingBorrow);

// 👉 ถ้าอยากเช็คเฉพาะ item ด้วย
router.get('/check-pending-borrow/:userId/:itemId', checkBorrow.checkPendingBorrow);

module.exports = router;
