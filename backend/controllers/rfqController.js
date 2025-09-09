const rfqModel = require("../models/rfqModel");

exports.createRFQ = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "ต้องมีสินค้าอย่างน้อย 1 รายการ" });
    }

    // ดึง user_id จาก token
    const userId = req.user?.id; // หรือ req.user.user_id ขึ้นอยู่กับโครงสร้าง token
    if (!userId) {
      return res.status(401).json({ message: "ไม่พบข้อมูลผู้ใช้จาก token" });
    }


    const result = await rfqModel.createRFQ({ created_by: userId, items });
    res.status(201).json({ message: "สร้างใบขอราคาเรียบร้อย", ...result });
  } catch (err) {
    console.error("❌ createRFQ error:", err.message);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.getAllRFQs = async (req, res) => {
  try {
    const rfqs = await rfqModel.getAllRFQs();
    res.json(rfqs);
  } catch (err) {
    console.error("❌ getAllRFQs error:", err.message);
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
    console.error("❌ getRFQById error:", err.message);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.getPendingRFQs = async (req, res) => {
  try {
    const data = await rfqModel.getPendingRFQs();
    res.json(data);
  } catch (err) {
    console.error("❌ Controller getPendingRFQs error:", err.message);
    res.status(500).json({ message: "ไม่สามารถโหลด RFQ ที่รอดำเนินการได้", error: err.message });
  }
};

exports.getRFQReport = async (req, res) => {
  try {
    const report = await rfqModel.getRFQReport();
    res.json(report);
  } catch (err) {
    console.error("❌ Controller getRFQReport error:", err.message);
    res.status(500).json({
      message: "โหลดรายงาน RFQ ไม่สำเร็จ",
      error: err.message,
    });
  }
};