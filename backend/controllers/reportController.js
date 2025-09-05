const inventoryModel = require("../models/report/inventoryReportModel");
const outflowReportModel = require("../models/report/outflowReportModel");
const inflowReportModel = require("../models/report/inflowReportModel");
const returnReportModel = require("../models/report/returnReportModel");
const expiredReportModel = require("../models/report/expiredReportModel");
const damagedReportModel = require("../models/report/damagedReportModel");
const generalOutflowReportModel = require("../models/report/generalOutflowReportModel");

// ✅ รายงานคงคลัง (Summary)
exports.getInventorySummary = async (req, res) => {
  try {
    const filters = {
      category: req.query.category || "all",
      start: req.query.start || null,
      end: req.query.end || null,
    };
    const data = await inventoryModel.getInventorySummary(filters);
    res.json(data);
  } catch (err) {
    console.error("Error getInventorySummary:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ รายงานคงคลัง (By Department)
exports.getInventoryByDepartment = async (req, res) => {
  try {
    const filters = {
      category: req.query.category || "all",
      department: req.query.department || "all",
      start: req.query.start || null,
      end: req.query.end || null,
    };
    const data = await inventoryModel.getInventoryByDepartment(filters);
    res.json(data);
  } catch (err) {
    console.error("Error getInventoryByDepartment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ รายงานเบิก+ยืม (แก้ไขแล้ว)
exports.getOutflowReport = async (req, res) => {
  try {
    const filters = {
      type: req.query.type || "all",
      department: req.query.department || "all",
      start: req.query.start || null,
      end: req.query.end || null,
    };
    const result = await outflowReportModel.getOutflowReport(filters);
    res.json(result);
  } catch (err) {
    console.error("Error getOutflowReport:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ รายงานรับเข้า (ทั่วไป + สั่งซื้อ)
exports.getInflowReport = async (req, res) => {
  try {
    const filters = {
      type: req.query.type || "all",
      department: req.query.department || "all",
      start: req.query.start || null,
      end: req.query.end || null,
      user_id: req.query.user_id || "all",
    };
    const result = await inflowReportModel.getInflowReport(filters);
    res.json(result);
  } catch (err) {
    console.error("Error getInflowReport:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ รายงานการคืน (Return Report)
exports.getReturnReport = async (req, res) => {
  try {
    const filters = {
      department: req.query.department || "all",
      start: req.query.start || null,
      end: req.query.end || null,
      approvalStatus: req.query.approvalStatus || "all" 
    };
    const result = await returnReportModel.getReturnReport(filters);
    res.json(result);
  } catch (err) {
    console.error("Error getReturnReport:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// ✅ รายงานพัสดุหมดอายุ (แก้ไขแล้ว)
exports.getExpiredReport = async (req, res) => {
  try {
    const filters = {
      category: req.query.category || "all",
      status: req.query.status || "all",
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null,
    };
    const result = await expiredReportModel.getExpiredReport(filters);
    res.json(result);
  } catch (err) {
    console.error("Error getExpiredReport:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// ✅ รายงานพัสดุชำรุด (แก้ไขแล้ว)
exports.getDamagedReport = async (req, res) => {
  try {
    const filters = {
      category: req.query.category || "all",
      damage_type: req.query.damage_type || "all",
      status: req.query.status || "all",
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null,
    };
    const data = await damagedReportModel.getDamagedReport(filters);
    res.json(data);
  } catch (err) {
    console.error("Error getDamagedReport:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ รายงานการนำออก (ตัดสต็อก, ชำรุด, หมดอายุ)
exports.getGeneralOutflowReport = async (req, res) => {
  try {
    const filters = {
      type: req.query.type || "all",
      start: req.query.start || null,
      end: req.query.end || null,
      user_id: req.query.user_id || "all",
    };
    const result = await generalOutflowReportModel.getGeneralOutflowReport(filters);
    res.json(result);
  } catch (err) {
    console.error("Error getGeneralOutflowReport:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
