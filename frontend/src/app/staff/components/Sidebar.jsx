"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ShoppingCart,
  List,
  History,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Mobile
  const pathname = usePathname();
  const navRef = useRef(null);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsOpen(!isOpen);

  const isActive = (path, { exact = false } = {}) => {
    const currentPath = (pathname || "").replace(/\/+$/, "");
    const targetPath = (path || "").replace(/\/+$/, "");
    return exact
      ? currentPath === targetPath
      : currentPath === targetPath || currentPath.startsWith(targetPath + "/");
  };

  const Item = ({ href, icon: Icon, label }) => (
    <li
      className={`${styles.sidebarItem} ${
        isActive(href) ? styles.active : ""
      }`}
    >
      <Link href={href} className={styles.noStyleLink}>
        <Icon className={styles.sidebarIcon} />
        <span className={styles.sidebarText}>{label}</span>
      </Link>
    </li>
  );

  return (
    <aside
      className={`${styles.sidebar} ${
        isCollapsed ? styles.collapsed : ""
      } ${isOpen ? styles.open : ""}`}
    >
      <div className={styles.sidebarHeader}>
        <button
          className={styles.collapseButton}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className={styles.headerIcon} />
        </button>
      </div>

      <nav ref={navRef} className={styles.navContainer}>
        <ul className={styles.navLinks}>
          <li className={styles.sidebarSectionTitle}>ทำรายการ</li>
          <Item href="/staff/inventoryWithdraw" icon={ClipboardList} label="เบิก ยืม" />
          <Item href="/staff/cart" icon={ShoppingCart} label="ตะกร้า" />

          <hr className={styles.divider} />

          <li className={styles.sidebarSectionTitle}>คำขอของฉัน</li>
          <Item href="/staff/my-requests" icon={List} label="รายการคำขอของฉัน" />
          <Item href="/staff/requestHistory" icon={History} label="ประวัติรายการเบิก/ยืม" />

          <hr className={styles.divider} />

          <li className={styles.sidebarSectionTitle}>การตั้งค่า</li>
          <Item href="/manage/settings" icon={Settings} label="ตั้งค่า" />
          <Item href="/manage/settings" icon={LogOut} label="ออกจากระบบ" />

          <li aria-hidden="true" style={{ height: 8 }} />
        </ul>
      </nav>
    </aside>
  );
}
