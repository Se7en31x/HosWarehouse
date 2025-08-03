'use client';
import styles from './page.module.css';
import MedicineForm from './MedicineForm';
import MedsupForm from './MedsupForm';
import EquipmentForm from './EquipmentForm';
import MeddeviceForm from './MeddeviceForm';
import GeneralForm from './GeneralForm';
import { Image as ImageIcon } from "lucide-react";

export default function BasicForm({ form, handleChange, handleImageChange }) {
    const renderCategoryForm = () => {
        switch (form.item_category) {
            case 'medicine': return <MedicineForm form={form} handleChange={handleChange} />;
            case 'medsup': return <MedsupForm form={form} handleChange={handleChange} />;
            case 'equipment': return <EquipmentForm form={form} handleChange={handleChange} />;
            case 'meddevice': return <MeddeviceForm form={form} handleChange={handleChange} />;
            case 'general': return <GeneralForm form={form} handleChange={handleChange} />;
            default: return null;
        }
    };

    return (
        <div className={styles.formGrid}>
            {/* ข้อมูลทั่วไป */}
            <div className={styles.section}>
                <legend className={styles.legend}>ข้อมูลทั่วไป</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label htmlFor="item_category">หมวดหมู่หลัก</label>
                        <select id="item_category" name="item_category" value={form.item_category ?? ''} onChange={handleChange}>
                            <option value="">-- เลือกหมวดหมู่หลัก --</option>
                            <option value="medicine">ยา</option>
                            <option value="medsup">เวชภัณฑ์</option>
                            <option value="equipment">ครุภัณฑ์</option>
                            <option value="meddevice">อุปกรณ์ทางการแพทย์</option>
                            <option value="general">ของใช้ทั่วไป</option>
                        </select>
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_name">ชื่อพัสดุ</label>
                        <input id="item_name" name="item_name" value={form.item_name ?? ''} onChange={handleChange} />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_sub_category">หมวดหมู่ย่อย</label>
                        <input id="item_sub_category" name="item_sub_category" value={form.item_sub_category ?? ''} onChange={handleChange} />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_barcode">Barcode สินค้า</label>
                        <input
                            type="text"
                            id="item_barcode"
                            name="item_barcode"
                            value={form.item_barcode ?? ''}
                            onChange={handleChange}
                            placeholder="กรอก Barcode สินค้า (ถ้ามี)"
                        />
                    </div>
                </div>
            </div>

            {/* จำนวนและหน่วย */}
            <div className={styles.section}>
                <legend className={styles.legend}>จำนวนและหน่วย</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label htmlFor="item_qty">จำนวนคงเหลือ</label>
                        <input
                            type="number"
                            id="item_qty"
                            name="item_qty"
                            value={form.item_qty ?? 0}
                            onChange={handleChange}
                            min="0"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_unit">หน่วย</label>
                        <input id="item_unit" name="item_unit" value={form.item_unit ?? ''} onChange={handleChange} />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_min">จำนวนขั้นต่ำ</label>
                        <input
                            type="number"
                            id="item_min"
                            name="item_min"
                            value={form.item_min ?? 0}
                            onChange={handleChange}
                            min="0"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_max">จำนวนสูงสุด</label>
                        <input
                            type="number"
                            id="item_max"
                            name="item_max"
                            value={form.item_max ?? 0}
                            onChange={handleChange}
                            min="0"
                        />
                    </div>
                </div>
            </div>

            {/* ข้อมูลการจัดเก็บ */}
            <div className={styles.section}>
                <legend className={styles.legend}>ข้อมูลการจัดเก็บ</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label htmlFor="item_location">ตำแหน่งจัดเก็บ</label>
                        <input id="item_location" name="item_location" value={form.item_location ?? ''} onChange={handleChange} />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_zone">โซนจัดเก็บ</label>
                        <input id="item_zone" name="item_zone" value={form.item_zone ?? ''} onChange={handleChange} />
                    </div>
                </div>
            </div>

            {/* รูปภาพพัสดุ */}
            <div className={styles.section}>
                <legend className={styles.legend}>รูปภาพพัสดุ</legend>
                <div className={styles.field}>
                    <input type="file" accept="image/*" onChange={handleImageChange} />
                    {form.imagePreview ? (
                        <div className={styles.imagePreview}>
                            <img src={form.imagePreview} alt="preview" />
                        </div>
                    ) : (
                        <div className={styles.imagePreviewPlaceholder}>
                            <ImageIcon size={48} color="#aeb4b9" />
                            <span>ไม่มีรูปภาพตัวอย่าง</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Form เฉพาะหมวดหมู่ */}
            {form.item_category && (
                <div className={styles.section}>
                    <legend className={styles.legend}>{form.item_category === 'medicine' ? 'ยา' : 'รายละเอียดเพิ่มเติม'}</legend>
                    {renderCategoryForm()}
                </div>
            )}

        </div>
    );
}