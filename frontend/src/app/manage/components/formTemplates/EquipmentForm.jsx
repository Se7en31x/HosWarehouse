import React from 'react';
import styles from './page.module.css';

export default function EquipmentForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>ครุภัณฑ์</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ยี่ห้อ:</label>
          <input
            type="text"
            name="equip_brand"
            value={form.equip_brand ?? ''}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.field}>
          <label>รุ่น:</label>
          <input
            type="text"
            name="equip_model"
            value={form.equip_model ?? ''}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.field}>
          <label>ราคากลาง:</label>
          <input
            type="number"
            step="0.01"
            name="equip_price"
            value={form.equip_price ?? ''}
            onChange={handleChange}
          />
        </div>
        
        <div className={styles.field}>
          <label>รอบการบำรุงรักษา:</label>
          <input
            type="text"
            name="equip_maintenance_cycle"
            value={form.equip_maintenance_cycle ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>หมายเหตุ:</label>
          <textarea
            name="equip_note"
            value={form.equip_note ?? ''}
            onChange={handleChange}
          />
        </div>
      </div>
    </fieldset>
  );
}
