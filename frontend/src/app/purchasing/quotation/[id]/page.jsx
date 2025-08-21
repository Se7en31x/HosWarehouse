"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

export default function QuotationDetailPage() {
  const params = useParams();
  const pathname = usePathname();

  const quotationId = useMemo(() => {
    let v = params?.id;
    if (Array.isArray(v)) v = v[0];
    if (!v && pathname) {
      const m = pathname.match(/\/purchasing\/quotation\/([^/?#]+)/);
      if (m) v = decodeURIComponent(m[1]);
    }
    return v;
  }, [params, pathname]);

  const [data, setData] = useState(null);
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!quotationId) { setLoad(false); setErr("ไม่พบ ID"); return; }
    (async () => {
      try {
        const res = await axiosInstance.get(`/quotation/${quotationId}`); // ← ทำ endpoint นี้
        setData(res.data || null);
      } catch (e) {
        console.error(e);
        setErr("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoad(false);
      }
    })();
  }, [quotationId]);

  const fdate = (d) => {
    try { return new Date(d).toLocaleDateString("th-TH",{ year:"numeric", month:"short", day:"numeric" }); }
    catch { return "-"; }
  };

  if (load) return <div className={styles.container}>กำลังโหลด...</div>;
  if (err)  return <div className={styles.container} style={{color:"red"}}>{err}</div>;
  if (!data) return <div className={styles.container}>ไม่พบข้อมูล</div>;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <Link href="/purchasing/quotation" className={styles.secondaryBtn}>← กลับหน้ารวม</Link>
        <Link href={`/purchasing/po/create?rfq_id=${data.rfq_id}`} className={styles.primaryBtn}>ไปออก PO</Link>
      </div>

      <h1 className={styles.title}>รายละเอียดใบเสนอราคา</h1>

      <div className={styles.infoGrid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>ข้อมูลเอกสาร</h3>
          <div className={styles.kv}><span className={styles.k}>RFQ</span><span className={styles.v}>{data.rfq_no ? data.rfq_no : `#${data.rfq_id}`}</span></div>
          <div className={styles.kv}><span className={styles.k}>เลขที่ใบเสนอ</span><span className={styles.v}>{data.quote_no}</span></div>
          <div className={styles.kv}><span className={styles.k}>วันที่ใบเสนอ</span><span className={styles.v}>{fdate(data.quote_date)}</span></div>
          <div className={styles.kv}><span className={styles.k}>วันหมดอายุ</span><span className={styles.v}>{fdate(data.valid_until)}</span></div>
          <div className={styles.kv}><span className={styles.k}>สกุลเงิน/VAT</span><span className={styles.v}>{data.currency || "THB"} | {data.vat_included ? "รวม VAT" : "ไม่รวม VAT"}</span></div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>ผู้ขาย</h3>
          <div className={styles.kv}><span className={styles.k}>ชื่อผู้ขาย</span><span className={styles.v}>{data.supplier_name}</span></div>
          {data.supplier_id ? <div className={styles.kv}><span className={styles.k}>รหัสผู้ขาย</span><span className={styles.v}>{data.supplier_id}</span></div> : null}
          {data.supplier_taxid ? <div className={styles.kv}><span className={styles.k}>เลขภาษี</span><span className={styles.v}>{data.supplier_taxid}</span></div> : null}
          <div className={styles.kv}><span className={styles.k}>ผู้ติดต่อ</span><span className={styles.v}>{data.supplier_contact || "-"}</span></div>
          <div className={styles.kv}><span className={styles.k}>โทร/อีเมล</span><span className={styles.v}>{[data.supplier_phone, data.supplier_email].filter(Boolean).join(" | ") || "-"}</span></div>
        </section>
      </div>

      <div className={styles.infoGrid}>
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>ยอดเงิน</h3>
          <div className={styles.kv}><span className={styles.k}>ก่อน VAT</span><span className={styles.v}>{Number(data.total_before_vat || 0).toLocaleString("th-TH",{maximumFractionDigits:2})}</span></div>
          <div className={styles.kv}><span className={styles.k}>VAT</span><span className={styles.v}>{Number(data.vat_amount || 0).toLocaleString("th-TH",{maximumFractionDigits:2})}</span></div>
          <div className={styles.kv}><span className={styles.k}><b>ยอดสุทธิ</b></span><span className={styles.v}><b>{Number(data.total_after_vat || 0).toLocaleString("th-TH",{maximumFractionDigits:2})} {data.currency || "THB"}</b></span></div>
        </section>

        <section className={styles.card}>
          <h3 className={styles.cardTitle}>เงื่อนไข</h3>
          <div className={styles.kv}><span className={styles.k}>ส่งมอบภายใน</span><span className={styles.v}>{data.delivery_days ? `${data.delivery_days} วัน` : "-"}</span></div>
          <div className={styles.kv}><span className={styles.k}>สถานที่ส่งมอบ</span><span className={styles.v}>{data.delivery_place || "-"}</span></div>
          <div className={styles.kv}><span className={styles.k}>เครดิต/ชำระเงิน</span><span className={styles.v}>{data.payment_terms || "-"}</span></div>
          <div className={styles.kv}><span className={styles.k}>รับประกัน</span><span className={styles.v}>{data.warranty_months ? `${data.warranty_months} เดือน` : "-"}</span></div>
          <div className={styles.kv}><span className={styles.k}>หมายเหตุ</span><span className={styles.v}>{data.note || "-"}</span></div>
          {data.attachment_url ? (
            <div className={styles.kv}><span className={styles.k}>ไฟล์แนบ</span><span className={styles.v}><a href={data.attachment_url} target="_blank" rel="noreferrer">เปิดไฟล์</a></span></div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
