'use client';

import React from 'react';
import styles from './page.module.css';

export default function MedsupDetail({ form = {} }) {
  const {
    medsup_brand = '-',
    medsup_price = '-',
  } = form;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>เวชภัณฑ์</legend>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ยี่ห้อ / แบรนด์</label>
          <input value={medsup_brand} disabled />
        </div>
        <div className={styles.field}>
          <label>ราคากลาง (บาท)</label>
          <input value={medsup_price} disabled />
        </div>
      </div>
    </fieldset>
  );
}
