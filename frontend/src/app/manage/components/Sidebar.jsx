// src/app/components/Sidebar.jsx
"use client";

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import { FaUndo, FaTools, FaCalendarTimes, FaCaretUp, FaCaretDown } from 'react-icons/fa';
// Import icons from react-icons
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
    FaFileInvoice,
    FaHandshake,
} from 'react-icons/fa';

export default function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const navRef = useRef(null);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const isActive = (path) => {
        return pathname === path;
    };

    const handleScroll = (direction) => {
        if (navRef.current) {
            const scrollAmount = 50; // Adjust scroll speed here
            if (direction === 'up') {
                navRef.current.scrollTop -= scrollAmount;
            } else {
                navRef.current.scrollTop += scrollAmount;
            }
        }
    };

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.sidebarHeader}>
                <button className={styles.collapseButton} onClick={toggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
                    <FaBars className={styles.headerIcon} />
                </button>
                <button className={styles.searchButton}>
                    <FaSearch className={styles.headerIcon} />
                </button>
            </div>

            <nav ref={navRef} className={styles.navContainer}>
                <ul className={styles.navLinks}>
                    {/* Main Navigation Links */}
                    <li className={`${styles.sidebarItem} ${isActive('/manage') ? styles.active : ''}`}>
                        <Link href="/manage" className={styles.noStyleLink}>
                            <FaHome className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>หน้าแรก</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/inventoryCheck') ? styles.active : ''}`}>
                        <Link href="/manage/inventoryCheck" className={styles.noStyleLink}>
                            <FaBox className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบยอดคงคลัง</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/requestList') ? styles.active : ''}`}>
                        <Link href="/manage/requestList" className={styles.noStyleLink}>
                            <FaListAlt className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบคำขอเบิก</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/manageReturn') ? styles.active : ''}`}>
                        <Link href="/manage/manageReturn" className={styles.noStyleLink}>
                            <FaUndo className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการคำขอยืม</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/request-status-manager') ? styles.active : ''}`}>
                        <Link href={`/manage/request-status-manager`} className={styles.noStyleLink}>
                            <FaClipboardCheck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการสถานะคำขอ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/manageData') ? styles.active : ''}`}>
                        <Link href="/manage/manageData" className={styles.noStyleLink}>
                            <FaCogs className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการข้อมูล</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/stockDeduction') ? styles.active : ''}`}>
                        <Link href="/manage/stockDeduction" className={styles.noStyleLink}>
                            <FaWarehouse className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตัดสต็อก</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/itemReceiving') ? styles.active : ''}`}>
                        <Link href="/manage/itemReceiving" className={styles.noStyleLink}>
                            <FaTruck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>นำเข้าสินค้า</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/expired') ? styles.active : ''}`}>
                        <Link href="/manage/expired" className={styles.noStyleLink}>
                            <FaCalendarTimes className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการของหมดอายุ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/damaged') ? styles.active : ''}`}>
                        <Link href="/manage/damaged" className={styles.noStyleLink}>
                            <FaTools className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>จัดการของชำรุด</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/transactionHistory') ? styles.active : ''}`}>
                        <Link href="/manage/history" className={styles.noStyleLink}>
                            <FaHistory className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ประวัติการทำรายการ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/report') ? styles.active : ''}`}>
                        <Link href="/manage/report" className={styles.noStyleLink}>
                            <FaChartBar className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ออกรายงาน</span>
                        </Link>
                    </li>
                    <hr className={styles.divider} style={{ marginTop: '20px', marginBottom: '10px' }} />
                    <li className={styles.sidebarSectionTitle}>การจัดซื้อ</li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/request-purchase') ? styles.active : ''}`}>
                        <Link href="/manage/request-purchase" className={styles.noStyleLink}>
                            <FaShoppingCart className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>รายการสั่งซื้อใหม่</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/purchase-status') ? styles.active : ''}`}>
                        <Link href="/manage/purchase-status" className={styles.noStyleLink}>
                            <FaHistory className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>ตรวจสอบสถานะการสั่งซื้อ</span>
                        </Link>
                    </li>
                    <li className={`${styles.sidebarItem} ${isActive('/manage/goods-receipt') ? styles.active : ''}`}>
                        <Link href="/manage/goods-receipt" className={styles.noStyleLink}>
                            <FaTruck className={styles.sidebarIcon} />
                            <span className={styles.sidebarText}>นำเข้าสินค้า</span>
                        </Link>
                    </li>
                    <hr className={styles.divider} style={{ marginTop: '20px', marginBottom: '10px' }} />
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
                </ul>
            </nav>
            {/* ✅ เพิ่มปุ่มเลื่อน */}
            <div className={styles.scrollButtons}>
                <button
                    className={styles.scrollButton}
                    onClick={() => handleScroll('up')}
                    aria-label="Scroll Up"
                >
                    <FaCaretUp />
                </button>
                <button
                    className={styles.scrollButton}
                    onClick={() => handleScroll('down')}
                    aria-label="Scroll Down"
                >
                    <FaCaretDown />
                </button>
            </div>
        </aside>
    );
}