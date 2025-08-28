// src/app/components/NotificationBell.jsx
"use client";
import { useState, useRef, useEffect } from "react";
// ✅ เปลี่ยนมาใช้ไอคอนจาก Lucide React
import { Bell, Check, X, Eye } from "lucide-react"; 
import { useNotifications } from "../../context/NotificationContext";
import styles from "./NotificationBell.module.css";

export default function NotificationBell() {
    const { notifications, unreadCount, socket, setNotifications } = useNotifications();
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    const toggleDropdown = () => setOpen(!open);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false);
                console.log("Notifications in Bell:", notifications);
            }
        };
        console.log("Notifications in Bell:", notifications);
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAsRead = (id) => {
        if (socket && id) {
            console.log("👉 Mark as read:", id);
            setNotifications((prev) =>
                prev.map((n) =>
                    Number(n.notification_id) === Number(id) ? { ...n, is_read: true } : n
                )
            );
            socket.emit("markAsRead", id);
        }
    };

    const handleMarkAllAsRead = () => {
        if (socket) {
            console.log("👉 Mark all as read");
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            socket.emit("markAllAsRead", 999);
        }
    };

    const handleClearAll = () => {
        if (socket) {
            console.log("👉 Clear all notifications");
            setNotifications([]);
            socket.emit("clearNotifications", 999);
        }
    };

    return (
        <div className={styles.notiWrapper} ref={dropdownRef}>
            <div className={styles.bellWrapper} onClick={toggleDropdown}>
                {/* ✅ เปลี่ยนมาใช้ไอคอน Bell */}
                <Bell className={styles.bellIcon} size={24} /> 
                {unreadCount > 0 && (
                    <span className={styles.badge}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </div>

            {open && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                        <span>การแจ้งเตือน</span>
                        <span className={styles.count}>{notifications.length} รายการ</span>
                        <div className={styles.actions}>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllAsRead} className={styles.markAllBtn}>
                                    <Check size={16} /> อ่านทั้งหมด
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={handleClearAll} className={styles.clearBtn}>
                                    <X size={16} /> ลบทั้งหมด
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.dropdownBody}>
                        {notifications.length === 0 ? (
                            <div className={styles.empty}>ไม่มีการแจ้งเตือน</div>
                        ) : (
                            <ul className={styles.notiList}>
                                {notifications.map((n, idx) => (
                                    <li
                                        key={idx}
                                        onClick={() => !n.is_read && handleMarkAsRead(n.notification_id)}
                                        className={`${styles.notiItem} ${!n.is_read ? styles.unread : ""}`}
                                    >
                                        <div className={styles.notiContent}>
                                            <strong>{n.title}</strong>
                                            <p>{n.message}</p>
                                            <small>
                                                {new Intl.DateTimeFormat("th-TH", {
                                                    timeZone: "Asia/Bangkok",
                                                    dateStyle: "short",
                                                    timeStyle: "medium",
                                                }).format(new Date(n.created_at))}
                                            </small>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className={styles.dropdownFooter}>
                        <button className={styles.viewAllBtn}>
                            <Eye size={16} /> ดูทั้งหมด
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}