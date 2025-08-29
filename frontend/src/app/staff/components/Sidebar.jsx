"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  ShoppingCart,
  List,
  History,
  Settings,
  Menu,
  Search,
  LogOut,
} from "lucide-react";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // For mobile
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoverKey, setHoverKey] = useState(null);
  const pathname = usePathname();
  const headerRef = useRef(null);
  const inputRef = useRef(null);

  // Toggle functions
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const toggleMobile = () => setIsOpen((prev) => !prev);

  // Check if a path is active
  const isActive = (path, { exact = false } = {}) => {
    const currentPath = (pathname || "").replace(/\/+$/, "");
    const targetPath = (path || "").replace(/\/+$/, "");
    return exact ? currentPath === targetPath : currentPath === targetPath || currentPath.startsWith(targetPath + "/");
  };

  // Focus input when search is open
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Handle escape key and outside click
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e) => {
      if (!headerRef.current?.contains(e.target)) setSearchOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle search submission
  const submitSearch = (e) => {
    e.preventDefault();
    // TODO: Implement search routing or API call
    setSearchOpen(false);
  };

  // Sidebar item component
  const Item = ({ href, icon: Icon, label }) => (
    <li
      className={`${styles.sidebarItem} ${isActive(href) ? styles.active : ""} ${hoverKey === href ? styles.sidebarItemHover : ""
        }`}
      onMouseEnter={() => setHoverKey(href)}
      onMouseLeave={() => setHoverKey(null)}
    >
      <Link href={href} className={styles.noStyleLink}>
        <Icon className={styles.sidebarIcon} />
        <span className={styles.sidebarText}>{label}</span>
      </Link>
    </li>
  );

  return (
    <aside
      className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""} ${isOpen ? styles.open : ""
        }`}
    >
      <div className={styles.sidebarHeader} ref={headerRef}>
        <button
          className={styles.collapseButton}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "ขยายแถบข้าง" : "ย่อแถบข้าง"}
        >
          <Menu className={styles.headerIcon} />
        </button>
      </div>

      <nav className={styles.navContainer}>
        <ul className={styles.navLinks}>
          <li className={styles.sidebarSectionTitle}>ทำรายการ</li>
          <Item
            href="/staff/inventoryWithdraw"
            icon={ClipboardList} // Changed to ClipboardList for "เบิก ยืม"
            label="เบิก ยืม"
          />
          <Item href="/staff/cart" icon={ShoppingCart} label="ตะกร้า" />

          <hr className={styles.divider} />

          <li className={styles.sidebarSectionTitle}>คำขอของฉัน</li>
          <Item
            href="/staff/my-requests"
            icon={List}
            label="รายการคำขอของฉัน"
          />
          <Item
            href="/staff/requestHistory"
            icon={History}
            label="ประวัติรายการเบิก/ยืม"
          />

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