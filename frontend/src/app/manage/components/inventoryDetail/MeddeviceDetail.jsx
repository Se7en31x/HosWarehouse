'use client';
import React from 'react';
import styles from './page.module.css';

export default function MedDeviceDetail({ form = {} }) {
  const {
    meddevice_name = '-',
    meddevice_type = '-',
    meddevice_brand = '-',
    meddevice_model = '-',
    meddevice_serial_no = '-',
    meddevice_status = '-',
    meddevice_price = '-',
    meddevice_note = '-',
  } = form;

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>อุปกรณ์ทางการแพทย์</legend>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ชื่ออุปกรณ์:</label>
          <input type="text" value={meddevice_name} disabled />
        </div>
        <div className={styles.field}>
          <label>ประเภทอุปกรณ์:</label>
          <input type="text" value={meddevice_type} disabled />
        </div>
        <div className={styles.field}>
          <label>ยี่ห้อ (Brand):</label>
          <input type="text" value={meddevice_brand} disabled />
        </div>
        <div className={styles.field}>
          <label>รุ่น (Model):</label>
          <input type="text" value={meddevice_model} disabled />
        </div>
        <div className={styles.field}>
          <label>หมายเลขเครื่อง (Serial No.):</label>
          <input type="text" value={meddevice_serial_no} disabled />
        </div>
        <div className={styles.field}>
          <label>สถานะการใช้งาน:</label>
          <input type="text" value={meddevice_status} disabled />
        </div>
        <div className={styles.field}>
          <label>ราคา (บาท):</label>
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
