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
          <label>หมายเลขประจำเครื่อง:</label>
          <input
            type="text"
            name="equip_serial_no"
            value={form.equip_serial_no ?? ''}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.field}>
          <label>สถานะ:</label>
          <select
            name="equip_status"
            value={form.equip_status ?? ''}
            onChange={handleChange}
            required
          >
            <option value="">-- เลือกสถานะ --</option>
            <option value="ใช้งาน">ใช้งาน</option>
            <option value="ซ่อม">ซ่อม</option>
            <option value="ชำรุด">ชำรุด</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>สถานที่จัดเก็บ:</label>
          <input
            type="text"
            name="equip_location"
            value={form.equip_location ?? ''}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.field}>
          <label>ราคา:</label>
          <input
            type="number"
            step="0.01"
            name="equip_price"
            value={form.equip_price ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>วันที่จัดซื้อ:</label>
          <input
            type="date"
            name="equip_purchase_date"
            value={form.equip_purchase_date ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>วันหมดประกัน:</label>
          <input
            type="date"
            name="equip_warranty_expire"
            value={form.equip_warranty_expire ?? ''}
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
          <label>วันที่บำรุงรักษาครั้งล่าสุด:</label>
          <input
            type="date"
            name="equip_last_maintenance"
            value={form.equip_last_maintenance ?? ''}
            onChange={handleChange}
          />
        </div>
        <div className={styles.field}>
          <label>รหัส QR:</label>
          <input
            type="text"
            name="equip_qr_code"
            value={form.equip_qr_code ?? ''}
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
