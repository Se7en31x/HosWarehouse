"use client";
import {
  Truck,
  ArrowRight,
  Hand,
  AlertTriangle,
  Wrench,
  Trash2,
  ChevronRight,
  FileClock,
  Undo,
} from "lucide-react";
import styles from "./page.module.css";

const historyItems = [
  {
    id: "import",
    title: "ประวัตินำเข้า",
    description: "ดูประวัติการนำเข้าสินค้าทั้งหมด",
    icon: Truck,
    color: "blue",
    link: "/manage/history/import",
  },
  {
    id: "withdraw",
    title: "ประวัติการเบิก",
    description: "ดูประวัติการเบิกสินค้า",
    icon: ArrowRight,
    color: "green",
    link: "/manage/history/withdraw",
  },
  {
    id: "borrow-return",
    title: "ประวัติยืม / คืน",
    description: "ตรวจสอบประวัติการยืมและการคืน",
    icon: Hand,
    color: "purple",
    link: "/manage/history/borrow-return",
  },
  {
    id: "expired",
    title: "ประวัติสินค้าหมดอายุ",
    description: "รายการสินค้าที่หมดอายุ",
    icon: AlertTriangle,
    color: "red",
    link: "/manage/history/expired",
  },
  {
    id: "damaged",
    title: "ประวัติสินค้าชำรุด / สูญหาย",
    description: "ติดตามสินค้าที่เสียหายหรือสูญหาย",
    icon: Wrench,
    color: "pink",
    link: "/manage/history/damaged",
  },
  {
    id: "stockout",
    title: "ประวัติการนำออก",
    description: "ตรวจสอบสินค้าที่ถูกนำออก",
    icon: Trash2,
    color: "gray",
    link: "/manage/history/stockout",
  },
];

export default function HistoryPage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <FileClock className={styles.headerIcon} />
        <div>
          <h1 className={styles.title}>ประวัติคลังพัสดุ</h1>
          <p className={styles.subtitle}>ติดตามการเคลื่อนไหวของคลัง</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className={styles.grid}>
        {historyItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <a key={item.id} href={item.link} className={`${styles.card} ${styles[item.color]}`}>
              <div className={`${styles.iconWrapper} ${styles[item.color]}`}>
                <IconComponent className={styles.icon} />
              </div>

              <div className={styles.textContent}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDesc}>{item.description}</p>
              </div>

              <ChevronRight className={styles.arrow} />
            </a>
          );
        })}
      </div>
    </div>
  );
}
