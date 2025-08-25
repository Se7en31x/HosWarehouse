"use client";
import { useState, useRef, useEffect } from "react";
import { MdNotifications } from "react-icons/md";
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

  // ✅ อ่านเฉพาะ 1 รายการ
  const handleMarkAsRead = (id) => {
    if (socket && id) {
      console.log("👉 Mark as read:", id);
      // update local state ก่อน
      setNotifications((prev) =>
        prev.map((n) =>
          Number(n.notification_id) === Number(id) ? { ...n, is_read: true } : n
        )
      );
      // ส่งไป backend
      socket.emit("markAsRead", id);
    }
  };

  // ✅ อ่านทั้งหมด
  const handleMarkAllAsRead = () => {
    if (socket) {
      console.log("👉 Mark all as read");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      socket.emit("markAllAsRead", 999);
    }
  };

  // ✅ ลบทั้งหมด
  const handleClearAll = () => {
    if (socket) {
      console.log("👉 Clear all notifications");
      setNotifications([]); // เคลียร์ทันที
      socket.emit("clearNotifications", 999);
    }
  };

  return (
    <div className={styles.notiWrapper} ref={dropdownRef}>
      <div className={styles.bellWrapper} onClick={toggleDropdown}>
        <MdNotifications className={styles.bellIcon} size={32} />
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
                  ✔ อ่านทั้งหมด
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={handleClearAll} className={styles.clearBtn}>
                  🗑 ลบทั้งหมด
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
            <button className={styles.viewAllBtn}>🔍 ดูทั้งหมด</button>
          </div>
        </div>
      )}
    </div>
  );
}
