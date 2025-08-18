import React from 'react';
import styles from './page.module.css'; // ใช้ CSS Module

export default function MedDeviceForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>อุปกรณ์ทางการแพทย์</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ยี่ห้อ (Brand):</label>
          <input
            type="text"
            name="meddevice_brand"
            value={form.meddevice_brand ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>รุ่น (Model):</label>
          <input
            type="text"
            name="meddevice_model"
            value={form.meddevice_model ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>ราคา (บาท):</label>
          <input
            type="number"
            step="0.01"
            name="meddevice_price"
            value={form.meddevice_price ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>หมายเหตุ:</label>
          <textarea
            name="meddevice_note"
            value={form.meddevice_note ?? ''}
            onChange={handleChange}
          />
        </div>
      </div>
    </fieldset>
  );
}
