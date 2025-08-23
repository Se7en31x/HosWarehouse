// src/app/components/Sidebar.jsx
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import { FaUndo, FaTools, FaCalendarTimes, FaCaretUp, FaCaretDown } from "react-icons/fa";
import {
    FaHome,
    FaBox,
    FaListAlt,
    FaClipboardCheck,
    FaCogs,
    FaWarehouse,
    FaHistory,
    FaChartBar,
    FaBell,
    FaCog,
    FaTruck,
    FaBars,
    FaSearch,
    FaShoppingCart,
} from "react-icons/fa";

export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const navRef = useRef(null);

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    // ✅ active ได้ทั้ง path ตรงเป๊ะและ path ลูก (เช่น /manage/xxx/yyy)
    const isActive = (path, { exact = false } = {}) => {
        const p = (pathname || "").replace(/\/+$/, ""); // ตัด / ท้าย
        const t = (path || "").replace(/\/+$/, "");
        return exact ? p === t : (p === t || p.startsWith(t + "/"));
    };

    const handleScroll = (direction) => {
        if (!navRef.current) return;
        const scrollAmount = 80;
        navRef.current.scrollTop += direction === "up" ? -scrollAmount : scrollAmount;
    };

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
            <div className={styles.sidebarHeader}>
                <button
                    className={styles.collapseButton}
                    onClick={toggleCollapse}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <FaBars className={styles.headerIcon} />
                </button>
                <button className={styles.searchButton} aria-label="Search">
                    <FaSearch className={styles.headerIcon} />
                </button>
            </div>

            {/* ✅ โซนเลื่อน (ซ่อน scrollbar) */}
            <nav ref={navRef} className={styles.navContainer}>
                <ul className={styles.navLinks}>
                    {/* ===== ภาพรวม ===== */}
                    <li className={styles.sidebarSectionTitle}>ภาพรวม</li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage", { exact: true }) ? styles.active : ""}`}>
                        <Link href="/manage" className={styles.noStyleLink}>
                            <FaHome className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>หน้าแรก</span>
                        </Link>
                    </li>

                    <hr className={styles.divider} />

                    {/* ===== คลัง & สต็อก ===== */}
                    <li className={styles.sidebarSectionTitle}>คลัง & สต็อก</li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/inventoryCheck") ? styles.active : ""}`}>
                        <Link href="/manage/inventoryCheck" className={styles.noStyleLink}>
                            <FaBox className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบยอดคงคลัง</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/stockDeduction") ? styles.active : ""}`}>
                        <Link href="/manage/stockDeduction" className={styles.noStyleLink}>
                            <FaWarehouse className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตัดสต็อก</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/itemReceiving") ? styles.active : ""}`}>
                        <Link href="/manage/itemReceiving" className={styles.noStyleLink}>
                            <FaTruck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>นำเข้าสินค้า</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/expired") ? styles.active : ""}`}>
                        <Link href="/manage/expired" className={styles.noStyleLink}>
                            <FaCalendarTimes className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการของหมดอายุ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/damaged") ? styles.active : ""}`}>
                        <Link href="/manage/damaged" className={styles.noStyleLink}>
                            <FaTools className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการของชำรุด</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/transactionHistory') ? styles.active : ''}`}>
                        <Link href="/manage/transactionHistory" className={styles.noStyleLink}>
                            <FaHistory className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ประวัติการทำรายการ</span>
                        </Link>
                    </li>

                    <hr className={styles.divider} />

                    {/* ===== การจัดซื้อ ===== */}
                    <li className={styles.sidebarSectionTitle}>การจัดซื้อ</li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/request-purchase") ? styles.active : ""}`}>
                        <Link href="/manage/request-purchase" className={styles.noStyleLink}>
                            <FaShoppingCart className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รายการสั่งซื้อใหม่</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/purchase-status") ? styles.active : ""}`}>
                        <Link href="/manage/purchase-status" className={styles.noStyleLink}>
                            <FaHistory className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบสถานะการสั่งซื้อ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/goods-receipt") ? styles.active : ""}`}>
                        <Link href="/manage/goods-receipt" className={styles.noStyleLink}>
                            <FaTruck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รับสินค้าจากการสั่งซื้อ</span>
                        </Link>
                    </li>

                    <hr className={styles.divider} />

                    {/* ===== รายงาน & การตั้งค่า ===== */}
                    <li className={styles.sidebarSectionTitle}>รายงาน & การตั้งค่า</li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/report") ? styles.active : ""}`}>
                        <Link href="/manage/report" className={styles.noStyleLink}>
                            <FaChartBar className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ออกรายงาน</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/notifications") ? styles.active : ""}`}>
                        <Link href="/manage/notifications" className={styles.noStyleLink}>
                            <FaBell className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>การแจ้งเตือน</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/settings") ? styles.active : ""}`}>
                        <Link href="/manage/settings" className={styles.noStyleLink}>
                            <FaCog className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตั้งค่า</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/manageData") ? styles.active : ""}`}>
                        <Link href="/manage/manageData" className={styles.noStyleLink}>
                            <FaCogs className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการข้อมูล</span>
                        </Link>
                    </li>

                    {/* padding ด้านล่างกันโดนปุ่มบัง */}
                    <li aria-hidden="true" style={{ height: 16 }} />
                </ul>
            </nav>

            {/* ปุ่มเลื่อน (ยังอยู่)
            <div className={styles.scrollButtons}>
                <button className={styles.scrollButton} onClick={() => handleScroll("up")} aria-label="Scroll Up">
                    <FaCaretUp />
                </button>
                <button className={styles.scrollButton} onClick={() => handleScroll("down")} aria-label="Scroll Down">
                    <FaCaretDown />
                </button>
            </div> */}
        </aside>
    );
}
