import styles from './Header.module.css';  // นำเข้า CSS Module

export default function Header() {
  return (
    <header className={styles.header}> {/* ใช้ className จาก styles */}
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1> {/* ใช้ className จาก styles */}
      <div className={styles.headerIcons}> {/* ใช้ className จาก styles */}
        <button className={styles.iconButton}>🔔</button> {/* ไอคอนแจ้งเตือน */}
        <button className={styles.iconButton}>⚙️</button> {/* ไอคอนตั้งค่า */}
      </div>
    </header>
  );
}
