// frontend/utils/socket.js
import { io } from "socket.io-client";

let socket = null;

export const connectSocket = (handlers = {}) => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ["websocket"], // 👈 ลด polling delay
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("🟢 Connected to WebSocket server");
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected from WebSocket server");
    });
  }

  // ✅ bind ใหม่ทุกครั้ง (refresh handlers)
  socket.off("itemLotUpdated").on("itemLotUpdated", (lotData) => {
    console.log("📦 RT Lot update:", lotData);
    handlers.onLotUpdated?.(lotData);
  });

  socket.off("newNotification").on("newNotification", (noti) => {
    console.log("🔔 Notification received:", noti);
    handlers.onNewNotification?.(noti);
  });

  socket.off("notificationUpdated").on("notificationUpdated", (updated) => {
    console.log("✏️ Notification updated:", updated);
    handlers.onNotificationUpdated?.(updated);
  });

  socket.off("allNotificationsRead").on("allNotificationsRead", () => {
    console.log("👁 All notifications marked as read");
    handlers.onAllNotificationsRead?.();
  });

  socket.off("notificationDeleted").on("notificationDeleted", (deleted) => {
    console.log("🗑 Notification deleted:", deleted);
    handlers.onNotificationDeleted?.(deleted);
  });

  socket.off("notificationsCleared").on("notificationsCleared", () => {
    console.log("🧹 All notifications cleared");
    handlers.onNotificationsCleared?.();
  });

  socket.off("initialNotifications").on("initialNotifications", (data) => {
    console.log("📥 Initial notifications:", data);
    handlers.onInitialNotifications?.(data);
  });

  socket.off("receiveMessage").on("receiveMessage", (message) => {
    console.log("📩 New message received:", message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔴 Disconnected from WebSocket");
  }
};

export const joinUserRoom = (userId) => {
  if (socket) {
    socket.emit("joinRoom", `user_${userId}`);
    console.log(`✅ Joined notification room: user_${userId}`);
  }
};

export const sendMessage = (room, message) => {
  if (socket) {
    socket.emit("sendMessage", { room, message });
    console.log(`📨 Sent message to ${room}: ${message}`);
  }
};
