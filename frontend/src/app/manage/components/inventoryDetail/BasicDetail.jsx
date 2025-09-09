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
        is_borrowable,
        item_img = null,
    } = form;

    const isBorrowableText =
        typeof is_borrowable === 'boolean'
            ? is_borrowable
                ? 'สามารถยืมได้ (ต้องนำมาคืน)'
                : 'ใช้แล้วหมดไป (เบิกใช้)'
            : '-';

    // ✅ ฟังก์ชันหาว่าจะใช้ path ไหน
    const getImageSrc = (img) => {
        if (!img) return null;
        if (img.startsWith('http')) return img; // full URL (Supabase หรือ CDN)
        return `http://localhost:5000/uploads/${img}`; // local upload
    };

    const imgSrc = getImageSrc(item_img);

    return (
        <div className={styles.detailContainer}>
            <fieldset className={styles.section}>
                <legend className={styles.legend}>ข้อมูลทั่วไป</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label htmlFor="item_category" className={styles.label}>
                            หมวดหมู่หลัก
                        </label>
                        <input
                            id="item_category"
                            value={item_category}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_name" className={styles.label}>
                            ชื่อพัสดุ
                        </label>
                        <input
                            id="item_name"
                            value={item_name}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_sub_category" className={styles.label}>
                            หมวดหมู่ย่อย
                        </label>
                        <input
                            id="item_sub_category"
                            value={item_sub_category}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_location" className={styles.label}>
                            ตำแหน่งจัดเก็บ
                        </label>
                        <input
                            id="item_location"
                            value={item_location}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_zone" className={styles.label}>
                            โซนจัดเก็บ
                        </label>
                        <input
                            id="item_zone"
                            value={item_zone}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                </div>
            </fieldset>

            <fieldset className={styles.section}>
                <legend className={styles.legend}>จำนวนและหน่วย</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label htmlFor="item_unit" className={styles.label}>
                            หน่วยนับ
                        </label>
                        <input
                            id="item_unit"
                            value={item_unit}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_min" className={styles.label}>
                            จำนวนขั้นต่ำ
                        </label>
                        <input
                            id="item_min"
                            value={item_min}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_max" className={styles.label}>
                            จำนวนสูงสุด
                        </label>
                        <input
                            id="item_max"
                            value={item_max}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_purchase_unit" className={styles.label}>
                            หน่วยสั่งซื้อ
                        </label>
                        <input
                            id="item_purchase_unit"
                            value={item_purchase_unit}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_conversion_rate" className={styles.label}>
                            อัตราส่วนการแปลง
                        </label>
                        <input
                            id="item_conversion_rate"
                            value={item_conversion_rate}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="is_borrowable" className={styles.label}>
                            สามารถยืมได้
                        </label>
                        <input
                            id="is_borrowable"
                            value={isBorrowableText}
                            disabled
                            className={styles.input}
                            aria-disabled="true"
                        />
                    </div>
                </div>
            </fieldset>

            <fieldset className={styles.section}>
                <legend className={styles.legend}>รูปภาพพัสดุ</legend>
                <div className={styles.imageField}>
                    {imgSrc ? (
                        <div className={styles.imagePreview}>
                            <img
                                src={imgSrc}
                                alt="รูปภาพพัสดุ"
                                className={styles.previewImage}
                            />
                        </div>
                    ) : (
                        <div
                            className={`${styles.imagePreview} ${styles.imagePreviewPlaceholder}`}
                        >
                            <span>ไม่มีรูปภาพ</span>
                        </div>
                    )}
                </div>
            </fieldset>
        </div>
    );
}
