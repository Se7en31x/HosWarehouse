'use client';

import React from 'react';
import styles from './page.module.css';

export default function MedsupForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>เวชภัณฑ์</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="medsup_brand" className={styles.label}>ยี่ห้อ / แบรนด์</label>
          <input
            id="medsup_brand"
            name="medsup_brand"
            value={form.medsup_brand ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="medsup_price" className={styles.label}>ราคาต่อหน่วย (บาท)</label>
          <input
            type="number"
            step="0.01"
            id="medsup_price"
            name="medsup_price"
            value={form.medsup_price ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>
    </fieldset>
  );
}
