"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { connectSocket, disconnectSocket, joinUserRoom } from "../utils/socket";
import { getUserIdFromToken } from "../utils/auth";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);
  const socketRef = useRef(null);

  // ✅ ดึง userId หลัง mount
  useEffect(() => {
    const id = getUserIdFromToken("manage");
    if (id) {
      console.log("🎯 userId loaded from token:", id);
      setUserId(id);
    }
  }, []);

  // ✅ connect socket หลัง userId ถูก set แล้ว
  useEffect(() => {
    if (!userId) return;
    if (socketRef.current) return; // กันสร้างซ้ำ

    const handlers = {
      onInitialNotifications: (data) => {
        console.log("📥 Initial notifications received in Context:", data);
        // ❌ กัน noti ซ้ำ
        const unique = Array.from(
          new Map(data.map((n) => [n.notification_id, n])).values()
        );
        setNotifications(unique);
      },
      onNewNotification: (noti) => {
        console.log("➕ New notification:", noti);
        setNotifications((prev) => {
          const exists = prev.some(
            (n) => Number(n.notification_id) === Number(noti.notification_id)
          );
          if (exists) return prev; // ❌ ถ้ามีแล้วไม่ต้องเพิ่ม
          return [noti, ...prev];
        });
      },
      onNotificationUpdated: (updated) => {
        console.log("✏️ Updated notification:", updated);
        setNotifications((prev) =>
          prev.map((n) =>
            Number(n.notification_id) === Number(updated.notification_id)
              ? updated
              : n
          )
        );
      },
      onAllNotificationsRead: () => {
        console.log("👁 Mark all as read");
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      },
      onNotificationDeleted: (deleted) => {
        console.log("🗑 Deleted notification:", deleted);
        setNotifications((prev) =>
          prev.filter(
            (n) =>
              Number(n.notification_id) !== Number(deleted.notification_id)
          )
        );
      },
      onNotificationsCleared: () => {
        console.log("🧹 Cleared all notifications");
        setNotifications([]);
      },
    };

    const s = connectSocket(handlers);
    socketRef.current = s;

    s.on("connect", () => {
      console.log("🟢 Connected, joining user_" + userId);
      joinUserRoom(userId);
    });

    return () => {
      disconnectSocket();
      socketRef.current = null;
    };
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        socket: socketRef.current,
        setNotifications,
        userId,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
