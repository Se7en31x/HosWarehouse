'use client';
import { useState } from 'react';
import styles from './page.module.css';

export default function EditItem() {
  const [form, setForm] = useState({
    name: '',
    code: '',
    lot: '',
    category: '',
    subCategory: '',
    quantity: '',
    unit: '',
    location: '',
    status: '',
    min: '',
    max: '',
    expireDate: '',
    seller: ' ',
    receiver: '',
    po: '',
    orderDate: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('เพิ่มรายการ:', form);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>เพิ่มรายการ</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <fieldset className={styles.section}>
          <legend>ข้อมูลทั่วไป</legend>
          <div className={styles.grid}>
            <div className={styles.field}><label>ชื่อ</label><input name="name" value={form.name} onChange={handleChange} /></div>
            <div className={styles.field}><label>หมายเลข</label><input name="code" value={form.code} onChange={handleChange} /></div>
            <div className={styles.field}><label>เลข Lot</label><input name="lot" value={form.lot} onChange={handleChange} /></div>
            <div className={styles.field}><label>สถานะพัสดุ</label><input name="status" value={form.status} onChange={handleChange} /></div>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>ข้อมูลจัดเก็บ</legend>
          <div className={styles.grid}>
            <div className={styles.field}><label>ตำแหน่งที่จัดเก็บ</label><input name="location" value={form.location} onChange={handleChange} /></div>
            <div className={styles.field}><label>หมวดหมู่หลัก</label><input name="category" value={form.category} onChange={handleChange} /></div>
            <div className={styles.field}><label>หมวดหมู่ย่อย</label><input name="subCategory" value={form.subCategory} onChange={handleChange} /></div>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>จำนวนและหน่วย</legend>
          <div className={styles.grid}>
            <div className={styles.field}><label>จำนวนคงเหลือ</label><input type="number" name="quantity" value={form.quantity} onChange={handleChange} /></div>
            <div className={styles.field}><label>หน่วย</label><input name="unit" value={form.unit} onChange={handleChange} /></div>
            <div className={styles.field}><label>จำนวนขั้นต่ำ</label><input type="number" name="min" value={form.min} onChange={handleChange} /></div>
            <div className={styles.field}><label>จำนวนสูงสุด</label><input type="number" name="max" value={form.max} onChange={handleChange} /></div>
          </div>
        </fieldset>

        <fieldset className={styles.section}>
          <legend>ข้อมูลการสั่งซื้อ</legend>
          <div className={styles.grid}>
            <div className={styles.field}><label>วันหมดอายุ</label><input type="date" name="expireDate" value={form.expireDate} onChange={handleChange} /></div>
            <div className={styles.field}><label>เลขที่ใบสั่งซื้อ</label><input name="po" value={form.po} onChange={handleChange} /></div>
            <div className={styles.field}><label>วันที่สั่งซื้อ</label><input type="date" name="orderDate" value={form.orderDate} onChange={handleChange} /></div>
            <div className={styles.field}><label>ผู้จำหน่าย</label><input name="seller" value={form.seller} onChange={handleChange} /></div>
            <div className={styles.field}><label>ผู้รับเข้า</label><input name="receiver" value={form.receiver} onChange={handleChange} /></div>
          </div>
        </fieldset>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel}>ยกเลิก</button>
          <button type="button" className={styles.edit}>แก้ไข</button>
          <button type="submit" className={styles.save}>บันทึก</button>
        </div>
      </form>
    </div>
  );
}
