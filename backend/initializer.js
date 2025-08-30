// backend/initializer.js
const { setupDbListener } = require('./dbListener');
const { socketSetup } = require('./socket');

function initialize(server) {
  // 1. เริ่มต้น Socket.IO ก่อน เพื่อสร้าง 'io' instance
  const io = socketSetup(server);

  // 2. ตอนนี้เรียกใช้ตัวฟังฐานข้อมูลได้อย่างปลอดภัย
  // เพราะ 'io' instance ถูกสร้างและพร้อมใช้งานแล้ว
  setupDbListener();

  return io;
}

module.exports = { initialize };