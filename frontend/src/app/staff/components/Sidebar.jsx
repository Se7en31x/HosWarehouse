// src/app/components/Sidebar.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
} from "react-icons/fa";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hoverKey, setHoverKey] = useState(null); // สำหรับโฮเวอร์
  const pathname = usePathname();
  const headerRef = useRef(null);
  const inputRef = useRef(null);

  const theme = {
    primary600: "#008dda",
    primary400: "#41c9e2",
    hoverBg: "#ACE2E1",
    text: "#333",
    icon: "#555",
    section: "#6b7280",
    divider: "#eee",
  };

  const toggleCollapse = () => setIsCollapsed((v) => !v);

  const isActive = (path, { exact = false } = {}) => {
    const p = (pathname || "").replace(/\/+$/, "");
    const t = (path || "").replace(/\/+$/, "");
    return exact ? p === t : p === t || p.startsWith(t + "/");
  };

  // โฟกัสช่องค้นหาเมื่อเปิด
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // ปิดเมื่อคลิกนอก/กด Esc
  useEffect(() => {
    const onDown = (e) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    const onClick = (e) => {
      if (!headerRef.current) return;
      if (!headerRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("keydown", onDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    // TODO: route หรือ call API ตามต้องการ
    setSearchOpen(false);
  };

  // ───────────────────────── styles helper ─────────────────────────
  const asideStyle = {
    flexBasis: isCollapsed ? 70 : "20%",
    flexShrink: 1,
    flexGrow: 1,
    minWidth: isCollapsed ? 70 : 180,
    maxWidth: isCollapsed ? 70 : 280,
    height: "100%",
    backgroundColor: "#fff",
    color: theme.text,
    borderRadius: 12,
    boxShadow: "5px 5px 15px rgba(0,0,0,0.1)",
    transition: "all 0.3s ease-in-out",
    paddingTop: 20,
    paddingBottom: 20,
    overflow: "hidden",
    position: "relative",
  };

  const headerStyle = {
    position: "relative",
    display: "flex",
    justifyContent: isCollapsed ? "center" : "space-between",
    alignItems: "center",
    padding: "0 20px",
    marginBottom: 12,
  };

  const headerIconBtn = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 6,
  };
  const headerIcon = { fontSize: 20, color: theme.icon };

  const searchWrapper = {
    position: "relative",
    display: isCollapsed ? "none" : "block",
  };
  const searchPopover = {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: "translateY(-50%)",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "6px 8px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    zIndex: 20,
    width: 220,
  };
  const searchInput = {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 14,
    color: "#111827",
  };

  const navContainer = {
    padding: "0 12px 12px",
    overflowY: "auto",
    maxHeight: "calc(100% - 90px)",
  };
  const navLinks = { listStyleType: "none", padding: 0, marginTop: 6 };
  const dividerStyle = {
    border: "none",
    borderBottom: `1px solid ${theme.divider}`,
    margin: isCollapsed ? "4px 0" : "8px 0",
  };
  const sectionTitleStyle = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: theme.section,
    textTransform: "uppercase",
    padding: "10px 8px 4px",
    margin: "4px 0 2px",
    userSelect: "none",
    display: isCollapsed ? "none" : "list-item",
  };

  const baseItemStyle = {
    display: "flex",
    alignItems: "center",
    padding: isCollapsed ? 12 : "12px 20px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    color: theme.text,
    textDecoration: "none",
    justifyContent: isCollapsed ? "center" : "flex-start",
  };

  const activeItemStyle = {
    background: `linear-gradient(to right, ${theme.primary600}, ${theme.primary400})`,
    color: "#fff",
    fontWeight: "bold",
    boxShadow: "2px 2px 8px rgba(0,137,218,0.2)",
  };

  const hoveredItemStyle = {
    backgroundColor: theme.hoverBg,
    color: theme.primary600,
    transform: "translateX(3px)",
    boxShadow: "2px 2px 5px rgba(0,137,218,0.05)",
  };

  const linkStyle = {
    textDecoration: "none",
    color: "inherit",
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: "100%",
    justifyContent: isCollapsed ? "center" : "flex-start",
  };

  const textStyle = {
    fontSize: 16,
    fontWeight: 400,
    whiteSpace: "nowrap",
    opacity: isCollapsed ? 0 : 1,
    width: isCollapsed ? 0 : "auto",
    overflow: "hidden",
    transition: "opacity .3s ease-in-out, width .3s ease-in-out",
  };

  const iconStyle = (href) => {
    const active = isActive(href);
    const hovered = hoverKey === href;
    return {
      fontSize: 20,
      marginRight: isCollapsed ? 0 : 15,
      color: active ? "#fff" : hovered ? theme.primary600 : theme.icon,
      transition: "margin-right .3s ease-in-out, color .2s ease-in-out",
    };
  };

  const getItemStyle = (href) => {
    const active = isActive(href);
    const hovered = hoverKey === href;
    return {
      ...baseItemStyle,
      ...(active ? activeItemStyle : {}),
      ...(!active && hovered ? hoveredItemStyle : {}),
    };
  };

  const Item = ({ href, icon, label }) => (
    <li
      style={getItemStyle(href)}
      onMouseEnter={() => setHoverKey(href)}
      onMouseLeave={() => setHoverKey(null)}
    >
      <Link href={href} style={linkStyle}>
        {icon(iconStyle(href))}
        <span style={textStyle}>{label}</span>
      </Link>
    </li>
  );

  // helper render icon
  const Icon = (Comp, href) => (style) => <Comp style={style} />;

  return (
    <aside style={asideStyle}>
      <div style={headerStyle} ref={headerRef}>
        <button
          style={headerIconBtn}
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "ขยายแถบข้าง" : "ย่อแถบข้าง"}
        >
          <FaBars style={headerIcon} />
        </button>

        <div style={searchWrapper}>

          {searchOpen && (
            <form style={searchPopover} onSubmit={submitSearch}>
              <input
                ref={inputRef}
                style={searchInput}
                placeholder="ค้นหา..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setSearchOpen(false)}
              />
            </form>
          )}
        </div>
      </div>

      {/* โซนเมนูเลื่อน */}
      <nav style={navContainer}>
        <ul style={navLinks}>
          {/* ===== ทำรายการ ===== */}
          <li style={sectionTitleStyle}>ทำรายการ</li>
          <Item
            href="/staff/inventoryWithdraw"
            icon={(s) => <FaBoxOpen style={s} />}
            label="เบิก ยืม"
          />
          <Item
            href="/staff/cart"
            icon={(s) => <FaShoppingCart style={s} />}
            label="ตะกร้า"
          />

          <hr style={dividerStyle} />

          {/* ===== คำขอของฉัน ===== */}
          <li style={sectionTitleStyle}>คำขอของฉัน</li>
          <Item
            href="/staff/my-requests"
            icon={(s) => <FaListAlt style={s} />}
            label="รายการคำขอของฉัน"
          />
          <Item
            href="/staff/requestHistory"
            icon={(s) => <FaHistory style={s} />}
            label="ประวัติรายการเบิก/ยืม"
          />

          <hr style={dividerStyle} />

          {/* ===== การตั้งค่า ===== */}
          <li style={sectionTitleStyle}>การตั้งค่า</li>
          
          <Item
            href="/manage/settings"
            icon={(s) => <FaCog style={s} />}
            label="ตั้งค่า"
          />

          <li aria-hidden="true" style={{ height: 8 }} />
        </ul>
      </nav>
    </aside>
  );
}
