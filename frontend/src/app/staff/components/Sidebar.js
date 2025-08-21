// src/app/components/Sidebar.jsx
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { FaUndo } from 'react-icons/fa';

import {
  FaHome,
  FaBoxOpen, // ✅ เปลี่ยนไอคอนจาก FaHandHolding เป็น FaBoxOpen
  FaShoppingCart,
  FaListAlt,
  FaClipboardCheck,
  FaHistory,
  FaChartBar,
  FaBell,
  FaCog,
  FaBars,
  FaSearch,
} from 'react-icons/fa';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const isActive = (path) => {
    return pathname === path;
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader}>
        <button className={styles.collapseButton} onClick={toggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <FaBars className={styles.headerIcon} />
        </button>
        <button className={styles.searchButton}>
          <FaSearch className={styles.headerIcon} />
        </button>
      </div>
      <nav>
        <ul className={styles.navLinks}>
          {/* <li className={`${styles.sidebarItem} ${isActive('/staff') ? styles.active : ''}`}>
            <Link href="/staff" className={styles.noStyleLink}>
              <FaHome className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>หน้าแรก</span>
            </Link>
          </li> */}
          <li className={`${styles.sidebarItem} ${isActive('/staff/inventoryWithdraw') ? styles.active : ''}`}>
            <Link href="/staff/inventoryWithdraw" className={styles.noStyleLink}>
              <FaBoxOpen className={styles.sidebarIcon} /> {/* ✅ ใช้ไอคอนใหม่ */}
              <span className={styles.sidebarText}>เบิก ยืม</span>
            </Link>
          </li>
          <li className={`${styles.sidebarItem} ${isActive('/staff/cart') ? styles.active : ''}`}>
            <Link href="/staff/cart" className={styles.noStyleLink}>
              <FaShoppingCart className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตะกร้า</span>
            </Link>
          </li>
          <li className={`${styles.sidebarItem} ${isActive('/staff/my-requests') ? styles.active : ''}`}>
            <Link href="/staff/my-requests" className={styles.noStyleLink}>
              <FaListAlt className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>รายการคำขอของฉัน</span>
            </Link>
          </li>
          <li className={`${styles.sidebarItem} ${isActive('/staff/requestHistory') ? styles.active : ''}`}>
            <Link href="/staff/requestHistory" className={styles.noStyleLink}>
              <FaHistory className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ประวัติรายการเบิก/ยืม</span>
            </Link>
          </li>
          {/* <li className={`${styles.sidebarItem} ${isActive('/staff/userReport') ? styles.active : ''}`}>
            <Link href="/staff/userReport" className={styles.noStyleLink}>
              <FaChartBar className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ออกรายงาน</span>
            </Link>
          </li> */}

          <hr className={styles.divider} style={{ marginTop: '20px', marginBottom: '10px' }} />
          
          <li className={`${styles.sidebarItem} ${isActive('/manage/notifications') ? styles.active : ''}`}>
            <Link href="/manage/notifications" className={styles.noStyleLink}>
              <FaBell className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>การแจ้งเตือน</span>
            </Link>
          </li>
          <li className={`${styles.sidebarItem} ${isActive('/manage/settings') ? styles.active : ''}`}>
            <Link href="/manage/settings" className={styles.noStyleLink}>
              <FaCog className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตั้งค่า</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}