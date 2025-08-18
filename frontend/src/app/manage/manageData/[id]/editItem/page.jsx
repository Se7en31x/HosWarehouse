'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import BasicForm from '../../../components/formTemplates/BasicForm';
import axiosInstance from '../../../../utils/axiosInstance';

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
    item_min: 0,
    item_max: 0,
    item_img: null,
    imagePreview: null,
    item_barcode: '',

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
    setForm({ ...form, [e.target.name]: e.target.value });
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
      // ไม่ต้องส่ง imagePreview กลับไป
      if (key === 'imagePreview') {
        continue;
      }

      // ถ้าเป็นรูปภาพและเป็น object (ไฟล์ใหม่) ให้ส่งไป
      if (key === 'item_img' && typeof form[key] === 'object' && form[key] !== null) {
        formData.append(key, form[key]);
      }
      // ถ้าเป็นข้อมูลอื่น ๆ ที่ไม่ใช่รูปภาพ (หรือเป็นรูปภาพเดิมที่เป็น string)
      else if (form[key] !== undefined && form[key] !== null) {
        formData.append(key, form[key]);
      }
    }

    // ตรวจสอบข้อมูลใน FormData ก่อนส่ง (สำหรับ Debug)
    // for (const [key, value] of formData.entries()) {
    //   console.log(`${key}: ${value}`);
    // }

    try {
      await axiosInstance.put(`/manageData/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        showConfirmButton: false,
        timer: 1500,
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
        confirmButtonText: 'ตกลง'
      });
    }
  };

  useEffect(() => {
    if (!id) return;

    axiosInstance.get(`/manageData/${id}`)
      .then((res) => {
        const fetchedData = res.data;
        console.log('✅ fetchedData:', res.data);

        // สร้าง object ใหม่ที่ตรงกับ initialFormState
        const cleanedData = {};
        for (const key in initialFormState) {
          if (key === 'item_img' || key === 'imagePreview') {
            continue;
          }
          cleanedData[key] = fetchedData[key] ?? '';
        }

        // ตั้งค่า form state
        setForm({
          ...initialFormState,
          ...cleanedData,
          imagePreview: fetchedData.item_img_url || null,
          item_img: fetchedData.item_img || null, // เก็บชื่อไฟล์เดิมไว้เผื่อไม่ได้อัปโหลดใหม่
        });
      })
      .catch((error) => {
        console.error('Error fetching item data:', error);
      });
  }, [id]);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>แก้ไขรายการ</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <BasicForm
          form={form}
          handleChange={handleChange}
          handleImageChange={handleImageChange}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => router.push('/manage/manageData')}
          >
            ยกเลิก
          </button>
          <button type="submit" className={styles.save}>
            บันทึก
          </button>
        </div>
      </form>
    </div>
  );
}