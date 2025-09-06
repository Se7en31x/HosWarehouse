const purchaseRequestModel = require("../models/purchaseRequestModel");

// ✅ ดึงรายการสินค้า
exports.getItems = async (req, res) => {
  try {
    const items = await purchaseRequestModel.getItems();
    res.json(items);
  } catch (err) {
    console.error("❌ getItems error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ ดึง PR (header)
exports.getAllPurchaseRequests = async (req, res) => {
  try {
    const requests = await purchaseRequestModel.getAllPurchaseRequests();
    res.json(requests);
  } catch (err) {
    console.error("❌ getAllPurchaseRequests error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ ดึง PR Items ทั้งหมด (flatten)
exports.getAllPurchaseRequestItems = async (req, res) => {
  try {
    const items = await purchaseRequestModel.getAllPurchaseRequestItems();
    res.json(items);
  } catch (err) {
    console.error("❌ getAllPurchaseRequestItems error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ ดึง PR ตาม id
exports.getPurchaseRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const pr = await purchaseRequestModel.getPurchaseRequestById(id);
    if (!pr) return res.status(404).json({ message: "ไม่พบคำขอสั่งซื้อ" });
    res.json(pr);
  } catch (err) {
    console.error("❌ getPurchaseRequestById error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

exports.createPurchaseRequest = async (req, res) => {
  try {
    const requester_id = req.user?.id; // ✅ เอามาจาก token
    const { items_to_purchase } = req.body;

    if (!requester_id || !items_to_purchase?.length) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    const results = [];
    for (const item of items_to_purchase) {
      const newPR = await purchaseRequestModel.createPurchaseRequest({
        requester_id,
        item_id: item.item_id,
        qty_requested: item.qty,
        unit: item.unit,
        note: item.note,
      });
      results.push(newPR);
    }

    res.status(201).json({
      message: "สร้างคำขอสั่งซื้อสำเร็จ",
      data: results,
    });
  } catch (err) {
    console.error("❌ createPurchaseRequest error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};