'use client';

import React from 'react';
import styles from './page.module.css';

export default function MedsupDetail({ form = {} }) {
  const {
    medsup_category = '-',
    medsup_brand = '-',
    medsup_serial_no = '-',
    medsup_status = '-',
    medsup_price = '-',
  } = form;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>เวชภัณฑ์</legend>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label>หมวดหมู่เวชภัณฑ์</label>
          <input value={medsup_category} disabled />
        </div>

        {/* หากมีชื่อเฉพาะของเวชภัณฑ์สามารถเปิดส่วนนี้ได้ */}
        {/* <div className={styles.field}>
          <label>ชื่อเวชภัณฑ์</label>
          <input value={form.medsup_name ?? '-'} disabled />
        </div> */}

        <div className={styles.field}>
          <label>ยี่ห้อ / แบรนด์</label>
          <input value={medsup_brand} disabled />
        </div>

        <div className={styles.field}>
          <label>หมายเลขซีเรียล (ถ้ามี)</label>
          <input value={medsup_serial_no} disabled />
        </div>

        <div className={styles.field}>
          <label>สถานะเวชภัณฑ์</label>
          <input value={medsup_status} disabled />
        </div>

        <div className={styles.field}>
          <label>ราคาต่อหน่วย (บาท)</label>
          <input value={medsup_price} disabled />
        </div>
      </div>
    </fieldset>
  );
}
