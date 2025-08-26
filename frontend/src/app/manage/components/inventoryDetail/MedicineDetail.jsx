'use client';
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
        med_pregnancy_category = '-',
        med_dose_dialogue = '-',
        med_replacement = '-',
    } = form;

    return (
        <fieldset className={styles.section}>
            <legend className={styles.legend}>ยา</legend>
            <div className={styles.grid}>
                <div className={styles.field}>
                    <label htmlFor="med_generic_name" className={styles.label}>ชื่อสามัญ (Generic)</label>
                    <input
                        id="med_generic_name"
                        value={med_generic_name}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_thai_name" className={styles.label}>ชื่อภาษาไทย</label>
                    <input
                        id="med_thai_name"
                        value={med_thai_name}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_marketing_name" className={styles.label}>ชื่อการค้า (Brand)</label>
                    <input
                        id="med_marketing_name"
                        value={med_marketing_name}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_counting_unit" className={styles.label}>หน่วยนับ (Tablet / Vial)</label>
                    <input
                        id="med_counting_unit"
                        value={med_counting_unit}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_dosage_form" className={styles.label}>รูปแบบยา (Dosage form)</label>
                    <input
                        id="med_dosage_form"
                        value={med_dosage_form}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_medical_category" className={styles.label}>หมวดทางการแพทย์</label>
                    <input
                        id="med_medical_category"
                        value={med_medical_category}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_medium_price" className={styles.label}>ราคากลาง (บาท)</label>
                    <input
                        id="med_medium_price"
                        value={med_medium_price}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_tmt_code" className={styles.label}>รหัส TMT</label>
                    <input
                        id="med_tmt_code"
                        value={med_tmt_code}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_tpu_code" className={styles.label}>รหัส TPU</label>
                    <input
                        id="med_tpu_code"
                        value={med_tpu_code}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_tmt_gp_name" className={styles.label}>TMT GP Name</label>
                    <input
                        id="med_tmt_gp_name"
                        value={med_tmt_gp_name}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_tmt_tp_name" className={styles.label}>TMT TP Name</label>
                    <input
                        id="med_tmt_tp_name"
                        value={med_tmt_tp_name}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_severity" className={styles.label}>ระดับความรุนแรง</label>
                    <input
                        id="med_severity"
                        value={med_severity}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_essential_med_list" className={styles.label}>ยาหลัก (บัญชียาหลัก)</label>
                    <input
                        id="med_essential_med_list"
                        value={med_essential_med_list}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_pregnancy_category" className={styles.label}>หมวดหญิงตั้งครรภ์</label>
                    <input
                        id="med_pregnancy_category"
                        value={med_pregnancy_category}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_dose_dialogue" className={styles.label}>วิธีใช้ / คำแนะนำ</label>
                    <textarea
                        id="med_dose_dialogue"
                        value={med_dose_dialogue}
                        disabled
                        className={styles.textarea}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="med_replacement" className={styles.label}>ยาทดแทน (ถ้ามี)</label>
                    <input
                        id="med_replacement"
                        value={med_replacement}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
            </div>
        </fieldset>
    );
}
