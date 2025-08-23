'use client';

import styles from './Header.module.css';
import Image from 'next/image';
import { FaUserCircle, FaBell } from 'react-icons/fa'; // ใช้ FaBell สำหรับกระดิ่ง

export default function Header() {
  return (
    <header className={styles.header}>
      <Image
        src="/logos/logo.png"
        alt="Hospital Logo"
        width={75}
        height={75}
        className={styles.logo}
      />
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1>

      {/* ไอคอนอยู่ชิดขวา */}
      <div className={styles.iconGroup}>
        <FaBell className={styles.icon} size={24} />
        <FaUserCircle className={styles.icon} size={32} />
      </div>
    </header>
  );
}
