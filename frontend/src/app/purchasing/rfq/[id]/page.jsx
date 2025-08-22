// src/app/purchasing/rfq/[id]/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
import Link from "next/link";
import styles from "./page.module.css";

import exportPDF from "@/app/components/pdf/PDFExporter";
import rfqTemplate from "@/app/components/pdf/templates/rfqTemplate";

export default function RfqDetailPage() {
  const params = useParams();
  const pathname = usePathname();

  const rfqId = useMemo(() => {
    let v = params?.id;
    if (Array.isArray(v)) v = v[0];
    if (!v && pathname) {
      const m = pathname.match(/\/purchasing\/rfq\/([^/?#]+)/);
      if (m) v = decodeURIComponent(m[1]);
    }
    return v;
  }, [params, pathname]);

  const [rfqDetails, setRfqDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRfqDetails = async (id, signal) => {
    try {
      const res = await axiosInstance.get(`/rfq/${encodeURIComponent(id)}`, {
        timeout: 10000,
        signal,
      });
      setRfqDetails(res.data);
      setError(null);
    } catch (err) {
      if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") return;
      console.error("❌ Error fetching RFQ details:", err);
      setError(
        `ไม่สามารถดึงข้อมูลรายละเอียดใบขอราคาได้: ${
          err.response?.data?.message || err.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setRfqDetails(null);
    setError(null);

    if (!rfqId) {
      setLoading(false);
      setError("ไม่มี ID ของ RFQ");
      return;
    }

    const controller = new AbortController();
    fetchRfqDetails(rfqId, controller.signal);
    return () => controller.abort();
  }, [rfqId]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  // ✅ ปรับปรุง: เพิ่มสถานะ 'created'
  const getThaiRfqStatus = (status) => {
    switch (status) {
      case 'created':
        return 'สร้างแล้ว';
      case 'open':
        return 'เปิด';
      case 'closed':
        return 'ปิด';
      case 'awarded':
        return 'อนุมัติผู้ขายแล้ว';
      case 'cancelled':
        return 'ยกเลิก';
      default:
        return status;
    }
  };

  const handleExportPDF = async () => {
    if (!rfqDetails) return;
    const { title, meta, columns, rows, filename } = rfqTemplate(
      rfqDetails,
      formatDate
    );
    await exportPDF({
      title,
      meta,
      columns,
      rows,
      filename,
      footerNote: "เอกสารนี้สร้างโดยระบบคลังพัสดุ",
    });
  };

  if (loading) return <div className={styles.container}>กำลังโหลดข้อมูล...</div>;

  if (error) {
    return (
      <div className={styles.container} style={{ color: "red" }}>
        {error}
        <Link href="/purchasing/rfq" className={styles.backButton}>
          &larr; กลับหน้ารายการ
        </Link>
      </div>
    );
  }

  if (!rfqDetails) {
    return (
      <div className={styles.container}>
        ไม่พบรายการใบขอราคานี้
        <Link href="/purchasing/rfq" className={styles.backButton}>
          &larr; กลับหน้ารายการ
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <Link href="/purchasing/rfq" className={styles.backButton}>
          &larr; กลับหน้ารายการ
        </Link>

        <div className={styles.actionGroup}>
          <button type="button" className={styles.primaryButton} onClick={handleExportPDF}>
            ออกเป็น PDF จากใบนี้
          </button>
        </div>
      </div>

      <h1 className={styles.title}>
        รายละเอียดใบขอราคา #{rfqDetails.rfq_no}
      </h1>

      <div className={styles.rfqSummary}>
        <div className={styles.summaryItem}>
          <p>เลขที่ RFQ:</p>
          <span>{rfqDetails.rfq_no}</span>
        </div>
        <div className={styles.summaryItem}>
          <p>ผู้สร้าง:</p>
          <span>{rfqDetails.created_by_name}</span>
        </div>
        <div className={styles.summaryItem}>
          <p>วันที่สร้าง:</p>
          <span>{formatDate(rfqDetails.created_at)}</span>
        </div>
        <div className={styles.summaryItem}>
          <p>สถานะ:</p>
          <span className={styles.statusBadge}>{getThaiRfqStatus(rfqDetails.status)}</span>
        </div>
      </div>

      <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชื่อสินค้า</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {(rfqDetails.items || []).map((item, index) => (
            <tr key={item.rfq_detail_id || index}>
              <td>{index + 1}</td>
              <td>{item.item_name}</td>
              <td>{item.qty}</td>
              <td>{item.unit}</td>
              <td>{item.remark || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}