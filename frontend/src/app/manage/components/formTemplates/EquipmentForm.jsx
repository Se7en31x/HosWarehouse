'use client';

import React from 'react';
import styles from './page.module.css';

export default function EquipmentForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>ครุภัณฑ์</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="equip_brand" className={styles.label}>ยี่ห้อ</label>
          <input
            type="text"
            id="equip_brand"
            name="equip_brand"
            value={form.equip_brand ?? ''}
            onChange={handleChange}
            className={styles.input}
            required
            aria-required="true"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="equip_model" className={styles.label}>รุ่น</label>
          <input
            type="text"
            id="equip_model"
            name="equip_model"
            value={form.equip_model ?? ''}
            onChange={handleChange}
            className={styles.input}
            required
            aria-required="true"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="equip_price" className={styles.label}>ราคากลาง (บาท)</label>
          <input
            type="number"
            step="0.01"
            id="equip_price"
            name="equip_price"
            value={form.equip_price ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="equip_maintenance_cycle" className={styles.label}>รอบการบำรุงรักษา</label>
          <input
            type="text"
            id="equip_maintenance_cycle"
            name="equip_maintenance_cycle"
            value={form.equip_maintenance_cycle ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="equip_note" className={styles.label}>หมายเหตุ</label>
          <textarea
            id="equip_note"
            name="equip_note"
            value={form.equip_note ?? ''}
            onChange={handleChange}
            className={styles.textarea}
          />
        </div>
      </div>
    </fieldset>
  );
}
