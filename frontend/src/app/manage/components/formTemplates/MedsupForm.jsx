'use client';

import React from 'react';
import styles from './page.module.css';

export default function MedsupForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>เวชภัณฑ์</legend>

      <div className={styles.grid}>

        <div className={styles.field}>
          <label htmlFor="medsup_category">หมวดหมู่เวชภัณฑ์</label>
          <input
            id="medsup_category"
            name="medsup_category"
            value={form.medsup_category ?? ''}
            onChange={handleChange}
          />
        </div>

        {/* <div className={styles.field}>
          <label htmlFor="medsup_name">ชื่อเวชภัณฑ์</label>
          <input
            id="medsup_name"
            name="medsup_name"
            value={form.medsup_name ?? ''}
            onChange={handleChange}
          />
        </div> */}

        <div className={styles.field}>
          <label htmlFor="medsup_brand">ยี่ห้อ / แบรนด์</label>
          <input
            id="medsup_brand"
            name="medsup_brand"
            value={form.medsup_brand ?? ''}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="medsup_serial_no">หมายเลขซีเรียล (ถ้ามี)</label>
          <input
            id="medsup_serial_no"
            name="medsup_serial_no"
            value={form.medsup_serial_no ?? ''}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="medsup_status">สถานะเวชภัณฑ์</label>
          <input
            id="medsup_status"
            name="medsup_status"
            value={form.medsup_status ?? ''}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="medsup_price">ราคาต่อหน่วย (บาท)</label>
          <input
            type="number"
            step="0.01"
            id="medsup_price"
            name="medsup_price"
            value={form.medsup_price ?? ''}
            onChange={handleChange}
          />
        </div>

      </div>
    </fieldset>
  );
}
