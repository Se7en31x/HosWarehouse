// backend/socketIO.js
const { Server } = require("socket.io");
let io;

function socketSetup(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    socket.on("joinRoom", (room) => {
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on("sendMessage", ({ room, message }) => {
      console.log(`📨 Message to ${room}:`, message);
      io.to(room).emit("receiveMessage", message);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Client disconnected:", socket.id);
    });
  });
}

function getIO() {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
}

module.exports = { socketSetup, getIO };
