"use client";
import styles from './Header.module.css';
import Image from 'next/image';
import { FaUserCircle } from 'react-icons/fa';
import NotificationBell from './NotificationBell';

export default function Header() {
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

      <div className={styles.iconGroup}>
        {/* 🔔 ปุ่มแจ้งเตือน */}
        <NotificationBell />

        {/* 👤 ปุ่มโปรไฟล์ */}
        <FaUserCircle className={`${styles.icon} cursor-pointer`} size={32} />

      </div>
    </header>
  );
}
