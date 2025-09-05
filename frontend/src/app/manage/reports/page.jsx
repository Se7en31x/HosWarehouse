"use client";
import Link from "next/link";
import {
  Package,
  Download,
  ShoppingCart,
  Repeat,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Send,
} from "lucide-react";
import styles from "./page.module.css";

export default function ReportsMainPage() {
  const reports = [
    {
      id: "inventory",
      title: "รายงานคงคลัง",
      description: "ดูพัสดุคงเหลือแยกตามประเภทและแผนก",
      icon: Package,
      color: "blue",
      href: "/manage/reports/inventory",
    },
    {
      id: "inflow",
      title: "รายงานการรับเข้า",
      description: "สรุปจำนวนและมูลค่าการรับเข้าพัสดุ",
      icon: Download,
      color: "green",
      href: "/manage/reports/inflowReport",
    },
    {
      id: "outflow-borrow",
      title: "รายงานการเบิก–ยืม",
      description: "ดูการเบิกจ่ายแยกตามแผนกและประเภทพัสดุ",
      icon: ShoppingCart,
      color: "orange",
      href: "/manage/reports/outflowReport",
    },
    // ✅ เพิ่มรายงานการนำออกใหม่
    {
      id: "outflow-general",
      title: "รายงานการนำออก",
      description: "ดูการตัดสต็อก, ชำรุด และหมดอายุ",
      icon: Send,
      color: "red",
      href: "/manage/reports/generalOutflowReport", // ✅ Route ใหม่
    },
    {
      id: "return",
      title: "รายงานการคืน",
      description: "ติดตามพัสดุที่ถูกยืม คืนแล้ว/ยังไม่คืน",
      icon: Repeat,
      color: "purple",
      href: "/manage/reports/return",
    },
    {
      id: "expired",
      title: "รายงานพัสดุหมดอายุ",
      description: "ตรวจสอบ lot ที่หมดอายุและการทำลาย",
      icon: AlertTriangle,
      color: "red",
      href: "/manage/reports/expiredReport",
    },
    {
      id: "damaged",
      title: "รายงานพัสดุชำรุด/เสียหาย",
      description: "แสดงจำนวนพัสดุที่ชำรุด วิธีจัดการ (ซ่อม/ทิ้ง)",
      icon: ShieldAlert,
      color: "yellow",
      href: "/manage/reports/damagedReport",
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>📊 รายงานระบบคลังพัสดุ</h1>
        <p className={styles.subtitle}>
          เลือกประเภทของรายงานที่ต้องการดูหรือดาวน์โหลด
        </p>
      </div>

      {/* Cards Grid */}
      <div className={styles.grid}>
        {reports.map((report) => {
          const IconComponent = report.icon;
          return (
            <Link
              key={report.id}
              href={report.href}
              className={`${styles.card} ${styles[report.color]}`}
            >
              <div className={`${styles.iconWrapper} ${styles[report.color]}`}>
                <IconComponent className={styles.icon} />
              </div>
              <div className={styles.textContent}>
                <h3 className={styles.cardTitle}>{report.title}</h3>
                <p className={styles.cardDesc}>{report.description}</p>
              </div>
              <ChevronRight className={styles.arrow} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}