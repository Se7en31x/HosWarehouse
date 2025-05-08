import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css'; // นำเข้า CSS Module
import axiosInstance from '../utils/axiosInstance';

export default function Sidebar() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    // ดึงข้อมูลผู้ใช้งานจาก API
    axiosInstance.get('/profile/1')  // เปลี่ยนเป็น API ที่คุณใช้
      .then((response) => {
        setUserData(response.data);  // เก็บข้อมูลใน state
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
      });
  }, []);

  if (!userData) {
    return <div>Loading...</div>;  // หากยังไม่ได้ข้อมูลแสดงข้อความ Loading
  }

  return (
    <aside className={styles.sidebar}> {/* ใช้ className จาก styles */}
      <div className={styles.userInfo}> {/* ใช้ className จาก styles */}
        <img src="https://s.isanook.com/ca/0/ud/284/1423051/821547.jpg?ip/resize/w728/q80/jpg" alt="User Profile" className={styles.userImg} /> {/* ใช้ className จาก styles */}
        <div className={styles.userDetails}> {/* ใช้ className จาก styles */}
          <p className={styles.userName}> {userData.name} </p> {/* ใช้ className จาก styles */}
          <p className={styles.userPosition}> {userData.role} </p> {/* ใช้ className จาก styles */}
        </div>
      </div>

      <hr className={styles.divider} /> {/* ใช้ className จาก styles */}

      <nav>
        <ul className={styles.navLinks}> {/* ใช้ className จาก styles */}
          <li className={styles.sidebarItem}> {/* ใช้ sidebarItem สำหรับเมนู */}
            <span className={styles.sidebarIcon}>🏠</span> {/* ใช้ sidebarIcon สำหรับไอคอน */}
            <span className={styles.sidebarText}><Link href="/manage">หน้าแรก</Link></span> {/* ใช้ sidebarText สำหรับข้อความ */}
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📦</span>
            <span className={styles.sidebarText}><Link href="/manage/inventoryCheck">ตรวจสอบยอดคงคลัง</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>✅</span>
            <span className={styles.sidebarText}><Link href="/manage/approvalRequest">ตรวจสอบคำขอเบิก</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>⚙️</span>
            <span className={styles.sidebarText}><Link href="/manage/manageData">จัดการข้อมูล</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📜</span>
            <span className={styles.sidebarText}><Link href="/manage/transactionHistory">ประวัติการนำเข้านำออก</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📊</span>
            <span className={styles.sidebarText}><Link href="/manage/report">ออกรายงาน</Link></span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
