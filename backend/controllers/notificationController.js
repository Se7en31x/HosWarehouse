// // controllers/notificationController.js
// const Notification = require("../models/notificationModel");

// // ✅ ดึงการแจ้งเตือนทั้งหมดของ user
// exports.getUserNotifications = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const notifications = await Notification.getByUser(userId);
//     res.json(notifications);
//   } catch (err) {
//     console.error("❌ Error getUserNotifications:", err);
//     res.status(500).json({ error: "Error fetching notifications" });
//   }
// };

// // ✅ Mark เป็นอ่าน
// exports.markAsRead = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     const updated = await Notification.markAsRead(notificationId);
//     res.json(updated);
//   } catch (err) {
//     console.error("❌ Error markAsRead:", err);
//     res.status(500).json({ error: "Error updating notification" });
//   }
// };

// // ✅ Mark ทั้งหมดเป็นอ่าน
// exports.markAllAsRead = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     await Notification.markAllAsRead(userId);
//     res.json({ message: "All marked as read" });
//   } catch (err) {
//     console.error("❌ Error markAllAsRead:", err);
//     res.status(500).json({ error: "Error updating notifications" });
//   }
// };

// // ✅ สร้างการแจ้งเตือนใหม่
// exports.createNotification = async (req, res) => {
//   try {
//     const { userId, title, message, category, relatedTable, relatedId } = req.body;
//     const noti = await Notification.create(
//       userId,
//       title,
//       message,
//       category,
//       relatedTable,
//       relatedId
//     );
//     res.status(201).json(noti);
//   } catch (err) {
//     console.error("❌ Error createNotification:", err);
//     res.status(500).json({ error: "Error creating notification" });
//   }
// };

// // ✅ ลบการแจ้งเตือนเดียว
// exports.deleteNotification = async (req, res) => {
//   try {
//     const { notificationId } = req.params;
//     await Notification.delete(notificationId);
//     res.json({ message: "Notification deleted" });
//   } catch (err) {
//     console.error("❌ Error deleteNotification:", err);
//     res.status(500).json({ error: "Error deleting notification" });
//   }
// };

// // ✅ ลบการแจ้งเตือนทั้งหมดของ user
// exports.clearUserNotifications = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     await Notification.clearByUser(userId);
//     res.json({ message: "All notifications cleared" });
//   } catch (err) {
//     console.error("❌ Error clearUserNotifications:", err);
//     res.status(500).json({ error: "Error clearing notifications" });
//   }
// };

// // ✅ นับจำนวนแจ้งเตือนที่ยังไม่อ่าน (badge 🔔)
// exports.countUnread = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const count = await Notification.countUnread(userId);
//     res.json({ unreadCount: count });
//   } catch (err) {
//     console.error("❌ Error countUnread:", err);
//     res.status(500).json({ error: "Error counting unread notifications" });
//   }
// };

// // ✅ ดึงแจ้งเตือนตาม category
// exports.getByCategory = async (req, res) => {
//   try {
//     const { userId, category } = req.params;
//     const notis = await Notification.getByCategory(userId, category);
//     res.json(notis);
//   } catch (err) {
//     console.error("❌ Error getByCategory:", err);
//     res.status(500).json({ error: "Error fetching notifications by category" });
//   }
// };
