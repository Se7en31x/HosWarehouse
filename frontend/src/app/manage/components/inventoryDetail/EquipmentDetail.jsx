'use client';
import styles from './page.module.css';

export default function EquipmentDetail({ form = {} }) {
  const {
    equip_brand = '-',
    equip_model = '-',
    equip_serial_no = '-',
    equip_status = '-',
    equip_location = '-',
    equip_price = '-',
    equip_purchase_date = '',
    equip_warranty_expire = '',
    equip_maintenance_cycle = '-',
    equip_last_maintenance = '',
    equip_qr_code = '-',
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
          <label>หมายเลขประจำเครื่อง:</label>
          <input type="text" value={equip_serial_no} disabled />
        </div>
        <div className={styles.field}>
          <label>สถานะ:</label>
          <input type="text" value={equip_status} disabled />
        </div>
        <div className={styles.field}>
          <label>สถานที่จัดเก็บ:</label>
          <input type="text" value={equip_location} disabled />
        </div>
        <div className={styles.field}>
          <label>ราคา:</label>
          <input type="text" value={equip_price} disabled />
        </div>
        <div className={styles.field}>
          <label>วันที่จัดซื้อ:</label>
          <input type="date" value={equip_purchase_date || ''} disabled />
        </div>
        <div className={styles.field}>
          <label>วันหมดประกัน:</label>
          <input type="date" value={equip_warranty_expire || ''} disabled />
        </div>
        <div className={styles.field}>
          <label>รอบการบำรุงรักษา:</label>
          <input type="text" value={equip_maintenance_cycle} disabled />
        </div>
        <div className={styles.field}>
          <label>วันที่บำรุงรักษาครั้งล่าสุด:</label>
          <input type="date" value={equip_last_maintenance || ''} disabled />
        </div>
        <div className={styles.field}>
          <label>รหัส QR:</label>
          <input type="text" value={equip_qr_code} disabled />
        </div>
        <div className={styles.field}>
          <label>หมายเหตุ:</label>
          <textarea value={equip_note} disabled />
        </div>
      </div>
    </fieldset>
  );
}
