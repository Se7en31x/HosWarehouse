const purchaseOrderModel = require("../models/purchaseOrderModel");

// ✅ GET /po
exports.getAllPOs = async (req, res) => {
  try {
    const { status } = req.query;
    const pos = await purchaseOrderModel.getAllPOs(status);
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

// ✅ POST /po (สร้างใหม่ → ใช้ user จาก token)
exports.createPO = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const newPO = await purchaseOrderModel.createPO({
      ...req.body,
      created_by: userId,
    });
    res.status(201).json(newPO);
  } catch (err) {
    console.error("❌ createPO error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ PUT /po/:id (อัปเดต → ใช้ user จาก token)
exports.updatePO = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const updatedPO = await purchaseOrderModel.updatePO(req.params.id, {
      ...req.body,
      updated_by: userId,
    });
    res.json(updatedPO);
  } catch (err) {
    console.error("❌ updatePO error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ POST /po/from-rfq (สร้างจาก RFQ → ผูก user)
exports.createPOFromRFQ = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const newPO = await purchaseOrderModel.createPOFromRFQ({
      ...req.body,
      created_by: userId,
    });
    res.status(201).json(newPO);
  } catch (err) {
    console.error("❌ createPOFromRFQ error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ Upload Attachments
exports.uploadPOFiles = async (req, res) => {
  try {
    const po_id = req.params.id;
    const userId = req.user?.id || null;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "กรุณาเลือกไฟล์อัปโหลด" });
    }

    const files = req.files.map((file) => ({
      file_name: file.originalname,
      file_type: file.mimetype,
      file_path: file.path,
      file_url: `${req.protocol}://${req.get("host")}/${file.path}`,
    }));

    const updatedPO = await purchaseOrderModel.addPOFiles(po_id, files, userId);

    res.status(201).json(updatedPO);
  } catch (err) {
    console.error("❌ uploadPOFiles error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.updatePOAttachments = async (req, res) => {
  try {
    const po_id = req.params.id;
    const userId = req.user?.id || null;
    const { existingAttachments } = req.body;

    const newFiles = req.files
      ? req.files.map((file) => ({
          file_name: file.originalname,
          file_type: file.mimetype,
          file_path: file.path,
          file_url: `${req.protocol}://${req.get("host")}/${file.path}`,
        }))
      : [];

    const updatedPO = await purchaseOrderModel.updatePOFiles(
      po_id,
      newFiles,
      JSON.parse(existingAttachments),
      userId
    );

    res.status(200).json(updatedPO);
  } catch (err) {
    console.error("❌ updatePOAttachments error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ mark ว่าใช้ใน GR แล้ว
exports.markPOAsUsed = async (req, res) => {
  try {
    const po_id = req.params.id;
    const userId = req.user?.id || null;
    const result = await purchaseOrderModel.markPOAsUsed(po_id, userId);
    res.json({ message: "อัปเดต PO ว่าใช้ใน GR แล้ว", ...result });
  } catch (err) {
    console.error("❌ markPOAsUsed error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};
