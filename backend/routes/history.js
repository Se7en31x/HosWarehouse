const express = require("express");
const router = express.Router();
const historyCtrl = require("../controllers/historyController");
// const { borrowHistoryModel } = require("../models/history");

router.get("/history/withdraw", historyCtrl.getWithdrawHistory);
router.get("/history/borrow",historyCtrl.getBorrowHistory);
router.get('/history/import', historyCtrl.getImportHistory);
router.get('/history/expired',historyCtrl.getExpiredHistory);
// router.get("/borrow", historyCtrl.getBorrowHistory);
// router.get("/return", historyCtrl.getReturnHistory);
// router.get("/damaged", historyCtrl.getDamagedHistory);
// router.get("/disposal", historyCtrl.getDisposalHistory);

module.exports = router;
