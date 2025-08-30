"use client";
import Link from "next/link";
import {
  Package,
  Download,
  ShoppingCart,
  Repeat,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";
import styles from "./page.module.css";

export default function ReportsMainPage() {
  const reports = [
    {
      title: "รายงานคงคลัง",
      description: "ดูพัสดุคงเหลือแยกตามประเภทและแผนก",
      icon: <Package size={40} color="#2563eb" />,
      href: "/manage/reports/inventory",
      bg: styles.blue,
    },
    {
      title: "รายงานการรับเข้า",
      description: "สรุปจำนวนและมูลค่าการรับเข้าพัสดุ",
      icon: <Download size={40} color="#16a34a" />,
      href: "/manage/reports/inflowReport",
      bg: styles.green,
    },
    {
      title: "รายงานการเบิก–จ่าย",
      description: "ดูการเบิกจ่ายแยกตามแผนกและประเภทพัสดุ",
      icon: <ShoppingCart size={40} color="#f59e0b" />,
      href: "/manage/reports/outflowReport",
      bg: styles.orange,
    },
    {
      title: "รายงานการยืม–คืน",
      description: "ติดตามพัสดุที่ถูกยืม คืนแล้ว/ยังไม่คืน",
      icon: <Repeat size={40} color="#9333ea" />,
      href: "/manage/reports/return",
      bg: styles.purple,
    },
    {
      title: "รายงานพัสดุหมดอายุ",
      description: "ตรวจสอบ lot ที่หมดอายุและการทำลาย",
      icon: <AlertTriangle size={40} color="#dc2626" />,
      href: "/manage/reports/expiredReport",
      bg: styles.red,
    },
    {
      title: "รายงานพัสดุชำรุด/เสียหาย",
      description: "แสดงจำนวนพัสดุที่ชำรุด วิธีจัดการ (ซ่อม/ทิ้ง)",
      icon: <ShieldAlert size={40} color="#eab308" />,
      href: "/manage/reports/damagedReport",
      bg: styles.yellow,
    },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📊 รายงานระบบคลังพัสดุ</h1>
      <p className={styles.subtitle}>
        เลือกประเภทของรายงานที่ต้องการดูหรือดาวน์โหลด
      </p>

      <div className={styles.grid}>
        {reports.map((report, idx) => (
          <Link
            key={idx}
            href={report.href}
            className={`${styles.card} ${report.bg}`}
          >
            <div className={styles.icon}>{report.icon}</div>
            <h2 className={styles.cardTitle}>{report.title}</h2>
            <p className={styles.cardDesc}>{report.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
