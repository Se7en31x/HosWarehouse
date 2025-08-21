"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaEye, FaPlus } from "react-icons/fa";

export default function QuotationListPage() {
  const [rows, setRows] = useState([]);
  const [load, setLoad] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get("/quotation"); // ← ทำ endpoint นี้
        setRows(res.data || []);
      } catch (e) {
        console.error(e);
        setErr("ไม่สามารถดึงข้อมูลได้");
      } finally {
        setLoad(false);
      }
    })();
  }, []);

  const fdate = (d) => {
    try {
      return new Date(d).toLocaleDateString("th-TH", { year:"numeric", month:"short", day:"numeric" });
    } catch { return "-"; }
  };

  if (load) return <div className={styles.container}>กำลังโหลด...</div>;
  if (err)  return <div className={styles.container} style={{color:"red"}}>{err}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.title}>ใบเสนอราคา (Quotation)</h1>
        <Link href="/purchasing/quotation/create" className={styles.primaryBtn}>
          <FaPlus className={styles.icon} />
          <span>เพิ่มใบเสนอราคา</span>
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>ยังไม่มีข้อมูล</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>เลขที่ใบเสนอ</th>
              <th>RFQ</th>
              <th>ผู้ขาย</th>
              <th className={styles.right}>ยอดสุทธิ</th>
              <th>วันที่ใบเสนอ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => (
              <tr key={q.quotation_id}>
                <td>{q.quote_no}</td>
                <td>{q.rfq_no ? q.rfq_no : `#${q.rfq_id}`}</td>
                <td>{q.supplier_name}</td>
                <td className={styles.right}>
                  {Number(q.total_after_vat || 0).toLocaleString("th-TH",{maximumFractionDigits:2})} {q.currency || "THB"}
                </td>
                <td>{fdate(q.quote_date)}</td>
                <td>
                  <Link href={`/purchasing/quotation/${q.quotation_id}`} className={styles.viewBtn}>
                    <FaEye className={styles.icon} />
                    <span>ดูรายละเอียด</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
