"use client";
import Link from "next/link";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { useEffect, useState } from "react";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  } catch {
    return dateStr;
  }
}

export default function GoodsReceiptDetailPage({ params }) {
  const { id } = params;
  const [grDetail, setGrDetail] = useState(null);
  const ROWS_PER_PAGE = 5;

  // โหลดข้อมูล
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await axiosInstance.get(`/goods-receipts/${id}`, {
          headers: { "Cache-Control": "no-store" },
        });
        setGrDetail(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch details:", err);
        setGrDetail(null);
      }
    }
    fetchData();
  }, [id]);

  if (!grDetail) {
    return <div className={styles.container}>ไม่พบข้อมูลรายการนำเข้า</div>;
  }

  const totalAmount = grDetail.items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.import_price || 0),
    0
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>รายละเอียดรายการนำเข้า #{grDetail.gr_no}</h1>
        <Link href="/manage/goods-receipt" className={styles.backButton}>
          &larr; กลับไปหน้ารายการ
        </Link>
      </header>

      {/* ข้อมูลหลัก */}
      <div className={styles.detailSection}>
        <p><strong>วันที่นำเข้า:</strong> {formatDate(grDetail.import_date)}</p>
        <p><strong>ซัพพลายเออร์:</strong> {grDetail.supplier_name}</p>
        <p><strong>ผู้รับสินค้า:</strong> {grDetail.user_name}</p>
        <p><strong>หมายเหตุ:</strong> {grDetail.import_note || "-"}</p>
      </div>

      {/* ตารางสินค้า */}
      <h2 className={styles.subtitle}>รายการสินค้า</h2>
      <div className={styles.tableSection} style={{ "--rows-per-page": ROWS_PER_PAGE }}>
        {/* Header */}
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div className={styles.headerItem}>ชื่อสินค้า</div>
          <div className={styles.headerItem}>จำนวนที่รับ</div>
          <div className={styles.headerItem}>เลข Lot</div>
          <div className={styles.headerItem}>วันหมดอายุ</div>
          <div className={styles.headerItem}>ราคา/หน่วย</div>
        </div>

        {/* Body → scroll */}
        <div className={styles.inventory}>
          {grDetail.items.map((item, idx) => (
            <div key={idx} className={`${styles.tableGrid} ${styles.tableRow}`}>
              <div className={`${styles.tableCell} ${styles.leftCell}`}>{item.item_name}</div>
              <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.quantity}</div>
              <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.lot_no || "-"}</div>
              <div className={`${styles.tableCell} ${styles.centerCell}`}>{formatDate(item.exp_date)}</div>
              <div className={`${styles.tableCell} ${styles.centerCell}`}>
                {item.import_price?.toLocaleString("th-TH")} ฿
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`${styles.tableGrid} ${styles.tableFooter}`}>
          <div className={`${styles.tableCell} ${styles.leftCell}`} style={{ gridColumn: "1 / span 4" }}>
            <strong>รวมทั้งหมด</strong>
          </div>
          <div className={`${styles.tableCell} ${styles.centerCell}`}>
            <strong>{totalAmount.toLocaleString("th-TH")} ฿</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
