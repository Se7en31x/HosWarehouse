const inventoryModel = require('../models/inventoryModel');

// ฟังก์ชันเพื่อดึงข้อมูลและส่งผ่าน WebSocket //
exports.getItems = async (socket, io) => {
  try {
    const items = await inventoryModel.getAllItemsDetailed();
    console.log('🟢 ส่งข้อมูล inventory กลับ:', items.length, 'รายการ');
    io.emit('itemsData', items); // ✅ เปลี่ยนจาก socket.emit เป็น io.emit
  } catch (err) {
    console.error('❌ ดึงข้อมูลล้มเหลว:', err);
    socket.emit('itemsError', 'เกิดข้อผิดพลาดขณะดึงข้อมูล');
  }
};

////////////////////////REST API///////////////////////////////
// backend/controllers/inventoryController.js
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params; // ดึง id จาก URL parameter
    if (!id) {
      return res.status(400).json({ message: 'กรุณาระบุ id' });
    }

    const item = await inventoryModel.getItemById(id);
    if (!item) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลพัสดุ' });
    }

    res.json(item);
  } catch (error) {
    console.error('❌ Error fetching item by id:', error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดใน server' });
  }
};