import styles from './Header.module.css';  // นำเข้า CSS Module
import Image from 'next/image';
import Link from 'next/link'; // นำเข้า Link จาก Next.js

export default function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1>
      <div className={styles.headerIcons}>
        <Link href="/staff/SelectedItem"> {/* ลิงก์ไปยังหน้า SelectedItem */}
        <button className={styles.iconButton}>
          <Image
            src="/icons/shopping-cart (1).png"
            alt="ตะกร้า"
            width={24}
            height={24}
          />
        </button>
      </Link>
        <button className={styles.iconButton}>🔔</button>
        <button className={styles.iconButton}>⚙️</button>
      </div>
    </header>
  );
}