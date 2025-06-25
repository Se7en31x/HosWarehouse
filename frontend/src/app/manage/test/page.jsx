'use client';

import styles from './page.module.css';

export default function CategoryPage({ onSelect }) {
  // onSelect จะรับเป็น props หรือคุณจะใช้ router ไปหน้าอื่นก็ได้

  return (
    <div className={styles.pageWrapper}>
      <h1 className={styles.pageTitle}>เลือกประเภทพัสดุ</h1>
      <p className={styles.pageDescription}>กรุณาเลือกประเภทพัสดุที่ต้องการจัดการ</p>

      <div className={styles['category-select-container']}>
        <button
          className={styles['category-button']}
          onClick={() => onSelect('ยาเวชภัณฑ์')}
          type="button"
          aria-label="เลือกประเภท ยา"
        >
          ยา
        </button>

        <button
          className={styles['category-button']}
          onClick={() => onSelect('เวชภัณฑ์')}
          type="button"
          aria-label="เลือกประเภท เวชภัณฑ์"
        >
          เวชภัณฑ์
        </button>

        <button
          className={styles['category-button']}
          onClick={() => onSelect('ครุภัณฑ์')}
          type="button"
          aria-label="เลือกประเภท ครุภัณฑ์"
        >
          ครุภัณฑ์
        </button>

        <button
          className={styles['category-button']}
          onClick={() => onSelect('อุปกรณ์ทางการแพทย์')}
          type="button"
          aria-label="เลือกประเภท อุปกรณ์ทางการแพทย์"
        >
          อุปกรณ์ทางการแพทย์
        </button>

        <button
          className={styles['category-button']}
          onClick={() => onSelect('ของใช้ทั่วไป')}
          type="button"
          aria-label="เลือกประเภท ของใช้ทั่วไป"
        >
          ของใช้ทั่วไป
        </button>
      </div>
    </div>
  );
}
