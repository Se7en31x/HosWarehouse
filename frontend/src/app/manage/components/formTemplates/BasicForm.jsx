'use client';

import styles from './page.module.css';
import MedicineForm from './MedicineForm';
import MedsupForm from './MedsupForm';
import EquipmentForm from './EquipmentForm';
import MeddeviceForm from './MeddeviceForm';
import GeneralForm from './GeneralForm';
import { Upload, X } from 'lucide-react';
import { useRef } from 'react';

export default function BasicForm({ form, handleChange, handleImageChange }) {
    const fileInputRef = useRef(null);

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

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            handleImageChange({ target: { files: [file] } });
        }
    };

    const openFileDialog = () => {
        fileInputRef.current.click();
    };

    const handleRemoveImage = () => {
        handleImageChange({ target: { files: [] } }); // Clear the image
    };

    return (
        <div className={styles.formContainer}>
            {/* General Information Section */}
            <fieldset className={styles.section}>
                <legend className={styles.legend}>ข้อมูลทั่วไป</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label htmlFor="item_category" className={styles.label}>หมวดหมู่หลัก</label>
                        <select
                            id="item_category"
                            name="item_category"
                            value={form.item_category ?? ''}
                            onChange={handleChange}
                            className={styles.input}
                            aria-required="true"
                        >
                            <option value="">-- เลือกหมวดหมู่หลัก --</option>
                            <option value="medicine">ยา</option>
                            <option value="medsup">เวชภัณฑ์</option>
                            <option value="equipment">ครุภัณฑ์</option>
                            <option value="meddevice">อุปกรณ์ทางการแพทย์</option>
                            <option value="general">ของใช้ทั่วไป</option>
                        </select>
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_name" className={styles.label}>ชื่อพัสดุ</label>
                        <input
                            id="item_name"
                            name="item_name"
                            value={form.item_name ?? ''}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="กรอกชื่อพัสดุ"
                            aria-required="true"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_sub_category" className={styles.label}>หมวดหมู่ย่อย</label>
                        <input
                            id="item_sub_category"
                            name="item_sub_category"
                            value={form.item_sub_category ?? ''}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="กรอกหมวดหมู่ย่อย (ถ้ามี)"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_barcode" className={styles.label}>Barcode สินค้า</label>
                        <input
                            type="text"
                            id="item_barcode"
                            name="item_barcode"
                            value={form.item_barcode ?? ''}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="กรอก Barcode สินค้า (ถ้ามี)"
                        />
                    </div>
                </div>
            </fieldset>

            {/* Quantity and Unit Section */}
            <fieldset className={styles.section}>
                <legend className={styles.legend}>ข้อมูลหน่วยนับและการแปลง</legend>
                <div className={styles.grid}>
                    <div className={styles.field}>
                        <label htmlFor="item_unit" className={styles.label}>หน่วยเบิกใช้</label>
                        <input
                            id="item_unit"
                            name="item_unit"
                            value={form.item_unit ?? ''}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="เช่น ชิ้น, เม็ด, ขวด"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_purchase_unit" className={styles.label}>หน่วยสั่งซื้อ</label>
                        <input
                            id="item_purchase_unit"
                            name="item_purchase_unit"
                            value={form.item_purchase_unit ?? ''}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="เช่น ลัง, กล่อง, แพ็ค"
                        />
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_conversion_rate" className={styles.label}>อัตราส่วนการแปลง</label>
                        <input
                            type="number"
                            id="item_conversion_rate"
                            name="item_conversion_rate"
                            value={form.item_conversion_rate ?? 1}
                            onChange={handleChange}
                            className={styles.input}
                            placeholder="จำนวนหน่วยเบิกใช้ต่อ 1 หน่วยสั่งซื้อ"
                            min="1"
                            aria-describedby="conversion-rate-help"
                        />
                        <small id="conversion-rate-help" className={styles.helpText}>
                            ระบุจำนวนหน่วยเบิกใช้ที่ได้จาก 1 หน่วยสั่งซื้อ
                        </small>
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_min" className={styles.label}>จำนวนขั้นต่ำ</label>
                        <input
                            type="number"
                            id="item_min"
                            name="item_min"
                            value={form.item_min ?? 0}
                            onChange={handleChange}
                            className={styles.input}
                            min="0"
                            aria-describedby="min-help"
                        />
                        <small id="min-help" className={styles.helpText}>
                            จำนวนขั้นต่ำสำหรับแจ้งเตือนสต็อก
                        </small>
                    </div>
                    <div className={styles.field}>
                        <label htmlFor="item_max" className={styles.label}>จำนวนสูงสุด</label>
                        <input
                            type="number"
                            id="item_max"
                            name="item_max"
                            value={form.item_max ?? 0}
                            onChange={handleChange}
                            className={styles.input}
                            min="0"
                            aria-describedby="max-help"
                        />
                        <small id="max-help" className={styles.helpText}>
                            จำนวนสูงสุดสำหรับการเก็บสต็อก
                        </small>
                    </div>
                    <div className={styles.field}>
                        <label className={styles.label}>ประเภทการเบิกจ่าย</label>
                        <div className={styles.checkboxGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    name="is_borrowable"
                                    checked={form.is_borrowable ?? false}
                                    onChange={handleChange}
                                    className={styles.checkbox}
                                />
                                สามารถยืมได้ (ต้องนำมาคืน)
                            </label>
                        </div>
                    </div>
                </div>
            </fieldset>

            {/* Storage and Image Section */}
            <div className={styles.storageImageContainer}>
                {/* Storage Information Section */}
                <fieldset className={styles.section}>
                    <legend className={styles.legend}>ข้อมูลการจัดเก็บ</legend>
                    <div className={styles.grid}>
                        <div className={styles.field}>
                            <label htmlFor="item_location" className={styles.label}>ตำแหน่งจัดเก็บ</label>
                            <input
                                id="item_location"
                                name="item_location"
                                value={form.item_location ?? ''}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="เช่น ชั้น 1, ตู้ A"
                            />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="item_zone" className={styles.label}>โซนจัดเก็บ</label>
                            <input
                                id="item_zone"
                                name="item_zone"
                                value={form.item_zone ?? ''}
                                onChange={handleChange}
                                className={styles.input}
                                placeholder="เช่น โซน A, โกดัง"
                            />
                        </div>
                    </div>
                </fieldset>

                {/* Image Upload Section */}
                <fieldset className={styles.section}>
                    <legend className={styles.legend}>รูปภาพพัสดุ</legend>
                    <div
                        className={styles.uploadBox}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={openFileDialog}
                    >
                        <Upload size={48} className={styles.uploadIcon} />
                        <p className={styles.uploadText}>
                            <button type="button" className={styles.chooseBtn}>
                                เลือกรูปภาพ
                            </button>
                            หรือลากและวางที่นี่
                        </p>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleImageChange}
                        />
                        {form.imagePreview && (
                            <div className={styles.previewWrapper}>
                                <div className={styles.previewContainer}>
                                    <img src={form.imagePreview} alt="Preview" className={styles.previewImage} />
                                    <button
                                        type="button"
                                        className={styles.removeBtn}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent triggering openFileDialog
                                            handleRemoveImage();
                                        }}
                                        aria-label="ลบรูปภาพ"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <small className={styles.helpText}>ขนาดไฟล์สูงสุด 5MB (JPEG, PNG)</small>
                </fieldset>
            </div>

            {/* Category-Specific Form */}
            {form.item_category && (
                <fieldset className={`${styles.section} ${styles.fullWidth}`}>
                    <legend className={styles.legend}>
                        {form.item_category === 'medicine' && 'ข้อมูลยา'}
                        {form.item_category === 'medsup' && 'ข้อมูลเวชภัณฑ์'}
                        {form.item_category === 'equipment' && 'ข้อมูลครุภัณฑ์'}
                        {form.item_category === 'meddevice' && 'ข้อมูลอุปกรณ์ทางการแพทย์'}
                        {form.item_category === 'general' && 'ข้อมูลของใช้ทั่วไป'}
                    </legend>
                    {renderCategoryForm()}
                </fieldset>
            )}
        </div>
    );
}
