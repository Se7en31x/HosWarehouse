'use client';

import React from 'react';
import styles from './page.module.css';

export default function GeneralSupForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>พัสดุทั่วไป</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="gen_brand" className={styles.label}>ยี่ห้อ</label>
          <input
            type="text"
            id="gen_brand"
            name="gen_brand"
            value={form.gen_brand ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="gen_model" className={styles.label}>รุ่น</label>
          <input
            type="text"
            id="gen_model"
            name="gen_model"
            value={form.gen_model ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="gen_spec" className={styles.label}>สเปก/รายละเอียด</label>
          <input
            type="text"
            id="gen_spec"
            name="gen_spec"
            value={form.gen_spec ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="gen_price" className={styles.label}>ราคากลาง (บาท)</label>
          <input
            type="number"
            step="0.01"
            id="gen_price"
            name="gen_price"
            value={form.gen_price ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>
    </fieldset>
  );
}
