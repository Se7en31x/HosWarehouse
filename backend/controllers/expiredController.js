// controllers/expiredController.js
const ExpiredModel = require('../models/expiredModel');

// Controller สำหรับดึงข้อมูลรายการที่หมดอายุ
exports.getAll = async (req, res) => {
  try {
    const lots = await ExpiredModel.getAll();
    res.json(lots);
  } catch (error) {
    console.error('Error getAll expired:', error);
    res.status(500).json({ error: error.message });
  }
};

// Controller สำหรับการบันทึกการทิ้ง
exports.addAction = async (req, res) => {
  try {
    const { lot_id, item_id, action_qty, note } = req.body;
    const action_by = req.user?.id; // ✅ ดึง user id จาก token

    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required and cannot be null' });
    }
    if (!action_by) {
      return res.status(401).json({ error: 'Unauthorized: missing user id' });
    }

    await ExpiredModel.addAction({ lot_id, item_id, action_qty, action_by, note });
    res.json({ success: true, message: 'บันทึกการทิ้งเรียบร้อย' });
  } catch (error) {
    console.error('Error addAction expired:', error);
    res.status(500).json({ error: error.message });
  }
};

// Controller สำหรับดึงประวัติการทิ้งตาม lot
exports.getActionsByLotId = async (req, res) => {
  try {
    const { lot_id } = req.params; // ✅ ตอนนี้ id = lot_id
    const history = await ExpiredModel.getActionsByLotId(lot_id);
    res.json(history);
  } catch (error) {
    console.error('Error getActionsByLotId:', error);
    res.status(500).json({ error: error.message });
  }
};
