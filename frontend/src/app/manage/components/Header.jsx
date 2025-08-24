'use client';

import styles from './Header.module.css';
import Image from 'next/image';
import Link from 'next/link';               // ✅ เพิ่ม import Link
import { FaUserCircle, FaBell } from 'react-icons/fa';

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

      {/* ไอคอนอยู่ชิดขวา */}
      <div className={styles.iconGroup}>
        {/* ✅ ลิงก์ไปยังหน้าการแจ้งเตือน */}
        <Link href="/manage/notifications" passHref>
          <FaBell className={`${styles.icon} cursor-pointer`} size={24} />
        </Link>

        {/* ✅ ตัวอย่าง: ลิงก์ไปยังหน้าโปรไฟล์ผู้ใช้ */}
        <Link href="/manage/profile" passHref>
          <FaUserCircle className={`${styles.icon} cursor-pointer`} size={32} />
        </Link>
      </div>
    </header>
  );
}
