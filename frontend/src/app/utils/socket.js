// frontend/utils/socket.js

import { io } from "socket.io-client";

let socket = null;

/**
 * เชื่อมต่อกับ WebSocket server
 * @param {object} handlers object ที่รวม callback ของ event
 *  - onLotUpdated
 *  - onNewNotification
 *  - onNotificationUpdated
 *  - onAllNotificationsRead
 *  - onNotificationDeleted
 *  - onNotificationsCleared
 */
export const connectSocket = (handlers = {}) => {
  if (!socket) {
    socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("🟢 Connected to WebSocket server");
    });

    // ✅ Event อัปเดต Lot แบบ real-time
    socket.on("itemLotUpdated", (lotData) => {
      console.log("📦 RT Lot update:", lotData);
      if (typeof handlers.onLotUpdated === "function") {
        handlers.onLotUpdated(lotData);
      }
    });

    // ✅ Event แจ้งเตือนใหม่
    socket.on("newNotification", (noti) => {
      console.log("🔔 Notification received:", noti);
      if (typeof handlers.onNewNotification === "function") {
        handlers.onNewNotification(noti);
      }
    });

    // ✅ อัปเดตแจ้งเตือน (markAsRead)
    socket.on("notificationUpdated", (updated) => {
      console.log("✏️ Notification updated:", updated);
      if (typeof handlers.onNotificationUpdated === "function") {
        handlers.onNotificationUpdated(updated);
      }
    });

    // ✅ อ่านทั้งหมด
    socket.on("allNotificationsRead", () => {
      console.log("👁 All notifications marked as read");
      if (typeof handlers.onAllNotificationsRead === "function") {
        handlers.onAllNotificationsRead();
      }
    });

    // ✅ ลบแจ้งเตือน
    socket.on("notificationDeleted", (deleted) => {
      console.log("🗑 Notification deleted:", deleted);
      if (typeof handlers.onNotificationDeleted === "function") {
        handlers.onNotificationDeleted(deleted);
      }
    });

    // ✅ เคลียร์แจ้งเตือนทั้งหมด
    socket.on("notificationsCleared", () => {
      console.log("🧹 All notifications cleared");
      if (typeof handlers.onNotificationsCleared === "function") {
        handlers.onNotificationsCleared();
      }
    });

    // ✅ โหลดแจ้งเตือนเก่า
    socket.on("initialNotifications", (data) => {
      console.log("📥 Initial notifications:", data);
      if (typeof handlers.onInitialNotifications === "function") {
        handlers.onInitialNotifications(data);
      }
    });

    // ✅ Debug: รับข้อความทั่วไป
    socket.on("receiveMessage", (message) => {
      console.log("📩 New message received:", message);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected from WebSocket server");
    });
  }
  return socket;
};

/**
 * ตัดการเชื่อมต่อ WebSocket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔴 Disconnected from WebSocket");
  }
};

/**
 * เข้าห้องของ user (ใช้ userId)
 */
export const joinUserRoom = (userId) => {
  if (socket) {
    socket.emit("joinRoom", `user_${userId}`);
    console.log(`✅ Joined notification room: user_${userId}`);
  }
};

/**
 * ส่งข้อความ (เช่น debug หรือ chat)
 */
export const sendMessage = (room, message) => {
  if (socket) {
    socket.emit("sendMessage", { room, message });
    console.log(`📨 Sent message to ${room}: ${message}`);
  }
};