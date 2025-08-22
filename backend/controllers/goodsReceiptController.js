const goodsReceiptModel = require('../models/goodsReceiptModel');

// Controller: ดึงรายการนำเข้าสินค้าทั้งหมด
exports.getAllGoodsReceipts = async (req, res) => {
  try {
    const goodsReceipts = await goodsReceiptModel.getAllGoodsReceipts();
    res.status(200).json(goodsReceipts);
  } catch (error) {
    console.error("Error fetching goods receipts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller: ดึงรายละเอียดการนำเข้าสินค้าตาม ID
exports.getGoodsReceiptById = async (req, res) => {
  const { id } = req.params;
  try {
    const grDetail = await goodsReceiptModel.getGoodsReceiptDetails(id);
    if (!grDetail) {
      return res.status(404).json({ message: "Goods receipt not found" });
    }
    res.status(200).json(grDetail);
  } catch (error) {
    console.error("Error fetching goods receipt details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller: สร้างรายการนำเข้าสินค้าใหม่
exports.createGoodsReceipt = async (req, res) => {
  const { userId, poId, supplierId, receivingNote, receivingItems } = req.body;
  if (!userId || !supplierId || !receivingItems || receivingItems.length === 0) {
    return res.status(400).json({ message: "Missing required fields: userId, supplierId, or receivingItems." });
  }
  
  try {
    const newGr = await goodsReceiptModel.recordReceiving({
      user_id: userId,
      po_id: poId,
      supplier_id: supplierId,
      receiving_note: receivingNote,
      receivingItems: receivingItems,
    });
    res.status(201).json({ message: "Goods receipt created successfully.", gr_no: newGr.gr_no, import_id: newGr.import_id });
  } catch (error) {
    console.error("Error creating goods receipt:", error);
    res.status(500).json({ message: "Failed to create goods receipt." });
  }
};