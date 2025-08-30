// backend/socket.js
const { Server } = require("socket.io");
const { pool } = require("./config/db");
const NotificationModel = require("./models/notificationModel");

let io;

function socketSetup(server) {
  io = new Server(server, {
    cors: {
      origin: ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

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

    socket.on("markAllAsRead", async (userId) => {
      try {
        await NotificationModel.markAllAsRead(userId);
        io.to(`user_${userId}`).emit("allNotificationsRead");
      } catch (err) {
        console.error("❌ markAllAsRead:", err.message);
      }
    });

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
  if (!io) {
    throw new Error("Socket.io has not been initialized. Call socketSetup(server) first.");
  }
  return io;
}

module.exports = { socketSetup, getIO };