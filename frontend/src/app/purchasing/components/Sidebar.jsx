"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";
import {
    Menu,
    FileText,
    ClipboardList,
    CheckCircle,
    Truck,
    History,
    BarChart2,
    Settings,
    Building2,   // ✅ ใช้ icon ร้านค้า/บริษัท
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
            {/* Header */}
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
                    {/* ===== การจัดซื้อ ===== */}
                    <li className={styles.sidebarSectionTitle}>การจัดซื้อ</li>
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/prList") ? styles.active : ""}`}>
                        <Link href="/purchasing/prList" className={styles.noStyleLink}>
                            <FileText className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รายการขอซื้อ (PR)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/rfqList") ? styles.active : ""}`}>
                        <Link href="/purchasing/rfqList" className={styles.noStyleLink}>
                            <ClipboardList className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ใบขอราคา (RFQ)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/poList") ? styles.active : ""}`}>
                        <Link href="/purchasing/poList" className={styles.noStyleLink}>
                            <CheckCircle className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ใบสั่งซื้อ (PO)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/goodsReceipt") ? styles.active : ""}`}>
                        <Link href="/purchasing/goodsReceipt" className={styles.noStyleLink}>
                            <Truck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รับสินค้า (GR)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/historyPurchasing") ? styles.active : ""}`}>
                        <Link href="/purchasing/historyPurchasing" className={styles.noStyleLink}>
                            <History className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ประวัติการสั่งซื้อ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/reportpo") ? styles.active : ""}`}>
                        <Link href="/purchasing/reportpo" className={styles.noStyleLink}>
                            <BarChart2 className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ออกรายการ (Report PO)</span>
                        </Link>
                    </li>

                    {/* ✅ เพิ่มเมนู ผู้ขาย */}
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/suppliers") ? styles.active : ""}`}>
                        <Link href="/purchasing/suppliers" className={styles.noStyleLink}>
                            <Building2 className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ผู้ขาย (Suppliers)</span>
                        </Link>
                    </li>

                    <hr className={styles.divider} />

                    {/* ===== อื่น ๆ ===== */}
                    <li className={styles.sidebarSectionTitle}>อื่น ๆ</li>
                    <li className={`${styles.sidebarItem} ${isActive("/purchasing/settings") ? styles.active : ""}`}>
                        <Link href="/purchasing/settings" className={styles.noStyleLink}>
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
