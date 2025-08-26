'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import BasicForm from '@/app/manage/components/formTemplates/BasicForm';
import axiosInstance from '@/app/utils/axiosInstance';

export default function EditItem() {
    const { id } = useParams();
    const router = useRouter();

    const initialFormState = {
        item_category: '',
        item_name: '',
        item_sub_category: '',
        item_location: '',
        item_zone: '',
        item_unit: '',
        item_min: '',
        item_max: '',
        item_img: null,
        imagePreview: null,
        item_barcode: '',
        item_purchase_unit: '',
        item_conversion_rate: '',
        is_borrowable: false,
        // medicine
        med_generic_name: '',
        med_thai_name: '',
        med_marketing_name: '',
        med_counting_unit: '',
        med_dosage_form: '',
        med_medical_category: '',
        med_medium_price: '',
        med_tmt_code: '',
        med_tpu_code: '',
        med_tmt_gp_name: '',
        med_tmt_tp_name: '',
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

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prevForm => ({
            ...prevForm,
            [name]: type === 'checkbox' ? checked : (type === "number" && value === '' ? null : value)
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setForm((prev) => ({
                ...prev,
                item_img: file,
                imagePreview: URL.createObjectURL(file),
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        for (const key in form) {
            if (key === 'imagePreview') {
                continue;
            }
            const value = form[key];
            if (value === undefined || value === null || value === '') {
                if (key !== 'item_img' && value === '') continue;
            }
            if (key === 'is_borrowable') {
                formData.append(key, value);
            }
            else if (key === 'item_img' && typeof value === 'object' && value !== null) {
                formData.append(key, value);
            }
            else if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        }
        try {
            await axiosInstance.put(`/manageData/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                showConfirmButton: false,
                timer: 1500,
                customClass: {
                    popup: styles.swalPopup,
                },
            });
            setTimeout(() => {
                router.push('/manage/manageData');
            }, 1600);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'บันทึกไม่สำเร็จ',
                text: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: styles.swalPopup,
                    confirmButton: styles.swalButton,
                },
            });
        }
    };

    useEffect(() => {
        if (!id) return;
        axiosInstance.get(`/manageData/${id}`)
            .then((res) => {
                const fetchedData = res.data;
                console.log('✅ fetchedData:', res.data);
                const cleanedData = {};
                for (const key in initialFormState) {
                    if (fetchedData.hasOwnProperty(key)) {
                        cleanedData[key] = fetchedData[key];
                    }
                }
                setForm({
                    ...initialFormState,
                    ...cleanedData,
                    imagePreview: fetchedData.item_img_url || null,
                    item_img: fetchedData.item_img || null,
                });
            })
            .catch((error) => {
                console.error('Error fetching item data:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'โหลดข้อมูลไม่สำเร็จ',
                    text: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายการ',
                    confirmButtonText: 'ตกลง',
                    customClass: {
                        popup: styles.swalPopup,
                        confirmButton: styles.swalButton,
                    },
                });
            });
    }, [id]);

    return (
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <div className={styles.pageBar}>
                    <h1 className={styles.pageTitle}>
                        <span aria-hidden="true">✏️</span> แก้ไขรายการ #{id}
                    </h1>
                </div>
                <div className={styles.card}>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <BasicForm
                            form={form}
                            handleChange={handleChange}
                            handleImageChange={handleImageChange}
                        />
                        <div className={styles.actionButtonContainer}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={() => router.push('/manage/manageData')}
                                aria-label="ยกเลิกการแก้ไขและกลับไปหน้ารายการ"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                className={styles.saveButton}
                                aria-label="บันทึกการแก้ไขรายการ"
                            >
                                บันทึก
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
