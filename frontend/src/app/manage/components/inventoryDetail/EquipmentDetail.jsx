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
          <label>ยี่ห้อ:</label>
          <input type="text" value={equip_brand} disabled />
        </div>
        <div className={styles.field}>
          <label>รุ่น:</label>
          <input type="text" value={equip_model} disabled />
        </div>
        <div className={styles.field}>
          <label>ราคากลาง:</label>
          <input type="text" value={equip_price} disabled />
        </div> 
        <div className={styles.field}>
          <label>รอบการบำรุงรักษา:</label>
          <input type="text" value={equip_maintenance_cycle} disabled />
        </div>
        <div className={styles.field}>
          <label>หมายเหตุ:</label>
          <textarea value={equip_note} disabled />
        </div>
      </div>
    </fieldset>
  );
}
