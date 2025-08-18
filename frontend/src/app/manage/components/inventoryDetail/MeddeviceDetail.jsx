'use client';
import React from 'react';
import styles from './page.module.css';

export default function MedDeviceDetail({ form = {} }) {
  const {
    meddevice_brand = '-',
    meddevice_model = '-',
    meddevice_price = '-',
    meddevice_note = '-',
  } = form;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>อุปกรณ์ทางการแพทย์</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ยี่ห้อ (Brand):</label>
          <input type="text" value={meddevice_brand} disabled />
        </div>
        <div className={styles.field}>
          <label>รุ่น (Model):</label>
          <input type="text" value={meddevice_model} disabled />
        </div>
        <div className={styles.field}>
          <label>ราคากลาง (บาท):</label>
          <input type="text" value={meddevice_price} disabled />
        </div>
        <div className={styles.field}>
          <label>หมายเหตุ:</label>
          <textarea value={meddevice_note} disabled />
        </div>
      </div>
    </fieldset>
  );
}
