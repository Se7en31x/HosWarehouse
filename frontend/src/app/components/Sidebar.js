import Link from 'next/link';
import styles from './Sidebar.module.css'; // นำเข้า CSS Module

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}> {/* ใช้ className จาก styles */}
      <div className={styles.userInfo}> {/* ใช้ className จาก styles */}
        <img src="https://s.isanook.com/ca/0/ud/284/1423051/821547.jpg?ip/resize/w728/q80/jpg" alt="User Profile" className={styles.userImg} /> {/* ใช้ className จาก styles */}
        <div className={styles.userDetails}> {/* ใช้ className จาก styles */}
          <p className={styles.userName}>ชื่อผู้ใช้งาน</p> {/* ใช้ className จาก styles */}
          <p className={styles.userPosition}>ตำแหน่ง</p> {/* ใช้ className จาก styles */}
        </div>
      </div>

      <hr className={styles.divider} /> {/* ใช้ className จาก styles */}

      <nav>
        <ul className={styles.navLinks}> {/* ใช้ className จาก styles */}
          <li className={styles.sidebarItem}> {/* ใช้ sidebarItem สำหรับเมนู */}
            <span className={styles.sidebarIcon}>🏠</span> {/* ใช้ sidebarIcon สำหรับไอคอน */}
            <span className={styles.sidebarText}><Link href="/">หน้าแรก</Link></span> {/* ใช้ sidebarText สำหรับข้อความ */}
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📦</span>
            <span className={styles.sidebarText}><Link href="/inventoryCheck">ตรวจสอบยอดคงคลัง</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>✅</span>
            <span className={styles.sidebarText}><Link href="/approvalRequest">ตรวจสอบคำขอเบิก</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>⚙️</span>
            <span className={styles.sidebarText}><Link href="/manageData">จัดการข้อมูล</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📜</span>
            <span className={styles.sidebarText}><Link href="/transactionHistory">ประวัติการนำเข้านำออก</Link></span>
          </li>
          <li className={styles.sidebarItem}>
            <span className={styles.sidebarIcon}>📊</span>
            <span className={styles.sidebarText}><Link href="/report">ออกรายงาน</Link></span>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
