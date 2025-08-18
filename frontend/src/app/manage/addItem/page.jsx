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
        item_unit: '',
        item_min: 0,
        item_max: 0,
        item_barcode: '',
        image: null,
        imagePreview: null,

        // medicine
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
        med_severity: '',
        med_essential_med_list: '',
        med_pregnancy_category: '',
        med_dose_dialogue: '',
        med_replacement: '',

        // medsup
        medsup_category: '',
        medsup_brand: '',
        medsup_serial_no: '',
        medsup_status: '',
        medsup_price: '',

        // equipment
        equip_brand: '',
        equip_model: '',
        equip_price: '',
        equip_maintenance_cycle: '',
        equip_note: '',

        // meddevice
        meddevice_type: '',
        meddevice_brand: '',
        meddevice_model: '',
        meddevice_serial_no: '',
        meddevice_status: '',
        meddevice_price: '',
        meddevice_note: '',

        // general
        gen_brand: '',
        gen_model: '',
        gen_spec: '',
        gen_price: '',
    };
    const [form, setForm] = useState(initialFormState);

    useEffect(() => {
        return () => {
            if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
        };
    }, [form.imagePreview]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "number" ? Number(value) : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!file) {
            if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
            setForm((prev) => ({
                ...prev,
                image: null,
                imagePreview: null,
            }));
            return;
        }

        if (file.size > maxSize) {
            Swal.fire({
                icon: 'error',
                title: 'ขนาดไฟล์ใหญ่เกินไป',
                text: 'กรุณาเลือกรูปภาพที่มีขนาดไม่เกิน 5MB',
            });
            e.target.value = null;
            return;
        }

        if (form.imagePreview) {
            URL.revokeObjectURL(form.imagePreview);
        }

        setForm((prev) => ({
            ...prev,
            image: file,
            imagePreview: URL.createObjectURL(file),
        }));
    };

    const validateForm = () => {
        const min = Number(form.item_min);
        const max = Number(form.item_max);

        if (!form.item_name.trim()) {
            Swal.fire({ icon: 'error', title: 'กรุณากรอกชื่อพัสดุ' });
            return false;
        }
        if (!form.item_category.trim()) {
            Swal.fire({ icon: 'error', title: 'กรุณาเลือกประเภทพัสดุ' });
            return false;
        }
        if (min < 0) {
            Swal.fire({ icon: 'error', title: 'จำนวนขั้นต่ำต้องไม่ติดลบ' });
            return false;
        }
        if (max < 0) {
            Swal.fire({ icon: 'error', title: 'จำนวนสูงสุดต้องไม่ติดลบ' });
            return false;
        }
        if (max < min) {
            Swal.fire({ icon: 'error', title: 'จำนวนสูงสุดต้องไม่น้อยกว่าจำนวนขั้นต่ำ' });
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
        Swal.fire({
            title: 'ยืนยันการยกเลิก?',
            text: 'ข้อมูลที่กรอกไว้จะถูกลบทิ้งทั้งหมด',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#808080',
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก',
        }).then((result) => {
            if (result.isConfirmed) {
                resetForm();
            }
        });
    };

    return (
        <div className={styles.pageLayout}>
            <header className={styles.header}>
                <h1 className={styles.title}>เพิ่มรายการพัสดุ</h1>
            </header>

            <main className={styles.mainContent}>
                <form onSubmit={handleSubmit} className={styles.formCard}>
                    <BasicForm
                        form={form}
                        handleChange={handleChange}
                        handleImageChange={handleImageChange}
                    />
                    <div className={styles.actions}>
                        <button type="button" className={styles.cancel} onClick={handleCancel}>ยกเลิก</button>
                        <button type="submit" className={styles.save}>บันทึก</button>
                    </div>
                </form>
            </main>
        </div>
    );
}
