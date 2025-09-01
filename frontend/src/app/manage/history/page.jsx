"use client";
import {
  Truck,
  ClipboardList,
  Hand,
  AlertTriangle,
  Wrench,
  PackageMinus,
  ChevronRight,
} from "lucide-react";
import styles from "./page.module.css";

const historyItems = [
  {
    id: "stockin",
    title: "ประวัตินำเข้า",
    description: "ดูบันทึกรายการนำเข้าทั้งหมด",
    icon: Truck,
    color: "blue",
    link: "/manage/history/stockin",
  },
  {
    id: "withdraw",
    title: "ประวัติการเบิก",
    description: "ดูบันทึกรายการเบิกจากคลัง",
    icon: ClipboardList,
    color: "green",
    link: "/manage/history/withdraw",
  },
  {
    id: "borrow-return",
    title: "ประวัติการยืม / คืน",
    description: "ตรวจสอบบันทึกการยืมและการคืน",
    icon: Hand,
    color: "purple",
    link: "/manage/history/borrow-return",
  },
  {
    id: "expired",
    title: "ประวัติรายการหมดอายุ",
    description: "ดูบันทึกของรายการที่หมดอายุ",
    icon: AlertTriangle,
    color: "red",
    link: "/manage/history/expired",
  },
  {
    id: "damaged",
    title: "ประวัติรายการชำรุด / สูญหาย",
    description: "ติดตามบันทึกรายการที่ชำรุดหรือสูญหาย",
    icon: Wrench,
    color: "pink",
    link: "/manage/history/damaged",
  },
  {
    id: "stockout",
    title: "ประวัติการนำออก",
    description: "ดูบันทึกของรายการที่ถูกนำออกจากคลัง",
    icon: PackageMinus,
    color: "gray",
    link: "/manage/history/stockout",
  },
];

export default function HistoryPage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>ประวัติคลัง</h1>
          <p className={styles.subtitle}>ติดตามบันทึกการเคลื่อนไหวของคลัง</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className={styles.grid}>
        {historyItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <a
              key={item.id}
              href={item.link}
              className={`${styles.card} ${styles[item.color]}`}
            >
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
