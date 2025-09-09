"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { FaFileAlt, FaFileInvoice, FaFileSignature, FaUsers, FaTruck } from "react-icons/fa";

export default function ReportMainPage() {
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <h1 className={styles.pageTitle}>📊 รายงานระบบจัดซื้อ</h1>
        <p className={styles.subtitle}>เลือกประเภทของรายงานที่ต้องการดู / ดาวน์โหลด</p>

        <div className={styles.cardGrid}>
          <Link href="/purchasing/reportpurchas/poReport" className={styles.card}>
            <FaFileInvoice size={28} />
            <span>รายงานการสั่งซื้อ (PO)</span>
          </Link>

          <Link href="/purchasing/reportpurchas/rfq" className={styles.card}>
            <FaFileAlt size={28} />
            <span>รายงานใบขอราคา (RFQ)</span>
          </Link>

          <Link href="/purchasing/reportpurchas/pr" className={styles.card}>
            <FaFileSignature size={28} />
            <span>รายงานใบขอซื้อ (PR)</span>
          </Link>

          <Link href="/purchasing/reportpurchas/supplier" className={styles.card}>
            <FaUsers size={28} />
            <span>รายงานซัพพลายเออร์</span>
          </Link>

          {/* ✅ รายงานใหม่ GR Report */}
          <Link href="/purchasing/reportpurchas/grReport" className={styles.card}>
            <FaTruck size={28} />
            <span>รายงานการรับสินค้า (GR)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
