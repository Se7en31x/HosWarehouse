'use client';
import React from 'react';
import styles from './page.module.css';

export default function MedicineDetail({ form = {} }) {
  const {
    med_generic_name = '-',
    med_thai_name = '-',
    med_marketing_name = '-',
    med_counting_unit = '-',
    med_dosage_form = '-',
    med_medical_category = '-',
    med_medium_price = '-',
    med_tmt_code = '-',
    med_tpu_code = '-',
    med_tmt_gp_name = '-',
    med_tmt_tp_name = '-',
    med_severity = '-',
    med_essential_med_list = '-',
    med_pregnancy_cagetory = '-',
    med_dose_dialogue = '-',
    med_replacement = '-',
  } = form;

  // ฟังก์ชันช่วยเช็ควันที่ให้แสดงค่าว่างถ้าค่าไม่เหมาะสม
  const validDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return isNaN(d.getTime()) ? '' : date.slice(0, 10); // ตัดเวลาออก เหลือ yyyy-mm-dd
  };

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>ยา</legend>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label>ชื่อสามัญ (Generic)</label>
          <input value={med_generic_name} disabled />
        </div>

        <div className={styles.field}>
          <label>ชื่อภาษาไทย</label>
          <input value={med_thai_name} disabled />
        </div>

        <div className={styles.field}>
          <label>ชื่อการค้า (Brand)</label>
          <input value={med_marketing_name} disabled />
        </div>

        <div className={styles.field}>
          <label>หน่วยนับ (Tablet / Vial)</label>
          <input value={med_counting_unit} disabled />
        </div>

        <div className={styles.field}>
          <label>รูปแบบยา (Dosage form)</label>
          <input value={med_dosage_form} disabled />
        </div>

        <div className={styles.field}>
          <label>หมวดทางการแพทย์</label>
          <input value={med_medical_category} disabled />
        </div>
        <div className={styles.field}>
          <label>ราคากลาง (บาท)</label>
          <input value={med_medium_price} disabled />
        </div>

        <div className={styles.field}>
          <label>รหัส TMT</label>
          <input value={med_tmt_code} disabled />
        </div>

        <div className={styles.field}>
          <label>รหัส TPU</label>
          <input value={med_tpu_code} disabled />
        </div>

        <div className={styles.field}>
          <label>TMT GP Name</label>
          <input value={med_tmt_gp_name} disabled />
        </div>

        <div className={styles.field}>
          <label>TMT TP Name</label>
          <input value={med_tmt_tp_name} disabled />
        </div>

        <div className={styles.field}>
          <label>ระดับความรุนแรง</label>
          <input value={med_severity} disabled />
        </div>

        <div className={styles.field}>
          <label>ยาหลัก (บัญชียาหลัก)</label>
          <input value={med_essential_med_list} disabled />
        </div>

        <div className={styles.field}>
          <label>หมวดหญิงตั้งครรภ์</label>
          <input value={med_pregnancy_cagetory} disabled />
        </div>

        <div className={styles.field}>
          <label>วิธีใช้ / คำแนะนำ</label>
          <textarea value={med_dose_dialogue} disabled readOnly />
        </div>

        <div className={styles.field}>
          <label>ยาทดแทน (ถ้ามี)</label>
          <input value={med_replacement} disabled />
        </div>
      </div>
    </fieldset>
  );
}
