import styles from './Header.module.css'; // Import CSS Module

export default function Header() {
  return (
    <header className={styles.header}> {/* Use className from styles */}
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1> {/* Use className from styles */}
      {/* Notifications and Settings icons have been moved to the Sidebar */}
    </header>
  );
}