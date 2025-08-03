import styles from './Header.module.css'; // Import CSS Module
import Image from 'next/image'; // ตรวจสอบให้แน่ใจว่าได้ import Image ถูกต้อง

export default function Header() {
  return (
    <header className={styles.header}> {/* Use className from styles */}
      {/* เพิ่มโลโก้ตรงนี้ */}
      <Image
        src="/logos/logo.png" // **เปลี่ยน Path นี้ให้ตรงกับตำแหน่งไฟล์โลโก้ของคุณ**
        alt="Hospital Logo" // คำอธิบายสำหรับรูปภาพ (สำคัญสำหรับ SEO และการเข้าถึง)
        width={65} // กำหนดความกว้างของโลโก้ (ปรับตามขนาดที่ต้องการ)
        height={65} // กำหนดความสูงของโลโก้ (ปรับตามขนาดที่ต้องการ)
        className={styles.logo} // เพิ่ม className สำหรับ styling โลโก้ (ถ้ามี)
      />
      <h1 className={styles.headerTitle}>ระบบคลังโรงพยาบาล</h1> {/* Use className from styles */}
      {/* Notifications and Settings icons have been moved to the Sidebar */}
    </header>
  );
}