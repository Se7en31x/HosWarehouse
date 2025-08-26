'use client';
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
                    <label htmlFor="meddevice_brand" className={styles.label}>ยี่ห้อ</label>
                    <input
                        id="meddevice_brand"
                        type="text"
                        value={meddevice_brand}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="meddevice_model" className={styles.label}>รุ่น</label>
                    <input
                        id="meddevice_model"
                        type="text"
                        value={meddevice_model}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="meddevice_price" className={styles.label}>ราคากลาง (บาท)</label>
                    <input
                        id="meddevice_price"
                        type="text"
                        value={meddevice_price}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="meddevice_note" className={styles.label}>หมายเหตุ</label>
                    <textarea
                        id="meddevice_note"
                        value={meddevice_note}
                        disabled
                        className={styles.textarea}
                        aria-disabled="true"
                    />
                </div>
            </div>
        </fieldset>
    );
}
