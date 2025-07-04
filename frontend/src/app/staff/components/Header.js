import styles from './Header.module.css';  // นำเข้า CSS Module
import Image from 'next/image';
import Link from 'next/link'; // นำเข้า Link จาก Next.js

export default function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1>
      <div className={styles.headerIcons}>
        {/* ลิงก์ไปยังหน้าตะกร้า */}
        <Link href="/staff/cart" className={styles.iconButtonLink}>
          <Image
            src="/icons/shopping-cart (1).png"
            alt="ตะกร้า"
            width={24}
            height={24}
          />
        </Link>
        {/* <Link href="/staff/SelectedItem" className={styles.iconButtonLink}>
          <Image
            src="/icons/shopping-cart (1).png"
            alt="ตะกร้า"
            width={24}
            height={24}
          />
        </Link> */}

        {/* ไอคอนแจ้งเตือน */}
        <button className={styles.iconButton}>🔔</button>
        {/* ไอคอนตั้งค่า */}
        <button className={styles.iconButton}>⚙️</button>
      </div>
    </header>
  );
}
