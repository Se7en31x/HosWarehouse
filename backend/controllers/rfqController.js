// controllers/rfqController.js
const rfqModel = require("../models/rfqModel");

exports.createRFQ = async (req, res) => {
  try {
    const userId = req.user?.id || null; // ✅ เอามาจาก token
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "ต้องมีสินค้าอย่างน้อย 1 รายการ" });
    }

    const result = await rfqModel.createRFQ({
      created_by: userId,
      items,
    });

    res.status(201).json({
      message: "สร้างใบขอราคาเรียบร้อย",
      ...result,
    });
  } catch (err) {
    console.error("❌ createRFQ error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.getAllRFQs = async (req, res) => {
  try {
    const rfqs = await rfqModel.getAllRFQs();
    res.json(rfqs);
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.getRFQById = async (req, res) => {
  try {
    const { id } = req.params;
    const rfq = await rfqModel.getRFQById(id);
    if (!rfq.header) return res.status(404).json({ message: "ไม่พบ RFQ" });
    res.json(rfq);
  } catch (err) {
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.getPendingRFQs = async (req, res) => {
  try {
    const data = await rfqModel.getPendingRFQs();
    res.json(data);
  } catch (err) {
    console.error("❌ Controller getPendingRFQs error:", err.message);
    res.status(500).json({
      message: "ไม่สามารถโหลด RFQ ที่รอดำเนินการได้",
      error: err.message,
    });
  }
};
