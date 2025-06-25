import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css'; // นำเข้า CSS Module
import axiosInstance from '../utils/axiosInstance';

export default function Sidebar() {
  // const [userData, setUserData] = useState(null);

  // useEffect(() => {
  //   // ดึงข้อมูลผู้ใช้งานจาก API
  //   axiosInstance.get('/profile/1')  // เปลี่ยนเป็น API ที่คุณใช้
  //     .then((response) => {
  //       setUserData(response.data);  // เก็บข้อมูลใน state
  //     })
  //     .catch((error) => {
  //       console.error('Error fetching user data:', error);
  //     });
  // }, []);

  // if (!userData) {
  //   return <div>Loading...</div>;  // หากยังไม่ได้ข้อมูลแสดงข้อความ Loading
  // }

  return (
    <aside className={styles.sidebar}> {/* ใช้ className จาก styles */}
      <div className={styles.userInfo}> {/* ใช้ className จาก styles */}
        <img src="https://s.isanook.com/ca/0/ud/284/1423051/821547.jpg?ip/resize/w728/q80/jpg" alt="User Profile" className={styles.userImg} /> {/* ใช้ className จาก styles */}
        <div className={styles.userDetails}> {/* ใช้ className จาก styles */}
          <p className={styles.userName}> </p> {/* ใช้ className จาก styles */}
          <p className={styles.userPosition}>  </p> {/* ใช้ className จาก styles */}
        </div>
      </div>

      <hr className={styles.divider} /> {/* ใช้ className จาก styles */}

      <nav>
        <ul className={styles.navLinks}>
          {/* {<li className={styles.sidebarItem}> 
            <span className={styles.sidebarIcon}>🏠</span> 
            <span className={styles.sidebarText}><Link href="/staff">หน้าแรก</Link></span> 
          </li>} */}
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>🏠</span>
            <span className={styles.sidebarText}><Link href="/staff">หน้าแรก</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📦</span>
            <span className={styles.sidebarText}><Link href="/staff">เบิก ยืม</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>✅</span>
            <span className={styles.sidebarText}><Link href="/staff">คืนพัสดุ</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>⚙️</span>
            <span className={styles.sidebarText}><Link href="/staff">ร้องขอการสั่งซื้อ</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>⚙️</span>
            <span className={styles.sidebarText}><Link href="/staff/status">ติดตามสถานะคำขอ</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📜</span>
            <span className={styles.sidebarText}><Link href="/staff/transactionHistory">ประวัติรายการเบิก</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📊</span>
            <span className={styles.sidebarText}><Link href="/staff">ออกรายงาน</Link></span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
