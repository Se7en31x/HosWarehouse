import React from 'react';
import styles from './page.module.css';

export default function GeneralSupForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>พัสดุทั่วไป</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ยี่ห้อ:</label>
          <input
            type="text"
            name="gen_brand"
            value={form.gen_brand ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>รุ่น:</label>
          <input
            type="text"
            name="gen_model"
            value={form.gen_model ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>สเปก/รายละเอียด:</label>
          <input
            type="text"
            name="gen_spec"
            value={form.gen_spec ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>ราคากลาง:</label>
          <input
            type="number"
            step="0.01"
            name="gen_price"
            value={form.gen_price ?? ''}
            onChange={handleChange}
          />
        </div>
      </div>
    </fieldset>
  );
}
