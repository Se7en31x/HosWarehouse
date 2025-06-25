'use client';
import React from 'react';
import styles from './page.module.css';

export default function GeneralDetail({ form = {} }) {
  const {
    gen_brand = '-',
    gen_model = '-',
    gen_spec = '-',
    gen_price = '-',
  } = form;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>พัสดุทั่วไป</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ยี่ห้อ:</label>
          <input type="text" value={gen_brand} disabled />
        </div>
        <div className={styles.field}>
          <label>รุ่น:</label>
          <input type="text" value={gen_model} disabled />
        </div>
        <div className={styles.field}>
          <label>สเปก/รายละเอียด:</label>
          <input type="text" value={gen_spec} disabled />
        </div>
        <div className={styles.field}>
          <label>ราคา:</label>
          <input type="text" value={gen_price} disabled />
        </div>
      </div>
    </fieldset>
  );
}
