import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';
import axiosInstance from '../../utils/axiosInstance';

export default function Sidebar() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    axiosInstance.get('/profile/1')
      .then((res) => setUserData(res.data))
      .catch((err) => console.error('Error fetching user data:', err));
  }, []);

  if (!userData) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.userInfo}>
        <img
          src="https://s.isanook.com/ca/0/ud/284/1423051/821547.jpg?ip/resize/w728/q80/jpg"
          alt="User Profile"
          className={styles.userImg}
        />
        <div className={styles.userDetails}>
          <p className={styles.userName}>{userData.name || 'ชื่อผู้ใช้'}</p>
          <p className={styles.userPosition}>{userData.position || 'ตำแหน่ง'}</p>
        </div>
      </div>

      <hr className={styles.divider} />

      <nav>
        <ul className={styles.navLinks}>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>🏠</span>
            <Link href="/staff" className={styles.sidebarText}>หน้าแรก</Link>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📦</span>
            <Link href="/staff/borrow" className={styles.sidebarText}>เบิก ยืม</Link>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>✅</span>
            <Link href="/staff/return" className={styles.sidebarText}>คืนพัสดุ</Link>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>🛒</span>
            <Link href="/staff/my-requests" className={styles.sidebarText}>รายการคำขอของฉัน</Link>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>⚙️</span>
            <Link href="/staff/request-purchase" className={styles.sidebarText}>ร้องขอการสั่งซื้อ</Link>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📋</span>
            <Link href="/staff/status" className={styles.sidebarText}>ติดตามสถานะคำขอ</Link>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📜</span>
            <Link href="/staff/transactionHistory" className={styles.sidebarText}>ประวัติรายการเบิก</Link>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📊</span>
            <Link href="/staff/reports" className={styles.sidebarText}>ออกรายงาน</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
