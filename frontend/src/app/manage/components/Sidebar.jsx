import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css'; // Import the CSS Module
import axiosInstance from '../../utils/axiosInstance'; // Ensure this path is correct

// Import icons from react-icons (install: npm install react-icons)
import {
  FaHome,
  FaBox,
  FaListAlt,
  FaClipboardCheck,
  FaCogs,
  FaWarehouse,
  FaHistory,
  FaChartBar,
  FaBell, // Added for Notifications
  FaCog,  // Added for Settings
  FaUserCircle,
  FaTruck // Added for Item Receiving
} from 'react-icons/fa';

export default function Sidebar() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axiosInstance.get('/profile/1');
        setUserData(response.data);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({ name: 'Guest User', role: 'Unknown', img: 'https://via.placeholder.com/150' });
      }
    };

    fetchUserData();
  }, []);

  if (!userData) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.userInfo}>
          <div className={styles.skeletonUserImg}></div>
          <div className={styles.userDetails}>
            <div className={`${styles.skeletonText} ${styles.name}`}></div>
            <div className={`${styles.skeletonText} ${styles.position}`}></div>
          </div>
        </div>
        <hr className={styles.divider} />
        <nav>
          <ul className={styles.navLinks}>
            {Array.from({ length: 9 }).map((_, index) => ( // Changed from 8 to 9 to account for the new item
              <li key={index} className={styles.skeletonItemContainer}>
                <div className={styles.skeletonIcon}></div>
                <div className={styles.skeletonItemText}></div>
              </li>
            ))}
            {/* Skeletons for new items (Notifications & Settings) */}
            <li className={styles.skeletonItemContainer}>
                <div className={styles.skeletonIcon}></div>
                <div className={styles.skeletonItemText}></div>
            </li>
            <li className={styles.skeletonItemContainer}>
                <div className={styles.skeletonIcon}></div>
                <div className={styles.skeletonItemText}></div>
            </li>
          </ul>
        </nav>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.userInfo}>
        <img
          src={userData.img || "https://s.isanook.com/ca/0/ud/284/1423051/821547.jpg?ip/resize/w728/q80/jpg"}
          alt="User Profile"
          className={styles.userImg}
        />
        <div className={styles.userDetails}>
          <p className={styles.userName}>{userData.name}</p>
          <p className={styles.userPosition}>{userData.role}</p>
        </div>
      </div>

      <hr className={styles.divider} />

      <nav>
        <ul className={styles.navLinks}>
          {/* Main Navigation Links */}
          <li className={styles.sidebarItem}>
            <Link href="/manage" className={styles.noStyleLink}>
              <FaHome className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>หน้าแรก</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/inventoryCheck" className={styles.noStyleLink}>
              <FaBox className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตรวจสอบยอดคงคลัง</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/requestList" className={styles.noStyleLink}>
              <FaListAlt className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตรวจสอบคำขอเบิก</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href={`/manage/request-status-manager`} className={styles.noStyleLink}>
              <FaClipboardCheck className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>จัดการสถานะคำขอ</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/manageData" className={styles.noStyleLink}>
              <FaCogs className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>จัดการข้อมูล</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/stockDeduction" className={styles.noStyleLink}>
              <FaWarehouse className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ตัดสต็อก</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/itemReceiving" className={styles.noStyleLink}>
              <FaTruck className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>นำเข้าสินค้า</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/transactionHistory" className={styles.noStyleLink}>
              <FaHistory className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ประวัติการนำเข้านำออก</span>
            </Link>
          </li>
          <li className={styles.sidebarItem}>
            <Link href="/manage/report" className={styles.noStyleLink}>
              <FaChartBar className={styles.sidebarIcon} />
              <span className={styles.sidebarText}>ออกรายงาน</span>
            </Link>
          </li>

          {/* New Section for Notifications and Settings */}
          {/* You might want a separate divider here or some margin to visually separate it */}
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
