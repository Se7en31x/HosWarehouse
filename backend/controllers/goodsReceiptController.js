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
    await client.query("BEGIN");
    const grData = req.body;
    const newGr = await grModel.createGoodsReceipt(client, grData);
    await client.query("COMMIT");
    res.status(201).json(newGr);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error createGoodsReceipt:", err);
    res.status(500).json({ message: "ไม่สามารถสร้าง GR ได้" });
  } finally {
    client.release();
  }
}

module.exports = {
  getAllGoodsReceipts,
  getGoodsReceiptById,
  createGoodsReceipt,
};
