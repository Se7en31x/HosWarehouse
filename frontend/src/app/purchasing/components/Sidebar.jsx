'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

// Icons
import {
  FaBars, FaSearch, FaHome, FaWarehouse, FaListAlt,
  FaClipboardCheck, FaTruck, FaChartBar, FaBell, FaCog,
  FaUserFriends, FaHistory
} from 'react-icons/fa';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // ไฮไลต์เมนูเมื่ออยู่หน้าเดียวกัน หรือเป็นหน้าลูกของ path นั้น ๆ
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/');

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Header: ปุ่มย่อ/ขยาย + ค้นหา */}
      <div className={styles.sidebarHeader}>
        <button className={styles.collapseButton} onClick={toggleCollapse} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <FaBars className={styles.headerIcon} />
        </button>
        <button className={styles.searchButton} aria-label="Search">
          <FaSearch className={styles.headerIcon} />
        </button>
      </div>

      <nav>
        <ul className={styles.navLinks}>

          {/* ── Purchasing ── */}
          <li className={`${styles.sidebarItem} ${isActive('/purchasing') ? styles.active : ''}`}>
            <Link href="/purchasing" className={styles.noStyleLink}>
              <FaHome className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ภาพรวมจัดซื้อ</span>
            </Link>
          </li>

          <li className={`${styles.sidebarItem} ${isActive('/purchasing/inventory-check') ? styles.active : ''}`}>
            <Link href="/purchasing/inventory-check" className={styles.noStyleLink}>
              <FaWarehouse className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตรวจสอบสต็อก</span>
            </Link>
          </li>

          <li className={`${styles.sidebarItem} ${isActive('/purchasing/rfq') ? styles.active : ''}`}>
            <Link href="/purchasing/rfq" className={styles.noStyleLink}>
              <FaListAlt className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ใบขอราคา (RFQ)</span>
            </Link>
          </li>

          <li className={`${styles.sidebarItem} ${isActive('/purchasing/po') ? styles.active : ''}`}>
            <Link href="/purchasing/po" className={styles.noStyleLink}>
              <FaClipboardCheck className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ใบสั่งซื้อ (PO)</span>
            </Link>
          </li>

          <li className={`${styles.sidebarItem} ${isActive('/purchasing/gr/history') ? styles.active : ''}`}>
            <Link href="/purchasing/gr/history" className={styles.noStyleLink}>
              <FaHistory className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ประวัติรับของ (GR)</span>
            </Link>
          </li>

          <li className={`${styles.sidebarItem} ${isActive('/purchasing/reports') ? styles.active : ''}`}>
            <Link href="/purchasing/reports" className={styles.noStyleLink}>
              <FaChartBar className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>รายงาน</span>
            </Link>
          </li>

          <li className={`${styles.sidebarItem} ${isActive('/purchasing/suppliers') ? styles.active : ''}`}>
            <Link href="/purchasing/suppliers" className={styles.noStyleLink}>
              <FaUserFriends className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ผู้ขาย (Suppliers)</span>
            </Link>
          </li>

          <hr className={styles.divider} style={{ marginTop: '20px', marginBottom: '10px' }} />

          {/* ── อื่น ๆ ── */}
          <li className={`${styles.sidebarItem} ${isActive('/purchasing/notifications') ? styles.active : ''}`}>
            <Link href="/purchasing/notifications" className={styles.noStyleLink}>
              <FaBell className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>การแจ้งเตือน</span>
            </Link>
          </li>

          <li className={`${styles.sidebarItem} ${isActive('/purchasing/settings') ? styles.active : ''}`}>
            <Link href="/purchasing/settings" className={styles.noStyleLink}>
              <FaCog className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตั้งค่า</span>
            </Link>
          </li>

        </ul>
      </nav>
    </aside>
  );
}
