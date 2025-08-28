// controllers/goodsReceiptController.js
const { pool } = require("../config/db");
const grModel = require("../models/goodsReceiptModel");

// ===== GET: List GR =====
async function getAllGoodsReceipts(req, res) {
  try {
    const data = await grModel.getAllGoodsReceipts();
    res.json(data);
  } catch (err) {
    console.error("Error getAllGoodsReceipts:", err);
    res.status(500).json({ message: "ไม่สามารถโหลดรายการ GR ได้" });
  }
}

// ===== GET: GR Detail =====
async function getGoodsReceiptById(req, res) {
  try {
    const { id } = req.params;
    const data = await grModel.getGoodsReceiptById(id);
    if (!data) return res.status(404).json({ message: "ไม่พบข้อมูล GR" });
    res.json(data);
  } catch (err) {
    console.error("Error getGoodsReceiptById:", err);
    res.status(500).json({ message: "ไม่สามารถโหลดรายละเอียด GR ได้" });
  }
}

// ===== POST: Create GR =====
async function createGoodsReceipt(req, res) {
  const client = await pool.connect();
  try {
    const grData = req.body;

    // ✅ validate ก่อนเข้า model
    if (!grData.po_id) {
      return res.status(400).json({ message: "ต้องระบุ PO ID" });
    }
    if (!grData.items || !Array.isArray(grData.items) || grData.items.length === 0) {
      return res.status(400).json({ message: "ต้องมีรายการสินค้าอย่างน้อย 1 รายการ" });
    }

    await client.query("BEGIN");
    const newGr = await grModel.createGoodsReceipt(client, grData);
    await client.query("COMMIT");

    res.status(201).json(newGr);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error createGoodsReceipt:", err);

    // ✅ ส่ง error dev-friendly ใน dev mode
    res.status(500).json({
      message: "ไม่สามารถสร้าง GR ได้",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  } finally {
    client.release();
  }

}
async function receiveMore(req, res) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params; // GR id
    const { items } = req.body;
    const userId = req.body.user_id || 1;

    const result = await grModel.receiveMoreGoods(client, id, items, userId);
    await client.query("COMMIT");
    res.json(result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error receiveMore:", err);
    res.status(500).json({ message: "ไม่สามารถบันทึกรับเพิ่มได้" });
  } finally {
    client.release();
  }
}
module.exports = {
  receiveMore,
  getAllGoodsReceipts,
  getGoodsReceiptById,
  createGoodsReceipt,
};
