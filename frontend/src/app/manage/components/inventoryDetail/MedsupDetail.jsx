'use client';
import styles from './page.module.css';

export default function MedsupDetail({ form = {} }) {
    const {
        medsup_brand = '-',
        medsup_price = '-',
    } = form;

    return (
        <fieldset className={styles.section}>
            <legend className={styles.legend}>เวชภัณฑ์</legend>
            <div className={styles.grid}>
                <div className={styles.field}>
                    <label htmlFor="medsup_brand" className={styles.label}>ยี่ห้อ / แบรนด์</label>
                    <input
                        id="medsup_brand"
                        value={medsup_brand}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
                <div className={styles.field}>
                    <label htmlFor="medsup_price" className={styles.label}>ราคากลาง (บาท)</label>
                    <input
                        id="medsup_price"
                        value={medsup_price}
                        disabled
                        className={styles.input}
                        aria-disabled="true"
                    />
                </div>
            </div>
        </fieldset>
    );
}
