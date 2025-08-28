// src/app/components/Sidebar.jsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';

// ✅ เปลี่ยนมาใช้ Lucide React Icons
import {
    Menu,
    Search,
    FileText,
    ClipboardList,
    CheckCircle,
    Truck,
    History,
    BarChart2,
    Settings,
} from 'lucide-react';


export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const toggleCollapse = () => setIsCollapsed(!isCollapsed);

    // ✅ ปรับการตรวจสอบให้แม่นยำขึ้นสำหรับ exact match
    const isActive = (path) => {
        const normalizedPathname = pathname.replace(/\/+$/, '');
        const normalizedPath = path.replace(/\/+$/, '');
        return normalizedPathname.startsWith(normalizedPath);
    };

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            {/* Header */}
            <div className={styles.sidebarHeader}>
                <button
                    className={styles.collapseButton}
                    onClick={toggleCollapse}
                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <Menu className={styles.headerIcon} />
                </button>
            </div>

            <nav>
                <ul className={styles.navLinks}>
                    {/* 🔹 การจัดซื้อ */}
                    <li className={styles.sidebarSectionTitle}>การจัดซื้อ</li>
                    <li className={`${styles.sidebarItem} ${isActive('/purchasing/prList') ? styles.active : ''}`}>
                        <Link href="/purchasing/prList" className={styles.noStyleLink}>
                            <FileText className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รายการขอซื้อ (PR)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/purchasing/rfqList') ? styles.active : ''}`}>
                        <Link href="/purchasing/rfqList" className={styles.noStyleLink}>
                            <ClipboardList className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ใบขอราคา (RFQ)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/purchasing/poList') ? styles.active : ''}`}>
                        <Link href="/purchasing/poList" className={styles.noStyleLink}>
                            <CheckCircle className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ใบสั่งซื้อ (PO)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/purchasing/goodsReceipt') ? styles.active : ''}`}>
                        <Link href="/purchasing/goodsReceipt" className={styles.noStyleLink}>
                            <Truck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รับสินค้า (GR)</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/purchasing/historyPurchasing') ? styles.active : ''}`}>
                        <Link href="/purchasing/historyPurchasing" className={styles.noStyleLink}>
                            <History className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ประวัติการสั่งซื้อ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/purchasing/reportpo') ? styles.active : ''}`}>
                        <Link href="/purchasing/reportpo" className={styles.noStyleLink}>
                            <BarChart2 className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ออกรายการ (Report PO)</span>
                        </Link>
                    </li>

                    {/* 🔹 อื่นๆ */}
                    <hr className={styles.divider} />
                    <li className={styles.sidebarSectionTitle}>อื่นๆ</li>
                    <li className={`${styles.sidebarItem} ${isActive('/purchasing/settings') ? styles.active : ''}`}>
                        <Link href="/purchasing/settings" className={styles.noStyleLink}>
                            <Settings className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตั้งค่า</span>
                        </Link>
                    </li>
                </ul>
            </nav>
        </aside>
    );
}