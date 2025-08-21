"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
import Link from "next/link";
import styles from "./page.module.css";

export default function SelectedQuotationCreatePage() {
  const sp = useSearchParams();
  const router = useRouter();
  const rfqId = sp.get("rfq_id");

  const [form, setForm] = useState({
    supplier_id: "",
    supplier_name: "",
    supplier_taxid: "",
    supplier_contact: "",
    supplier_phone: "",
    supplier_email: "",
    quote_no: "",
    quote_date: new Date().toISOString().slice(0,10),
    valid_until: "",
    currency: "THB",
    vat_included: true,
    total_before_vat: "",
    vat_amount: "",
    total_after_vat: "",
    payment_terms: "",
    delivery_days: "",
    delivery_place: "",
    warranty_months: "",
    attachment_url: "",
    note: "",
  });

  useEffect(() => {
    if (!rfqId) {
      alert("ไม่มี RFQ ID");
    }
  }, [rfqId]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!rfqId) return;
    try {
      const payload = { rfq_id: rfqId, ...form, created_by_name: "ผู้ใช้งาน ทั่วไป" };
      await axiosInstance.post("/quotation/selected", payload);
      router.push(`/purchasing/po/create?rfq_id=${rfqId}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <Link href={`/purchasing/rfq/${rfqId || ""}`} className={styles.secondaryBtn}>
          ← กลับ RFQ
        </Link>
        <h1 className={styles.title}>บันทึกใบเสนอราคาที่คัดเลือกแล้ว</h1>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>ผู้ขาย</legend>
          <div className={styles.grid2}>
            <label className={styles.label}>รหัสผู้ขาย (ถ้ามี)
              <input className={styles.input} name="supplier_id" value={form.supplier_id} onChange={onChange} />
            </label>
            <label className={styles.label}>ชื่อผู้ขาย *
              <input className={styles.input} name="supplier_name" value={form.supplier_name} onChange={onChange} required />
            </label>
            <label className={styles.label}>เลขภาษี
              <input className={styles.input} name="supplier_taxid" value={form.supplier_taxid} onChange={onChange} />
            </label>
            <label className={styles.label}>ผู้ติดต่อ
              <input className={styles.input} name="supplier_contact" value={form.supplier_contact} onChange={onChange} />
            </label>
            <label className={styles.label}>โทรศัพท์
              <input className={styles.input} name="supplier_phone" value={form.supplier_phone} onChange={onChange} />
            </label>
            <label className={styles.label}>อีเมล
              <input className={styles.input} type="email" name="supplier_email" value={form.supplier_email} onChange={onChange} />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>เอกสารใบเสนอราคา</legend>
          <div className={styles.grid2}>
            <label className={styles.label}>เลขที่ใบเสนอ *
              <input className={styles.input} name="quote_no" value={form.quote_no} onChange={onChange} required />
            </label>
            <label className={styles.label}>วันที่ใบเสนอ *
              <input className={styles.input} type="date" name="quote_date" value={form.quote_date} onChange={onChange} required />
            </label>
            <label className={styles.label}>วันหมดอายุ
              <input className={styles.input} type="date" name="valid_until" value={form.valid_until} onChange={onChange} />
            </label>
            <label className={styles.label}>สกุลเงิน
              <input className={styles.input} name="currency" value={form.currency} onChange={onChange} />
            </label>
          </div>
          <label className={styles.checkRow}>
            <input type="checkbox" name="vat_included" checked={form.vat_included} onChange={onChange} />
            <span>ราคานี้รวม VAT</span>
          </label>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>ยอดเงิน</legend>
          <div className={styles.grid3}>
            <label className={styles.label}>ก่อน VAT
              <input className={styles.input} type="number" step="0.01" name="total_before_vat" value={form.total_before_vat} onChange={onChange} />
            </label>
            <label className={styles.label}>VAT
              <input className={styles.input} type="number" step="0.01" name="vat_amount" value={form.vat_amount} onChange={onChange} />
            </label>
            <label className={styles.label}>ยอดสุทธิ *
              <input className={styles.input} type="number" step="0.01" name="total_after_vat" value={form.total_after_vat} onChange={onChange} required />
            </label>
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>เงื่อนไข</legend>
          <div className={styles.grid2}>
            <label className={styles.label}>ส่งมอบ (วัน)
              <input className={styles.input} type="number" name="delivery_days" value={form.delivery_days} onChange={onChange} />
            </label>
            <label className={styles.label}>สถานที่ส่งมอบ
              <input className={styles.input} name="delivery_place" value={form.delivery_place} onChange={onChange} />
            </label>
            <label className={styles.label}>เครดิต/ชำระเงิน
              <input className={styles.input} name="payment_terms" value={form.payment_terms} onChange={onChange} />
            </label>
            <label className={styles.label}>รับประกัน (เดือน)
              <input className={styles.input} type="number" name="warranty_months" value={form.warranty_months} onChange={onChange} />
            </label>
          </div>
          <label className={styles.label}>ลิงก์ไฟล์ใบเสนอ (PDF)
            <input className={styles.input} name="attachment_url" value={form.attachment_url} onChange={onChange} placeholder="เช่น https://..." />
          </label>
          <label className={styles.label}>หมายเหตุ
            <textarea className={styles.textarea} name="note" value={form.note} onChange={onChange} rows={3} />
          </label>
        </fieldset>

        <div className={styles.actions}>
          <Link href={`/purchasing/rfq/${rfqId || ""}`} className={styles.secondaryBtn}>ยกเลิก</Link>
          <button type="submit" className={styles.primaryBtn}>บันทึก & ไปออก PO</button>
        </div>
      </form>
    </div>
  );
}
