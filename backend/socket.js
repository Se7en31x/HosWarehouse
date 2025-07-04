const { Server } = require('socket.io');
const { getItems } = require('./socket/inventorySocket'); // ฟังก์ชัน getItems ตอนนี้รับ (socket, io)

let io;

function socketSetup(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 Client connected: ' + socket.id);

    socket.on('joinRoom', (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('sendMessage', ({ room, message }) => {
      console.log(`📨 Message to ${room}:`, message);
      io.to(room).emit('receiveMessage', message);
    });

    // เพิ่มส่วนนี้ เพื่อให้ client ขอข้อมูล inventory ได้
    socket.on('requestInventoryData', async () => {
      console.log(`📥 ${socket.id} requested inventory data`);
      // เรียก controller พร้อมส่ง io ไปด้วย เพื่อ broadcast ให้ทุก client
      await getItems(socket, io);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Client disconnected: ' + socket.id);
    });
  });
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

module.exports = { socketSetup, getIO };
