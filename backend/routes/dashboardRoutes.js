const express = require("express");
const {
  getSummary,
  getMonthly,
  getCategory,
  getMovements,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/dashboard/summary", getSummary);
router.get("/dashboard/monthly", getMonthly);
router.get("/dashboard/category", getCategory);
router.get("/dashboard/movements", getMovements);

module.exports = router;
