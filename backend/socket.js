// backend/socket.js
const { pool } = require("./config/db");
const NotificationModel = require("./models/notificationModel");
const { initIO } = require("./ioInstance");

function socketSetup(server) {
  const io = initIO(server);

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
        console.log(`📤 Sending initial notifications to ${socket.id}:`, rows.length, "items");
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
          console.log(`📤 Sending notificationUpdated to user_${updated.user_id}:`, updated);
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
        console.log(`📤 Sending allNotificationsRead to user_${userId}`);
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
          console.log(`📤 Sending notificationDeleted to user_${userId}:`, { notificationId });
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
        console.log(`📤 Sending notificationsCleared to user_${userId}`);
        io.to(`user_${userId}`).emit("notificationsCleared");
      } catch (err) {
        console.error("❌ clearNotifications:", err.message);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔴 Client disconnected:", socket.id, "reason:", reason);
    });
  });
}

module.exports = { socketSetup };