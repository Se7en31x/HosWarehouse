// backend/socket.js
const { Server } = require("socket.io");
const { pool } = require("./config/db");
const NotificationModel = require("./models/notificationModel");

let io; // เอาไว้เก็บ instance ของ socket.io

function socketSetup(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"], // ✅ ให้ตรงกับ frontend
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    // 👉 user join room
    socket.on("joinRoom", async (room) => {
      socket.join(room);
      console.log(`✅ ${socket.id} joined ${room}`);

      try {
        const userId = room.replace("user_", "");
        const { rows } = await pool.query(
          `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
          [userId]
        );
        socket.emit("initialNotifications", rows || []);
      } catch (err) {
        console.error("❌ Load initial notifications:", err.message);
      }
    });

    // 👉 mark as read
    socket.on("markAsRead", async (notificationId) => {
      try {
        const updated = await NotificationModel.markAsRead(notificationId);
        if (updated) {
          io.to(`user_${updated.user_id}`).emit("notificationUpdated", updated);
        }
      } catch (err) {
        console.error("❌ markAsRead:", err.message);
      }
    });

    // 👉 mark all as read
    socket.on("markAllAsRead", async (userId) => {
      try {
        await NotificationModel.markAllAsRead(userId);
        io.to(`user_${userId}`).emit("allNotificationsRead");
      } catch (err) {
        console.error("❌ markAllAsRead:", err.message);
      }
    });

    // 👉 delete
    socket.on("deleteNotification", async ({ notificationId, userId }) => {
      try {
        const ok = await NotificationModel.delete(notificationId);
        if (ok) {
          io.to(`user_${userId}`).emit("notificationDeleted", { notificationId });
        }
      } catch (err) {
        console.error("❌ deleteNotification:", err.message);
      }
    });

    // 👉 clear all
    socket.on("clearNotifications", async (userId) => {
      try {
        await NotificationModel.clearByUser(userId);
        io.to(`user_${userId}`).emit("notificationsCleared");
      } catch (err) {
        console.error("❌ clearNotifications:", err.message);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Client disconnected:", socket.id, "reason:", reason);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.io ยังไม่ได้ถูก initialize");
  return io;
}

module.exports = { socketSetup, getIO };
