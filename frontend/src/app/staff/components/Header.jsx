'use client';

import styles from './Header.module.css';
import Image from 'next/image';
import { CircleUser } from 'lucide-react';
import NotificationBell from './NotificationBell';


export default function Header() {

  return (
    <header className={styles.header}>
      <div className={styles.logoWrapper}>
        <Image
          src="/logos/logo.png"
          alt="Hospital Logo"
          width={65}
          height={65}
          className={styles.logo}
        />
      </div>
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1>

      {/* ไอคอนอยู่ชิดขวา */}
      <div className={styles.iconGroup}>
        {/* 🔔 Notification */}
        <NotificationBell />
        {/* 👤 User */}
        <div className={styles.profileWrapper}>
          <div className={styles.profileText}>
            <span className={styles.profileName}>วัชรพล อินทร์</span>
            <span className={styles.profileRole}>หมอ</span>
          </div>
           <div className={styles.profileImageWrapper}>
            <Image
              src="/Profiletest/หมอ.png"   // 👉 ใส่ path ของไฟล์รูปโปรไฟล์
              alt="Profile"
              width={40}
              height={40}
              className={styles.profileImage}
            />
          </div>
        </div>
      </div>

    </header>
  );
}