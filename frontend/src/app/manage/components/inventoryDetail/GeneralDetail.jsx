'use client';
import styles from './page.module.css';

export default function GeneralDetail({ form = {} }) {
    const {
        gen_brand = '-',
        gen_model = '-',
        gen_spec = '-',
        gen_price = '-',
    } = form;

    return (
        <fieldset className={styles.section}>
            <legend className={styles.legend}>พัสดุทั่วไป</legend>
            <div className={styles.grid}>
                <div className={styles.field}>
                    <label htmlFor="gen_brand" className={styles.label}>ยี่ห้อ</label>
                    <input
                        id="gen_brand"
                        type="text"
                        value={gen_brand}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="gen_model" className={styles.label}>รุ่น</label>
                    <input
                        id="gen_model"
                        type="text"
                        value={gen_model}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="gen_spec" className={styles.label}>สเปก/รายละเอียด</label>
                    <input
                        id="gen_spec"
                        type="text"
                        value={gen_spec}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="gen_price" className={styles.label}>ราคากลาง (บาท)</label>
                    <input
                        id="gen_price"
                        type="text"
                        value={gen_price}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
            </div>
        </fieldset>
    );
}
