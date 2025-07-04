'use client';
import { Image as ImageIcon, UploadCloud } from "lucide-react";
import Swal from 'sweetalert2';
import { useState, useEffect } from 'react';
import styles from './page.module.css';
import axiosInstance from '../../utils/axiosInstance';
import BasicForm from '../components/formTemplates/BasicForm';

export default function AddItem() {
    const initialFormState = {
        item_category: '',
        item_name: '',
        item_sub_category: '',
        item_location: '',
        item_zone: '',
        item_exp: '',
        item_qty: 0,
        item_unit: '',
        item_min: 0,
        item_max: 0,
        item_po: '',
        item_lot: '',
        item_order_date: '',
        item_seller: '',
        item_receiver: '',
        imagePreview: null,
        // เฉพาะฟอร์มยา
        med_generic_name: '',
        med_thai_name: '',
        med_marketing_name: '',
        med_counting_unit: '',
        med_dosage_form: '',
        med_medical_category: '',
        med_cost_price: '',
        med_selling_price: '',
        med_medium_price: '',
        med_TMT_code: '',
        med_TPU_code: '',
        med_TMT_GP_name: '',
        med_TMT_TP_name: '',
        med_quantity: '',
        med_severity: '',
        med_essential_med_list: '',
        med_pregnancy_cagetory: '',
        med_mfg: '',
        med_exp: '',
        med_dose_dialogue: '',
        med_replacement: '',
        // เวชัภัณฑ์
        medsup_category: '',
        medsup_name: '',
        medsup_brand: '',
        medsup_serial_no: '',
        medsup_status: '',
        medsup_expiry_date: '',
        medsup_qty: '',
        medsup_price: '',
        // Epuipment ครุภัณฑ์
        equip_id: '',
        equip_brand: '',
        equip_model: '',
        equip_serial_no: '',
        equip_status: '',
        equip_location: '',
        equip_price: '',
        equip_purchase_date: '',
        equip_warranty_expire: '',
        equip_maintenance_cycle: '',
        equip_last_maintenance: '',
        equip_qr_code: '',
        equip_note: '',
        //meddevice อุปกรณ์ทงการแพทยื
        meddevice_id: '',
        meddevice_name: '',
        meddevice_type: '',
        meddevice_brand: '',
        meddevice_model: '',
        meddevice_serial_no: '',
        meddevice_status: '',
        meddevice_price: '',
        meddevice_note: '',
        // เฉพาะพัสดุทั่วไป (GeneralSupForm)
        gen_id: '',
        gen_brand: '',
        gen_model: '',
        gen_spec: '',
        gen_price: '',
    };

    const [form, setForm] = useState(initialFormState);
    //function select type and show form
    // const [selectedCategory, setSelectedCategory] = useState('');

    // Clean up URL object when component unmounts or image changes (memory leak prevention)
    useEffect(() => {
        return () => {
            if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
        };
    }, [form.imagePreview]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (form.imagePreview) {
                URL.revokeObjectURL(form.imagePreview);
            }
            setForm((prev) => ({
                ...prev,
                image: file,
                imagePreview: URL.createObjectURL(file),
            }));
        }
    };

    const validateForm = () => {
        const min = form.item_min ? Number(form.item_min) : null;
        const max = form.item_max ? Number(form.item_max) : null;
        const qty = Number(form.item_qty);
        if (!form.item_name.trim()) {
            Swal.fire({ icon: 'error', title: 'กรุณากรอกชื่อพัสดุ' });
            return false;
        }
        // 🔁 แก้ตรงนี้
        if (!form.item_qty || isNaN(qty) || qty <= 0) {
            Swal.fire({ icon: 'error', title: 'กรุณากรอกจำนวนคงเหลือให้ถูกต้อง' });
            return false;
        }
        if (min !== null && min < 0) {
            Swal.fire({ icon: 'error', title: 'จำนวนขั้นต่ำต้องไม่ติดลบ' });
            return false;
        }
        if (max !== null && min !== null && max < min) {
            Swal.fire({ icon: 'error', title: 'จำนวนสูงสุดต้องไม่น้อยกว่าจำนวนขั้นต่ำ' });
            return false;
        }
        if (max !== null && Number(form.item_quantity) > max) {
            Swal.fire({ icon: 'error', title: 'จำนวนคงเหลือไม่ควรเกินจำนวนสูงสุด' });
            return false;
        }
        return true;
    };



    const resetForm = () => {
        if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
        setForm(initialFormState);
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!validateForm()) return;

        if (form.item_category === 'medicine') {
            form.item_exp = form.med_exp || '';
        }

        const formData = new FormData();
        Object.entries(form).forEach(([key, value]) => {
            if (key === 'image') {
                if (value) formData.append(key, value);
            } else if (key !== 'imagePreview') {
                formData.append(key, value ?? '');
            }
        });

        try {
            await axiosInstance.post('/addNewItem', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            Swal.fire({
                icon: 'success',
                title: 'บันทึกข้อมูลสำเร็จ',
                timer: 1500,
                showConfirmButton: false,
            });
            resetForm();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'บันทึกข้อมูลไม่สำเร็จ',
                text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
            });
            console.error('Error saving data:', error);
        }

    };

    const handleCancel = () => {
        if (confirm('คุณต้องการยกเลิกการกรอกข้อมูลหรือไม่?')) {
            resetForm();
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>เพิ่มรายการ</h1>
            <form onSubmit={handleSubmit} className={styles.form}>

                {/* ข้อมูลทั่วไป */}
                <BasicForm
                    form={form}
                    handleChange={handleChange}
                    handleImageChange={handleImageChange}
                />
                {/* ปุ่มคำสั่ง */}
                <div className={styles.actions}>
                    <button type="button" className={styles.cancel} onClick={handleCancel}>ยกเลิก</button>
                    <button type="submit" className={styles.save}>บันทึก</button>
                </div>

            </form>
        </div>
    );
}
