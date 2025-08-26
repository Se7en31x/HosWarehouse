'use client';

import React from 'react';
import styles from './page.module.css';

export default function MedDeviceForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>อุปกรณ์ทางการแพทย์</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="meddevice_brand" className={styles.label}>ยี่ห้อ</label>
          <input
            type="text"
            id="meddevice_brand"
            name="meddevice_brand"
            value={form.meddevice_brand ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="meddevice_model" className={styles.label}>รุ่น</label>
          <input
            type="text"
            id="meddevice_model"
            name="meddevice_model"
            value={form.meddevice_model ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="meddevice_price" className={styles.label}>ราคา (บาท)</label>
          <input
            type="number"
            step="0.01"
            id="meddevice_price"
            name="meddevice_price"
            value={form.meddevice_price ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="meddevice_note" className={styles.label}>หมายเหตุ</label>
          <textarea
            id="meddevice_note"
            name="meddevice_note"
            value={form.meddevice_note ?? ''}
            onChange={handleChange}
            className={styles.textarea}
          />
        </div>
      </div>
    </fieldset>
  );
}
