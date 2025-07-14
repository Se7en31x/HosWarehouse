'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './page.module.css';
import Swal from 'sweetalert2'; // Import Swal for alerts

export default function UserDashboard() {
  const router = useRouter();

  // Clear actionType from localStorage on component mount
  useEffect(() => {
    localStorage.removeItem('actionType');
  }, []);

  const handleActionClick = (action) => {
    if (action === 'withdraw' || action === 'borrow') {
      localStorage.setItem('actionType', action);
      router.push('/staff/inventory'); // Navigate to inventory page for withdraw/borrow
    } else if (action === 'return') {
      // For 'return', we'll navigate to a dedicated return page
      router.push('/staff/return'); // Navigate to a new return page (will create a placeholder for this)
    } else {
      Swal.fire({
        icon: 'info',
        title: 'การดำเนินการไม่ถูกต้อง',
        text: 'ไม่สามารถดำเนินการได้ โปรดลองใหม่อีกครั้ง',
      });
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>เลือกประเภทการทำรายการ</h1>
      <div className={styles.actionsGrid}>
        <button
          className={`${styles.actionButton} ${styles.withdrawButton}`}
          onClick={() => handleActionClick('withdraw')}
        >
          <span className={styles.icon}>📦</span>
          <span className={styles.buttonText}>เบิกสินค้า</span>
        </button>

        <button
          className={`${styles.actionButton} ${styles.borrowButton}`}
          onClick={() => handleActionClick('borrow')}
        >
          <span className={styles.icon}>🤝</span>
          <span className={styles.buttonText}>ยืมสินค้า</span>
        </button>

        <button
          className={`${styles.actionButton} ${styles.returnButton}`}
          onClick={() => handleActionClick('return')}
        >
          <span className={styles.icon}>↩️</span>
          <span className={styles.buttonText}>คืนสินค้า</span>
        </button>
      </div>
    </div>
  );
}
