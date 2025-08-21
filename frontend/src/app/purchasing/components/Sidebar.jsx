// src/app/components/Sidebar.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

import {
  FaBars,
  FaSearch,
  FaFileAlt,
  FaListAlt,
  FaClipboardCheck,
  FaHistory,
  FaShoppingCart,
  FaFileInvoice,
  FaBell,
  FaCog
} from 'react-icons/fa';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const isActive = (path) => pathname.startsWith(path);

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <button
          className={styles.collapseButton}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <FaBars className={styles.headerIcon} />
        </button>
        <button className={styles.searchButton}>
          <FaSearch className={styles.headerIcon} />
        </button>
      </div>

      <nav>
        <ul className={styles.navLinks}>
          {/* 🔹 การจัดซื้อ */}
          <li className={styles.sidebarSectionTitle}>การจัดซื้อ</li>
          <li className={`${styles.sidebarItem} ${isActive('/purchasing/pr') ? styles.active : ''}`}>
            <Link href="/purchasing/pr" className={styles.noStyleLink}>
              <FaFileAlt className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ใบขอซื้อ (PR)</span>
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
          <li className={`${styles.sidebarItem} ${isActive('/purchasing/goods-receipt') ? styles.active : ''}`}>
            <Link href="/purchasing/goods-receipt" className={styles.noStyleLink}>
              <FaShoppingCart className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>รับสินค้า (GR)</span>
            </Link>
          </li>
          <li className={`${styles.sidebarItem} ${isActive('/purchasing/goods-receipt/history') ? styles.active : ''}`}>
            <Link href="/purchasing/goods-receipt/history" className={styles.noStyleLink}>
              <FaHistory className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ประวัติรับสินค้า</span>
            </Link>
          </li>

          {/* 🔹 อื่นๆ */}
          <hr className={styles.divider} />
          <li className={styles.sidebarSectionTitle}>อื่นๆ</li>
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
