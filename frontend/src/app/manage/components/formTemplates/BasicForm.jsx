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
        <>
            {/* กริด 2 คอลัมน์: เติมช่องตามลำดับซ้าย→ขวา, บรรทัดบน→ล่าง */}
            <div className={styles.formGrid}>
                {/* 1) ข้อมูลทั่วไป */}
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

                {/* 2) จำนวนและหน่วย */}
                <div className={styles.section}>
                    <legend className={styles.legend}>ข้อมูลหน่วยนับและการแปลง</legend>
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label htmlFor="item_unit">หน่วยเบิกใช้</label>
                            <input id="item_unit" name="item_unit" value={form.item_unit ?? ''} onChange={handleChange} placeholder="เช่น ชิ้น, เม็ด, ขวด" />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="item_purchase_unit">หน่วยสั่งซื้อ</label>
                            <input id="item_purchase_unit" name="item_purchase_unit" value={form.item_purchase_unit ?? ''} onChange={handleChange} placeholder="เช่น ลัง, กล่อง, แผง" />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="item_conversion_rate">อัตราส่วนการแปลง</label>
                            <input
                                type="number"
                                id="item_conversion_rate"
                                name="item_conversion_rate"
                                value={form.item_conversion_rate ?? 1}
                                onChange={handleChange}
                                placeholder="จำนวนหน่วยเบิกใช้ต่อ 1 หน่วยสั่งซื้อ"
                                min="1"
                            />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="item_min">จำนวนขั้นต่ำ</label>
                            <input type="number" id="item_min" name="item_min" value={form.item_min ?? 0} onChange={handleChange} min="0" />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="item_max">จำนวนสูงสุด</label>
                            <input type="number" id="item_max" name="item_max" value={form.item_max ?? 0} onChange={handleChange} min="0" />
                        </div>
                        {/* โค้ดที่เพิ่มเข้ามาใหม่ */}
                        <div className={styles.field}>
                            <label>ประเภทการเบิกจ่าย</label>
                            <div className={styles.checkboxGroup}>
                                <label>
                                    <input
                                        type="checkbox"
                                        name="is_borrowable"
                                        checked={form.is_borrowable ?? false}
                                        onChange={handleChange}
                                    />
                                    สามารถยืมได้ (ต้องนำมาคืน)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3) ข้อมูลการจัดเก็บ */}
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

                {/* 4) รูปภาพพัสดุ */}
                <div className={styles.section}>
                    <legend className={styles.legend}>รูปภาพพัสดุ</legend>
                    <div className={`${styles.field} ${styles.imageField}`}>
                        <div>
                            <label htmlFor="item_image">อัปโหลดรูปภาพ</label>
                            <input id="item_image" type="file" accept="image/*" onChange={handleImageChange} />
                        </div>

                        {form.imagePreview ? (
                            <div className={styles.imagePreview}>
                                <img src={form.imagePreview} alt="preview" />
                            </div>
                        ) : (
                            <div className={`${styles.imagePreview} ${styles.imagePreviewPlaceholder}`}>
                                <ImageIcon size={44} color="#aeb4b9" />
                                <span>ไม่มีรูปภาพตัวอย่าง</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ฟอร์มเฉพาะหมวดหมู่ — แสดงเต็มความกว้างใต้กริด */}
            {form.item_category && (
                <div className={`${styles.section} ${styles.fullWidth}`}>
                    {renderCategoryForm()}
                </div>
            )}
        </>
    );
}