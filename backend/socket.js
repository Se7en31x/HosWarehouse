const { Server } = require('socket.io');
const { getItems } = require('./controllers/inventoryController'); // 👈 เพิ่มส่วนนี้

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

    // 👇 เพิ่มส่วนนี้ เพื่อให้ client ขอข้อมูล inventory ได้
    socket.on('requestInventoryData', async () => {
      console.log(`📥 ${socket.id} requested inventory data`);
      await getItems(socket); // เรียก controller เพื่อส่งข้อมูลกลับไป
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
