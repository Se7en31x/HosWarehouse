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
        width={70}
        height={70}
        className={styles.logo}
      />
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1>

      <div className={styles.iconGroup}>
        {/* 🔔 ปุ่มแจ้งเตือน */}
        <NotificationBell />
        {/* เพิ่ม profileWrapper เพื่อห่อหุ้ม profileText และ profileIcon */}
        <div className={styles.profileWrapper}>
          <div className={styles.profileText}>
            <span className={styles.profileName}>พงศ์เทพ ศรีสุข</span>
            <span className={styles.profileRole}>ผู้จัดการคลังคลัง</span>
          </div>
          <FaUserCircle className={styles.profileIcon} size={32} />
        </div>
      </div>
    </header>
  );
}