// src/app/components/Sidebar.jsx
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import {
    Home,
    Package,
    Settings,
    Warehouse,
    History,
    BarChart,
    Truck,
    Menu,
    Search,
    ShoppingCart,
    ClipboardList,
    CheckSquare,
    Calendar,
    Wrench,
    ListChecks,
    // ✅ ไอคอนที่เพิ่มเข้ามา
    ArrowDownFromLine,
    Database,
    Clock
} from "lucide-react";


export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const navRef = useRef(null);

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    const isActive = (path, { exact = false } = {}) => {
        const p = (pathname || "").replace(/\/+$/, "");
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
                    <Menu className={styles.headerIcon} />
                </button>
                {/* <button className={styles.searchButton} aria-label="Search">
                    <Search className={styles.headerIcon} />
                </button> */}
            </div>

            <nav ref={navRef} className={styles.navContainer}>
                <ul className={styles.navLinks}>
                    {/* ===== ภาพรวม ===== */}
                    <li className={styles.sidebarSectionTitle}>ภาพรวม</li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage", { exact: true }) ? styles.active : ""}`}>
                        <Link href="/manage" className={styles.noStyleLink}>
                            <Home className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>หน้าแรก</span>
                        </Link>
                    </li>

                    <hr className={styles.divider} />

                    {/* ===== คลัง & สต็อก ===== */}
                    <li className={styles.sidebarSectionTitle}>คลัง & สต็อก</li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/inventoryCheck") ? styles.active : ""}`}>
                        <Link href="/manage/inventoryCheck" className={styles.noStyleLink}>
                            <Package className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบยอดคงคลัง</span>
                        </Link>
                    </li>

                    <li className={`${styles.sidebarItem} ${isActive("/manage/itemReceiving") ? styles.active : ""}`}>
                        <Link href="/manage/itemReceiving" className={styles.noStyleLink}>
                            {/* ✅ เปลี่ยนไอคอน */}
                            <Truck className={styles.sidebarIcon} /> 
                            <span className={styles.sidebarText}>นำเข้าทั่วไป</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/expired") ? styles.active : ""}`}>
                        <Link href="/manage/expired" className={styles.noStyleLink}>
                            <Calendar className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการของหมดอายุ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/manageData") ? styles.active : ""}`}>
                        <Link href="/manage/manageData" className={styles.noStyleLink}>
                            {/* ✅ เปลี่ยนไอคอน */}
                            <Database className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการข้อมูลสินค้า</span>
                        </Link>
                    </li>

                    {/* ===== การจัดการ ===== */}
                    <li className={styles.sidebarSectionTitle}>การดำเนินการ</li>

                    <li className={`${styles.sidebarItem} ${isActive("/manage/requestList") ? styles.active : ""}`}>
                        <Link href="/manage/requestList" className={styles.noStyleLink}>
                            <ClipboardList className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบรายการเบิก ยืม</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/request-status-manager") ? styles.active : ""}`}>
                        <Link href="/manage/request-status-manager" className={styles.noStyleLink}>
                            <CheckSquare className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการสถานะการดำเนินการ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/stockDeduction") ? styles.active : ""}`}>
                        <Link href="/manage/stockDeduction" className={styles.noStyleLink}>
                            <Warehouse className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตัดสต็อก</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/manageReturn') ? styles.active : ''}`}>
                        <Link href="/manage/manageReturn" className={styles.noStyleLink}>
                            <History className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการการคืน</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/damaged") ? styles.active : ""}`}>
                        <Link href="/manage/damaged" className={styles.noStyleLink}>
                            <Wrench className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการของชำรุด</span>
                        </Link>
                    </li>
                    <hr className={styles.divider} />

                    {/* ===== การจัดซื้อ ===== */}
                    <li className={styles.sidebarSectionTitle}>การจัดซื้อ</li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/request-purchase") ? styles.active : ""}`}>
                        <Link href="/manage/request-purchase" className={styles.noStyleLink}>
                            <ShoppingCart className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รายการสั่งซื้อใหม่</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/purchase-status") ? styles.active : ""}`}>
                        <Link href="/manage/purchase-status" className={styles.noStyleLink}>
                            {/* ✅ เปลี่ยนไอคอน */}
                            <Clock className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบสถานะการสั่งซื้อ</span>
                        </Link>
                    </li>
                    {/* <li className={`${styles.sidebarItem} ${isActive("/manage/goods-receipt") ? styles.active : ""}`}>
                        <Link href="/manage/goods-receipt" className={styles.noStyleLink}>
                            <Truck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รับสินค้าจากการสั่งซื้อ</span>
                        </Link>
                    </li> */}

                    <hr className={styles.divider} />

                    {/* ===== รายงาน & การตั้งค่า ===== */}
                    <li className={styles.sidebarSectionTitle}>อื่น ๆ </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/history') ? styles.active : ''}`}>
                        <Link href="/manage/history" className={styles.noStyleLink}>
                            <History className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ประวัติการทำรายการ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/report") ? styles.active : ""}`}>
                        <Link href="/manage/report" className={styles.noStyleLink}>
                            <BarChart className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ออกรายงาน</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/manage/settings") ? styles.active : ""}`}>
                        <Link href="/manage/settings" className={styles.noStyleLink}>
                            <Settings className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตั้งค่า</span>
                        </Link>
                    </li>

                    <li aria-hidden="true" style={{ height: 16 }} />
                </ul>
            </nav>
        </aside>
    );
}