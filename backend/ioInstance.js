// ioInstance.js
const { Server } = require("socket.io");
let io;

function initIO(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"], // ✅ ให้ตรงกับ frontend
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // ✅ รองรับทั้งคู่ ปลอดภัยกว่า
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    socket.on("joinRoom", (room) => {
      socket.join(room);
      console.log(`✅ Socket ${socket.id} joined room: ${room}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Client disconnected:", socket.id, "reason:", reason);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
}

module.exports = { initIO, getIO };
