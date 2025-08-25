"use client";
import { createContext, useContext, useState, useEffect, useRef } from "react";
import { connectSocket, disconnectSocket, joinUserRoom } from "../utils/socket";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const socketRef = useRef(null);
    const userId = 999; // ภายหลังดึงจาก session/login

    useEffect(() => {
        if (socketRef.current) return; // ✅ กันสร้างซ้ำ

        const handlers = {
            onInitialNotifications: (data) => {
                console.log("📥 Context got initial:", data);
                setNotifications(data || []);
            },
            onNewNotification: (noti) => {
                console.log("📩 Context got new:", noti); // 👀 Debug ตรงนี้
                setNotifications((prev) => [noti, ...prev]);
            },
            onNotificationUpdated: (updated) => {
                console.log("✏️ Context updated:", updated);
                setNotifications((prev) =>
                    prev.map((n) =>
                        Number(n.notification_id) === Number(updated.notification_id)
                            ? updated 
                            : n 
                    )
                );
            },
            onAllNotificationsRead: () => {
                console.log("👁 Context mark all read");
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            },
            onNotificationDeleted: (deleted) => {
                console.log("🗑 Context deleted:", deleted);
                setNotifications((prev) =>
                    prev.filter((n) => Number(n.notification_id) !== Number(deleted.notification_id))
                );
            },
            onNotificationsCleared: () => {
                console.log("🧹 Context cleared all");
                setNotifications([]);
            },
        };

        const s = connectSocket(handlers);
        socketRef.current = s;

        s.on("connect", () => {
            console.log("🟢 Connected, joining user_" + userId);
            joinUserRoom(userId); // ✅ แค่ joinRoom พอ
        });

        return () => {
            disconnectSocket();
            socketRef.current = null;
        };
    }, [userId]);

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, socket: socketRef.current, setNotifications }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => useContext(NotificationContext);
