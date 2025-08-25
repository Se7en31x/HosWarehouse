"use client";
import { useEffect, useState } from "react";
import { Bell, Check, Clock } from "lucide-react";
import { connectSocket, disconnectSocket, joinUserRoom } from "../../utils/socket";
import styles from "./page.module.css";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const userId = 8; // TODO: ดึงจาก session หรือ auth context

  useEffect(() => {
    // ✅ เชื่อม socket
    connectSocket(null, (newNoti) => {
      setNotifications((prev) => [newNoti, ...prev]);
    });

    joinUserRoom(userId);

    return () => disconnectSocket();
  }, [userId]);

  // ✅ ทำเครื่องหมายว่าอ่านแล้ว
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === id ? { ...n, is_read: true } : n
      )
    );
  };

  // ✅ ทำทั้งหมดว่าอ่านแล้ว
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  // ✅ ฟิลเตอร์
  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("th-TH");
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Bell size={22} className={styles.bell} />
          <div>
            <h2 className={styles.title}>การแจ้งเตือน</h2>
            <p className={styles.subtitle}>
              ทั้งหมด {notifications.length} รายการ{" "}
              {unreadCount > 0 && `• ${unreadCount} รายการใหม่`}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAll} onClick={markAllAsRead}>
            <Check size={16} /> ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={filter === "all" ? styles.active : ""}
          onClick={() => setFilter("all")}
        >
          ทั้งหมด ({notifications.length})
        </button>
        <button
          className={filter === "unread" ? styles.active : ""}
          onClick={() => setFilter("unread")}
        >
          ยังไม่อ่าน ({unreadCount})
        </button>
        <button
          className={filter === "read" ? styles.active : ""}
          onClick={() => setFilter("read")}
        >
          อ่านแล้ว ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Content */}
      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>ไม่มีการแจ้งเตือน</div>
        ) : (
          filtered.map((n) => (
            <div
              key={n.notification_id}
              className={`${styles.item} ${n.is_read ? styles.read : styles.unread}`}
              onClick={() => !n.is_read && markAsRead(n.notification_id)}
            >
              <div className={styles.info}>
                <h3>{n.title}</h3>
                <p>{n.message}</p>
              </div>
              <div className={styles.meta}>
                {!n.is_read && <span className={styles.new}>ใหม่</span>}
                <span className={styles.time}>
                  <Clock size={12} /> {formatDate(n.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
