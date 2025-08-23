// src/app/components/Sidebar.jsx
"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

import {
  FaHome,
  FaBoxOpen,
  FaShoppingCart,
  FaListAlt,
  FaHistory,
  FaBell,
  FaCog,
  FaBars,
  FaSearch,
} from 'react-icons/fa';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pathname = usePathname();
  const headerRef = useRef(null);
  const inputRef = useRef(null);

  const toggleCollapse = () => setIsCollapsed((v) => !v);

  const isActive = (path, { exact = false } = {}) => {
    const p = (pathname || '').replace(/\/+$/, '');
    const t = (path || '').replace(/\/+$/, '');
    return exact ? p === t : (p === t || p.startsWith(t + '/'));
  };

  // โฟกัสช่องค้นหาเมื่อเปิด
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // ปิดเมื่อคลิกนอก/กด Esc
  useEffect(() => {
    const onDown = (e) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    const onClick = (e) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('keydown', onDown);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    // TODO: เปลี่ยนเป็น route หรือ call API ได้ตามต้องการ
    // ตัวอย่าง: router.push(`/search?q=${encodeURIComponent(query)}`)
    setSearchOpen(false);
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.sidebarHeader} ref={headerRef}>
        <button
          className={styles.collapseButton}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <FaBars className={styles.headerIcon} />
        </button>

        <div className={styles.searchWrapper}>
          <button
            type="button"
            className={styles.searchButton}
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <FaSearch className={styles.headerIcon} />
          </button>

          {searchOpen && (
            <form className={styles.searchPopover} onSubmit={submitSearch}>
              <input
                ref={inputRef}
                className={styles.searchInput}
                placeholder="ค้นหา..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setSearchOpen(false)}
              />
            </form>
          )}
        </div>
      </div>

      {/* โซนเมนูเลื่อน (ซ่อน scrollbar) */}
      <nav className={styles.navContainer}>
        <ul className={styles.navLinks}>
          {/* ===== ทำรายการ ===== */}
          <li className={styles.sidebarSectionTitle}>ทำรายการ</li>
          <li className={`${styles.sidebarItem} ${isActive('/staff/inventoryWithdraw') ? styles.active : ''}`}>
            <Link href="/staff/inventoryWithdraw" className={styles.noStyleLink}>
              <FaBoxOpen className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>เบิก ยืม</span>
            </Link>
          </li>
          <li className={`${styles.sidebarItem} ${isActive('/staff/cart') ? styles.active : ''}`}>
            <Link href="/staff/cart" className={styles.noStyleLink}>
              <FaShoppingCart className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตะกร้า</span>
            </Link>
          </li>

          <hr className={styles.divider} />

          {/* ===== คำขอของฉัน ===== */}
          <li className={styles.sidebarSectionTitle}>คำขอของฉัน</li>
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

          <hr className={styles.divider} />

          {/* ===== การตั้งค่า ===== */}
          <li className={styles.sidebarSectionTitle}>การตั้งค่า</li>
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

          <li aria-hidden="true" style={{ height: 8 }} />
        </ul>
      </nav>
    </aside>
  );
}
