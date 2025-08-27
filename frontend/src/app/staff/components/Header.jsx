'use client';

import styles from './Header.module.css';
import Image from 'next/image';
import { FaUserCircle, FaBell } from 'react-icons/fa';
import { useNotifications } from '@/app/context/NotificationContextUser';

export default function Header() {
  const { notifications = [], unreadCount = 0 } = useNotifications() || {};

  return (
    <header className={styles.header}>
      <Image
        src="/logos/logo.png"
        alt="Hospital Logo"
        width={65}
        height={65}
        className={styles.logo}
      />
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1>

      {/* ไอคอนอยู่ชิดขวา */}
      <div className={styles.iconGroup}>
        {/* 🔔 Notification */}
        <div className={styles.notiWrapper}>
          <FaBell className={styles.icon} size={24} />
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount}</span>
          )}
        </div>
          
        {/* 👤 User */}
        <div className={styles.profileWrapper}>
          <div className={styles.profileText}>
            <span className={styles.profileName}>วัชรพล อินทร์ทอง</span>
            <span className={styles.profileRole}>หมอ</span>
          </div>
          <FaUserCircle className={styles.profileIcon} size={32} />
        </div>
      </div>
    </header>
  );
}