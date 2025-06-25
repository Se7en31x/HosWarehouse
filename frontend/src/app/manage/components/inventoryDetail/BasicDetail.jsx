'use client';
import styles from './page.module.css';

export default function BasicDetail({ form = {} }) {
  const {
    item_category = '-',
    item_name = '-',
    item_sub_category = '-',
    item_location = '-',
    item_zone = '-',
    item_exp = '',
    item_qty = '-',
    item_unit = '-',
    item_min = '-',
    item_max = '-',
    item_img = null,
  } = form;

  return (
    <>
      <fieldset className={styles.section}>
        <legend>ข้อมูลทั่วไป</legend>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>หมวดหมู่หลัก</label>
            <input value={item_category || '-'} disabled />
          </div>
          <div className={styles.field}>
            <label>ชื่อพัสดุ</label>
            <input value={item_name || '-'} disabled />
          </div>
          <div className={styles.field}>
            <label>หมวดหมู่ย่อย</label>
            <input value={item_sub_category || '-'} disabled />
          </div>
          <div className={styles.field}>
            <label>ตำแหน่งจัดเก็บ</label>
            <input value={item_location || '-'} disabled />
          </div>
          <div className={styles.field}>
            <label>โซนจัดเก็บ</label>
            <input value={item_zone || '-'} disabled />
          </div>
          {item_category !== 'medicine' && (
            <div className={styles.field}>
              <label>วันหมดอายุ</label>
              <input type="date" value={item_exp ? item_exp.slice(0, 10) : ''} disabled />
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>จำนวนและหน่วย</legend>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>จำนวนคงเหลือ</label>
            <input value={item_qty || '-'} disabled />
          </div>
          <div className={styles.field}>
            <label>หน่วย</label>
            <input value={item_unit || '-'} disabled />
          </div>
          <div className={styles.field}>
            <label>จำนวนขั้นต่ำ</label>
            <input value={item_min || '-'} disabled />
          </div>
          <div className={styles.field}>
            <label>จำนวนสูงสุด</label>
            <input value={item_max || '-'} disabled />
          </div>
        </div>
      </fieldset>

      <fieldset className={styles.section}>
        <legend>รูปภาพพัสดุ</legend>
        {item_img ? (
          <div className={styles.imagePreview}>
            <img src={`http://localhost:5000/uploads/${item_img}`} alt="รูปพัสดุ" />
          </div>
        ) : (
          <p>ไม่มีรูปภาพ</p>
        )}
      </fieldset>
    </>
  );
}
