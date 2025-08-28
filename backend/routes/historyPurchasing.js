const express = require("express");
const router = express.Router();
const c = require("../controllers/historyPurchasingController");

// ===== Lists (สำหรับหน้า Overview) =====
router.get("/historyPurchasing/rfq", c.getRFQHistory);
router.get("/historyPurchasing/po",  c.getPOHistory);
router.get("/historyPurchasing/gr",  c.getAllGRHistory);

// ===== Details (สำหรับ pop-up) =====
router.get("/historyPurchasing/rfq/:rfq_id/items", c.getRFQItems);
router.get("/historyPurchasing/po/:po_id/items",   c.getPOItems);
router.get("/historyPurchasing/po/:po_id/gr",      c.getGRHistoryByPO);
router.get("/historyPurchasing/po/:po_id/source-pr-items", c.getPOSourcePRItems); // <— ใหม่
router.get("/historyPurchasing/gr/:gr_id/items",   c.getGRItems);

module.exports = router;
