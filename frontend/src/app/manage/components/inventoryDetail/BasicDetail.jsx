'use client';
import styles from './page.module.css';

export default function BasicDetail({ form = {} }) {
    const {
        item_category = '-',
        item_name = '-',
        item_sub_category = '-',
        item_location = '-',
        item_zone = '-',
        item_unit = '-',
        item_min = '-',
        item_max = '-',
        item_purchase_unit = '-',
        item_conversion_rate = '-',
        is_borrowable, // เพิ่ม prop ใหม่
        item_img = null,
    } = form;
    
    // กำหนดค่าเริ่มต้นสำหรับ is_borrowable หากไม่มีข้อมูลจาก prop
    const isBorrowableText = (is_borrowable === true) ? 'สามารถยืมได้ (ต้องนำมาคืน)' : 'ใช้แล้วหมดไป (เบิกใช้)';
    const isBorrowableValue = typeof is_borrowable === 'boolean' ? isBorrowableText : '-';

    return (
        <>
            <fieldset className={styles.section}>
                <legend>ข้อมูลทั่วไป</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label>หมวดหมู่หลัก</label>
                        <input value={item_category || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>ชื่อพัสดุ</label>
                        <input value={item_name || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>หมวดหมู่ย่อย</label>
                        <input value={item_sub_category || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>ตำแหน่งจัดเก็บ</label>
                        <input value={item_location || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>โซนจัดเก็บ</label>
                        <input value={item_zone || '-'} disabled />
                    </div>
                </div>
            </fieldset>
            
            <fieldset className={styles.section}>
                <legend>จำนวนและหน่วย</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label>หน่วยนับ</label>
                        <input value={item_unit || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>จำนวนขั้นต่ำ</label>
                        <input value={item_min || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>จำนวนสูงสุด</label>
                        <input value={item_max || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>หน่วยสั่งซื้อ</label>
                        <input value={item_purchase_unit || '-'} disabled />
                    </div>
                    <div className={styles.field}>
                        <label>อัตราส่วนการแปลง</label>
                        <input value={item_conversion_rate || '-'} disabled />
                    </div>
                    {/* เพิ่มสถานะการยืมได้ */}
                    <div className={styles.field}>
                        <label>สามารถยืมได้</label>
                        <input value={isBorrowableValue} disabled />
                    </div>
                </div>
            </fieldset>

            <fieldset className={styles.section}>
                <legend>รูปภาพพัสดุ</legend>
                {item_img ? (
                    <div className={styles.imagePreview}>
                        <img src={`http://localhost:5000/uploads/${item_img}`} alt="รูปพัสดุ" />
                    </div>
                ) : (
                    <p>ไม่มีรูปภาพ</p>
                )}
            </fieldset>
        </>
    );
}