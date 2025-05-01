const inventoryModel = require('../models/inventoryModel');

// ฟังก์ชันเพื่อดึงข้อมูลและส่งผ่าน WebSocket
exports.getItems = async (socket) => {
  try {
    const items = await inventoryModel.getAllItems(); // ดึงข้อมูลจาก model
    socket.emit('itemsData', items); // ส่งข้อมูลไปยังไคลเอนต์ที่เชื่อมต่อผ่าน WebSocket
  } catch (err) {
    socket.emit('itemsError', 'เกิดข้อผิดพลาดขณะดึงข้อมูล'); // ส่งข้อผิดพลาดผ่าน WebSocket
  }
};
