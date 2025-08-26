'use client';

import React from 'react';
import styles from './page.module.css';

export default function MedicineForm({ form, handleChange }) {
  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>ยา</legend>
      <div className={styles.grid}>
        {/* General Information */}
        <div className={styles.field}>
          <label htmlFor="med_generic_name" className={styles.label}>ชื่อสามัญ (Generic)</label>
          <input
            id="med_generic_name"
            name="med_generic_name"
            value={form.med_generic_name ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_thai_name" className={styles.label}>ชื่อภาษาไทย</label>
          <input
            id="med_thai_name"
            name="med_thai_name"
            value={form.med_thai_name ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_marketing_name" className={styles.label}>ชื่อการค้า (Brand)</label>
          <input
            id="med_marketing_name"
            name="med_marketing_name"
            value={form.med_marketing_name ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_counting_unit" className={styles.label}>หน่วยนับ (เช่น Tablet / Vial)</label>
          <input
            id="med_counting_unit"
            name="med_counting_unit"
            value={form.med_counting_unit ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_dosage_form" className={styles.label}>รูปแบบยา (Dosage form)</label>
          <input
            id="med_dosage_form"
            name="med_dosage_form"
            value={form.med_dosage_form ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_medical_category" className={styles.label}>หมวดทางการแพทย์</label>
          <input
            id="med_medical_category"
            name="med_medical_category"
            value={form.med_medical_category ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        {/* Price */}
        <div className={styles.field}>
          <label htmlFor="med_medium_price" className={styles.label}>ราคากลาง (บาท)</label>
          <input
            type="number"
            step="0.01"
            id="med_medium_price"
            name="med_medium_price"
            value={form.med_medium_price ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        {/* Standard Codes */}
        <div className={styles.field}>
          <label htmlFor="med_tmt_code" className={styles.label}>รหัส TMT</label>
          <input
            id="med_tmt_code"
            name="med_tmt_code"
            value={form.med_tmt_code ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_tpu_code" className={styles.label}>รหัส TPU</label>
          <input
            id="med_tpu_code"
            name="med_tpu_code"
            value={form.med_tpu_code ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_tmt_gp_name" className={styles.label}>TMT GP Name</label>
          <input
            id="med_tmt_gp_name"
            name="med_tmt_gp_name"
            value={form.med_tmt_gp_name ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_tmt_tp_name" className={styles.label}>TMT TP Name</label>
          <input
            id="med_tmt_tp_name"
            name="med_tmt_tp_name"
            value={form.med_tmt_tp_name ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        {/* Status and Quantity */}
        <div className={styles.field}>
          <label htmlFor="med_severity" className={styles.label}>ระดับความรุนแรง (เช่น Mild/Severe)</label>
          <input
            id="med_severity"
            name="med_severity"
            value={form.med_severity ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_essential_med_list" className={styles.label}>ยาหลัก (บัญชียาหลัก)</label>
          <select
            id="med_essential_med_list"
            name="med_essential_med_list"
            value={form.med_essential_med_list ?? ''}
            onChange={handleChange}
            className={styles.input}
          >
            <option value="">-- เลือก --</option>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="med_pregnancy_cagetory" className={styles.label}>หมวดหญิงตั้งครรภ์</label>
          <input
            id="med_pregnancy_cagetory"
            name="med_pregnancy_cagetory"
            value={form.med_pregnancy_cagetory ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
        {/* Others */}
        <div className={styles.field}>
          <label htmlFor="med_dose_dialogue" className={styles.label}>วิธีใช้ / คำแนะนำ</label>
          <textarea
            id="med_dose_dialogue"
            name="med_dose_dialogue"
            value={form.med_dose_dialogue ?? ''}
            onChange={handleChange}
            className={styles.textarea}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="med_replacement" className={styles.label}>ยาทดแทน (ถ้ามี)</label>
          <input
            id="med_replacement"
            name="med_replacement"
            value={form.med_replacement ?? ''}
            onChange={handleChange}
            className={styles.input}
          />
        </div>
      </div>
    </fieldset>
  );
}
