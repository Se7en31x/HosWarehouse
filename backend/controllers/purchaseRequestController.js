const purchaseRequestModel = require("../models/purchaseRequestModel");

// ✅ ดึงรายการสินค้า
exports.getItems = async (req, res) => {
  try {
    const items = await purchaseRequestModel.getItems();
    return res.json(items);
  } catch (err) {
    console.error("❌ getItems error:", err.message);
    return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ ดึง PR (header)
exports.getAllPurchaseRequests = async (req, res) => {
  try {
    const requests = await purchaseRequestModel.getAllPurchaseRequests();
    return res.json(requests);
  } catch (err) {
    console.error("❌ getAllPurchaseRequests error:", err.message);
    return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ ดึง PR Items ทั้งหมด (flatten)
exports.getAllPurchaseRequestItems = async (req, res) => {
  try {
    const items = await purchaseRequestModel.getAllPurchaseRequestItems();
    return res.json(items);
  } catch (err) {
    console.error("❌ getAllPurchaseRequestItems error:", err.message);
    return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ ดึง PR ตาม id
exports.getPurchaseRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const pr = await purchaseRequestModel.getPurchaseRequestById(id);
    if (!pr) {
      return res.status(404).json({ message: "ไม่พบคำขอสั่งซื้อ" });
    }
    return res.json(pr);
  } catch (err) {
    console.error("❌ getPurchaseRequestById error:", err.message);
    return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ สร้าง PR
exports.createPurchaseRequest = async (req, res) => {
  try {
    const requester_id = req.user?.id; // ✅ เอามาจาก token
    const { items_to_purchase } = req.body;

    if (!requester_id || !items_to_purchase?.length) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    const results = await Promise.all(
      items_to_purchase.map((item) =>
        purchaseRequestModel.createPurchaseRequest({
          requester_id,
          item_id: item.item_id,
          qty_requested: item.qty,
          unit: item.unit,
          note: item.note,
        })
      )
    );

    return res.status(201).json({
      message: "สร้างคำขอสั่งซื้อสำเร็จ",
      data: results,
    });
  } catch (err) {
    console.error("❌ createPurchaseRequest error:", err.message);
    return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ รายงาน PR
exports.getPRReport = async (req, res) => {
  try {
    const { monthRange, startDate, endDate } = req.query;

    console.log("📥 PR Report params:", { monthRange, startDate, endDate });

    let start = startDate;
    let end = endDate;

    // ✅ ถ้ามีการเลือก monthRange
    if (monthRange && monthRange !== "all" && monthRange !== "custom") {
      const now = new Date();
      end = now.toISOString().split("T")[0];
      const past = new Date();
      past.setMonth(past.getMonth() - parseInt(monthRange));
      start = past.toISOString().split("T")[0];
    }

    const result = await purchaseRequestModel.getPRReport({ startDate: start, endDate: end });
    return res.json(result);
  } catch (err) {
    console.error("❌ getPRReport error:", err.message);
    return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};
