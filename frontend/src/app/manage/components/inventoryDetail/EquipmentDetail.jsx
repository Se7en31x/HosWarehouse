'use client';
import styles from './page.module.css';

export default function EquipmentDetail({ form = {} }) {
    const {
        equip_brand = '-',
        equip_model = '-',
        equip_price = '-',
        equip_maintenance_cycle = '-',
        equip_note = '-',
    } = form;

    return (
        <fieldset className={styles.section}>
            <legend className={styles.legend}>ครุภัณฑ์</legend>
            <div className={styles.grid}>
                <div className={styles.field}>
                    <label htmlFor="equip_brand" className={styles.label}>ยี่ห้อ</label>
                    <input
                        id="equip_brand"
                        type="text"
                        value={equip_brand}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="equip_model" className={styles.label}>รุ่น</label>
                    <input
                        id="equip_model"
                        type="text"
                        value={equip_model}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="equip_price" className={styles.label}>ราคากลาง (บาท)</label>
                    <input
                        id="equip_price"
                        type="text"
                        value={equip_price}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="equip_maintenance_cycle" className={styles.label}>รอบการบำรุงรักษา</label>
                    <input
                        id="equip_maintenance_cycle"
                        type="text"
                        value={equip_maintenance_cycle}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="equip_note" className={styles.label}>หมายเหตุ</label>
                    <textarea
                        id="equip_note"
                        value={equip_note}
                        disabled
                        className={styles.textarea}
                        aria-disabled="true"
                    />
                </div>
            </div>
        </fieldset>
    );
}
