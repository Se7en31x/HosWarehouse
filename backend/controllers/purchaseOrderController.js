const purchaseOrderModel = require("../models/purchaseOrderModel");

// ✅ GET /po
exports.getAllPOs = async (req, res) => {
  try {
    const pos = await purchaseOrderModel.getAllPOs();
    res.json(pos);
  } catch (err) {
    console.error("❌ getAllPOs error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ GET /po/:id
exports.getPOById = async (req, res) => {
  try {
    const po = await purchaseOrderModel.getPOById(req.params.id);
    if (!po) return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
    res.json(po);
  } catch (err) {
    console.error("❌ getPOById error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ POST /po (สร้างใหม่ปกติ → return full PO เลย)
exports.createPO = async (req, res) => {
  try {
    const newPO = await purchaseOrderModel.createPO(req.body);
    res.status(201).json(newPO);
  } catch (err) {
    console.error("❌ createPO error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ PUT /po/:id (อัปเดต + return full PO)
exports.updatePO = async (req, res) => {
  try {
    const updatedPO = await purchaseOrderModel.updatePO(req.params.id, req.body);
    res.json(updatedPO);
  } catch (err) {
    console.error("❌ updatePO error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ POST /po/from-rfq (สร้างจาก RFQ → return full PO)
exports.createPOFromRFQ = async (req, res) => {
  try {
    const newPO = await purchaseOrderModel.createPOFromRFQ(req.body);
    res.status(201).json(newPO);
  } catch (err) {
    console.error("❌ createPOFromRFQ error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.uploadPOFiles = async (req, res) => {
  try {
    const po_id = req.params.id;

    console.log("Uploaded files:", req.files); // ✅ เพิ่มบรรทัดนี้เพื่อตรวจสอบไฟล์ที่ได้รับ

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "กรุณาเลือกไฟล์อัปโหลด" });
    }

    // เตรียมข้อมูลไฟล์สำหรับ DB
    const files = req.files.map((file) => ({
      file_name: file.originalname,
      file_type: file.mimetype,
      file_path: file.path, 
      file_url: `${req.protocol}://${req.get("host")}/${file.path}`, 
    }));

    // ✅ เรียก Model เพื่อเพิ่มไฟล์ และใช้ข้อมูลที่ Model ส่งกลับมา
    const updatedPO = await purchaseOrderModel.addPOFiles(po_id, files, 1);

    res.status(201).json(updatedPO);

  } catch (err) {
    console.error("❌ uploadPOFiles error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};


exports.updatePOAttachments = async (req, res) => {
  try {
    const po_id = req.params.id;
    const { existingAttachments } = req.body;

    const newFiles = req.files ? req.files.map(file => ({
      file_name: file.originalname,
      file_type: file.mimetype, // ✅ แก้ไข: ควรใช้ file.mimetype แทน file.fieldname
      file_path: file.path, 
      file_url: `${req.protocol}://${req.get("host")}/${file.path}`, 
    })) : [];

    // ✅ เปลี่ยนการเรียกใช้ Model ให้ return ข้อมูล PO กลับมา
    const updatedPO = await purchaseOrderModel.updatePOFiles(po_id, newFiles, JSON.parse(existingAttachments));

    // ✅ เปลี่ยนการตอบกลับเป็นการส่งข้อมูล PO ฉบับเต็ม
    res.status(200).json(updatedPO);

  } catch (err) {
    console.error("❌ updatePOAttachments error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};