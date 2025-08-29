const DashboardModel = require("../models/dashboardModel");

// 🔹 Summary
const getSummary = async (req, res) => {
  try {
    const data = await DashboardModel.getSummary();
    return res.json(data);
  } catch (err) {
    console.error("[DashboardController] getSummary error:", err.message);
    return res.status(500).json({ error: "ไม่สามารถดึงข้อมูลสรุปได้" });
  }
};

// 🔹 Monthly
const getMonthly = async (req, res) => {
  try {
    const data = await DashboardModel.getMonthly();
    return res.json(data);
  } catch (err) {
    console.error("[DashboardController] getMonthly error:", err.message);
    return res.status(500).json({ error: "ไม่สามารถดึงข้อมูลรายเดือนได้" });
  }
};

// 🔹 Category
const getCategory = async (req, res) => {
  try {
    const data = await DashboardModel.getCategory();
    return res.json(data);
  } catch (err) {
    console.error("[DashboardController] getCategory error:", err.message);
    return res.status(500).json({ error: "ไม่สามารถดึงข้อมูลหมวดหมู่ได้" });
  }
};

// 🔹 Movements
const getMovements = async (req, res) => {
  try {
    const data = await DashboardModel.getMovements();
    return res.json(data);
  } catch (err) {
    console.error("[DashboardController] getMovements error:", err.message);
    return res.status(500).json({ error: "ไม่สามารถดึงข้อมูลการเคลื่อนไหวได้" });
  }
};

module.exports = {
  getSummary,
  getMonthly,
  getCategory,
  getMovements,
};
