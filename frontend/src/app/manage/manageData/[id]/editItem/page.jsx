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
    item_exp: '',
    item_qty: 0,
    item_unit: '',
    item_min: 0,
    item_max: 0,
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
    med_tmt_code: '',          // แก้จาก med_TMT_code
    med_tpu_code: '',          // แก้จาก med_TPU_code
    med_tmt_gp_name: '',       // แก้จาก med_TMT_GP_name
    med_tmt_tp_name: '',       // แก้จาก med_TMT_TP_name
    med_quantity: '',
    med_severity: '',
    med_essential_med_list: '',
    med_pregnancy_cagetory: '',
    med_mfg: '',
    med_exp: '',
    med_dose_dialogue: '',
    med_replacement: '',

    // medsup
    medsup_category: '',
    medsup_name: '',
    medsup_brand: '',
    medsup_serial_no: '',
    medsup_status: '',
    medsup_qty: '',
    medsup_price: '',

    // equipment
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

    // meddevice
    meddevice_id: '',
    meddevice_name: '',
    meddevice_type: '',
    meddevice_brand: '',
    meddevice_model: '',
    meddevice_serial_no: '',
    meddevice_status: '',
    meddevice_price: '',
    meddevice_note: '',

    // general
    gen_id: '',
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
      if (key === 'item_img' && typeof form[key] === 'string') continue;
      if (form[key] !== undefined && form[key] !== null) {
        formData.append(key, form[key]);
      }
    }

    try {
      await axiosInstance.put(`/manageData/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // ✅ ใช้ Swal เมื่อบันทึกสำเร็จ
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        showConfirmButton: false,
        timer: 1500,
      });

      setTimeout(() => {
        router.push('/manage/manageData');
      }, 1600); // รอให้ Swal แสดงก่อนค่อยเปลี่ยนหน้า

    } catch (error) {
      console.error(error);

      // ❌ ใช้ Swal เมื่อเกิดข้อผิดพลาด
      Swal.fire({
        title: 'บันทึกสำเร็จ',
        icon: 'success',
        confirmButtonText: 'ตกลง'
      }).then(() => {
        router.push('/manage/manageData');
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
          cleanedData[key] = fetchedData[key] ?? ''; // ใช้ "" แทน null/undefined
        }

        if (fetchedData.item_exp) {
          cleanedData.item_exp = new Date(fetchedData.item_exp).toISOString().slice(0, 10);
        }

        // แปลงวันที่ med_mfg และ med_exp ให้เป็นรูปแบบ YYYY-MM-DD
        if (cleanedData.med_mfg) {
          cleanedData.med_mfg = new Date(cleanedData.med_mfg).toISOString().slice(0, 10);
        }
        if (cleanedData.med_exp) {
          cleanedData.med_exp = new Date(cleanedData.med_exp).toISOString().slice(0, 10);
        }

        setForm({
          ...initialFormState,
          ...cleanedData,
          imagePreview: fetchedData.item_img_url || null,
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
