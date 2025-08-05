import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // <-- เปลี่ยนจาก 'next/router' เป็น 'next/navigation'
import styles from './Sidebar.module.css';
import axiosInstance from '../../utils/axiosInstance';

import {
  FaHome,
  Fexbox, // Please double-check if 'Fexbox' is a typo. You might mean FaBox or another icon.
  FaHandHolding,
  FaShoppingCart,
  FaListAlt,
  FaClipboardCheck,
  FaHistory,
  FaChartBar,
  FaBell,
  FaCog,
  FaUserCircle,
  FaChevronRight, // <-- Added this
  FaChevronLeft  // <-- Added this
} from 'react-icons/fa';

export default function Sidebar() {
  const [userData, setUserData] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname(); // <-- เปลี่ยนจาก router.useRouter() เป็น usePathname()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get('/profile/1');
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({
          name: 'Guest User',
          role: 'Unknown',
          img: 'https://via.placeholder.com/150',
        });
      }
    };

    fetchUserData();
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // ฟังก์ชันสำหรับตรวจสอบว่าลิงก์ปัจจุบัน active หรือไม่
  const isActive = (path) => { // เปลี่ยนชื่อ parameter เป็น path เพื่อไม่ให้สับสนกับ pathname hook
    // ตรวจสอบว่า pathname ปัจจุบันตรงกับ path ที่ส่งเข้ามา
    return pathname === path;
  };

  if (!userData) {
    return (
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.userInfo}>
          <div className={styles.skeletonUserImg}></div>
          <div className={styles.userDetails}>
            <div className={`${styles.skeletonText} ${styles.name}`}></div>
            <div className={`${styles.skeletonText} ${styles.position}`}></div>
          </div>
          <button className={styles.collapseButton} onClick={toggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        </div>
        <hr className={styles.divider} />
        <nav>
          <ul className={styles.navLinks}>
            {Array.from({ length: 11 }).map((_, index) => (
              <li key={index} className={styles.skeletonItemContainer}>
                <div className={styles.skeletonIcon}></div>
                <div className={styles.skeletonItemText}></div>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    );
  }

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.userInfo}>
        <img
          src={userData.img || 'https://s.isanook.com/ca/0/ud/284/1423051/821547.jpg?ip/resize/w728/q80/jpg'}
          alt="User Profile"
          className={styles.userImg}
        />
        <div className={styles.userDetails}>
          <p className={styles.userName}>{userData.name}</p>
          <p className={styles.userPosition}>{userData.role}</p>
        </div>
        <button className={styles.collapseButton} onClick={toggleCollapse} aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>

      <hr className={styles.divider} />

      <nav>

        <ul className={styles.navLinks}>
          {/* Main Navigation Links */}
          <li className={styles.sidebarItem}>
            <Link href="/staff" className={styles.noStyleLink}>
              <FaHome className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>หน้าแรก</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/staff/inventoryWithdraw" className={styles.noStyleLink}>
              <FaHandHolding className={styles.sidebarIcon} /> {/* Corrected usage */}
              <span className={styles.sidebarText}>เบิก ยืม</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/staff/cart" className={styles.noStyleLink}>
              <FaShoppingCart className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตะกร้า</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/staff/my-requests" className={styles.noStyleLink}>
              <FaListAlt className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>รายการคำขอของฉัน</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href={`/staff/status`} className={styles.noStyleLink}>
              <FaClipboardCheck className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ติดตามสถานะคำขอ</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/staff/history" className={styles.noStyleLink}>
              <FaHistory className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ประวัติรายการเบิก</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/staff/reports" className={styles.noStyleLink}>
              <FaChartBar className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ออกรายงาน</span>
            </Link>
          </li>

          {/* New Section for Notifications and Settings */}
          <hr className={styles.divider} style={{ marginTop: '20px', marginBottom: '10px' }} />
          <li className={styles.sidebarItem}>
            <Link href="/manage/notifications" className={styles.noStyleLink}>
              <FaBell className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>การแจ้งเตือน</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/settings" className={styles.noStyleLink}>
              <FaCog className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตั้งค่า</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}