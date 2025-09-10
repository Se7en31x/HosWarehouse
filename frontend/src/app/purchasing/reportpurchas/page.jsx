"use client";

import Link from "next/link";
import {
  FileText,
  FileCheck,
  FileSignature,
  Users,
  Truck,
} from "lucide-react";
import styles from "./page.module.css";

// กำหนดสีและไอคอนเป็น object เพื่อให้ปรับแต่งง่าย
const COLOR_THEMES = {
  blue: { wrapper: "#dbeafe", icon: "#3b82f6", hover: "#eff6ff", shadow: "rgba(59, 130, 246, 0.2)" },
  green: { wrapper: "#d1fae5", icon: "#10b981", hover: "#ecfdf5", shadow: "rgba(16, 185, 129, 0.2)" },
  orange: { wrapper: "#ffedd5", icon: "#f59e0b", hover: "#fff7ed", shadow: "rgba(245, 158, 11, 0.2)" },
  purple: { wrapper: "#e9d5ff", icon: "#9333ea", hover: "#f5f3ff", shadow: "rgba(139, 92, 246, 0.2)" },
  red: { wrapper: "#fee2e2", icon: "#dc2626", hover: "#fef2f2", shadow: "rgba(239, 68, 68, 0.2)" },
};

const ICONS = {
  FileText,
  FileCheck,
  FileSignature,
  Users,
  Truck,
};

// คอมโพเนนต์ย่อยสำหรับการ์ด
function ReportCard({ report }) {
  const IconComponent = ICONS[report.icon] || FileText; // Fallback ไปที่ FileText ถ้าไอคอนไม่ถูกต้อง
  return (
    <Link href={report.href} className={`${styles.card} ${styles[report.color]}`}>
      <div className={`${styles.iconWrapper} ${styles[report.color]}`}>
        <IconComponent className={styles.icon} />
      </div>
      <div className={styles.textContent}>
        <h3 className={styles.cardTitle}>{report.title}</h3>
        {report.description && <p className={styles.cardDesc}>{report.description}</p>}
      </div>
    </Link>
  );
}

// คอมโพเนนต์หลัก
export default function ReportMainPage({
  reports = [],
  title = "📊 รายงานระบบจัดซื้อ",
  subtitle = "เลือกประเภทของรายงานที่ต้องการดูหรือดาวน์โหลด",
}) {
  // รายการการ์ดเริ่มต้น (ถ้าไม่ส่ง props เข้ามา)
  const defaultReports = [
    {
      id: "po-report",
      title: "รายงานการสั่งซื้อ (PO)",
      description: "สรุปข้อมูลการสั่งซื้อทั้งหมด",
      icon: "FileCheck",
      color: "blue",
      href: "/purchasing/reportpurchas/poReport",
    },
    {
      id: "rfq-report",
      title: "รายงานใบขอราคา (RFQ)",
      description: "ดูข้อมูลใบขอราคาจากซัพพลายเออร์",
      icon: "FileText",
      color: "green",
      href: "/purchasing/reportpurchas/rfq",
    },
    {
      id: "pr-report",
      title: "รายงานใบขอซื้อ (PR)",
      description: "ติดตามใบขอซื้อตามแผนกและสถานะ",
      icon: "FileSignature",
      color: "orange",
      href: "/purchasing/reportpurchas/pr",
    },
    {
      id: "supplier-report",
      title: "รายงานซัพพลายเออร์",
      description: "วิเคราะห์ข้อมูลซัพพลายเออร์และประสิทธิภาพ",
      icon: "Users",
      color: "purple",
      href: "/purchasing/reportpurchas/supplier",
    },
    {
      id: "gr-report",
      title: "รายงานการรับสินค้า (GR)",
      description: "สรุปข้อมูลการรับสินค้าและสต็อก",
      icon: "Truck",
      color: "red",
      href: "/purchasing/reportpurchas/grReport",
    },
  ];

  const reportList = reports.length > 0 ? reports : defaultReports;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
      <div className={styles.grid}>
        {reportList.map((report) => (
          <ReportCard key={report.id} report={report} />
        ))}
      </div>
    </div>
  );
}