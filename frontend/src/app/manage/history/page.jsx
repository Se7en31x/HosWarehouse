"use client";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  FaTruck,
  FaArrowRight,
  FaHandHolding,
  FaUndo,
  FaExclamationTriangle,
  FaTools,
  FaTrash,
} from "react-icons/fa";

const BLOCKS = [
  { path: "import", label: "นำเข้า (Import)", color: "blue", icon: <FaTruck /> },
  { path: "withdraw", label: "เบิก (Withdraw)", color: "green", icon: <FaArrowRight /> },
  { 
    path: "borrow-return", 
    label: "ยืม / คืน (Borrow & Return)", 
    color: "purple", 
    icon: (
      <div style={{ display: "flex", gap: "6px" }}>
        <FaHandHolding />
        <FaUndo />
      </div>
    ) 
  },
  { path: "expired", label: "ของหมดอายุ (Expired)", color: "red", icon: <FaExclamationTriangle /> },
  { path: "damaged", label: "ชำรุด / สูญหาย", color: "pink", icon: <FaTools /> },
  { path: "stockout", label: "นำออก (Stockout)", color: "gray", icon: <FaTrash /> },
];

export default function HistoryPage() {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ประวัติคลังพัสดุ</h1>
      <nav className={styles.breadcrumb}>
        <span>🏠 Dashboard</span> › <span>📜 ประวัติคลัง</span>
      </nav>

      {/* Summary */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>💊 เบิกเดือนนี้: 45</div>
        <div className={styles.summaryCard}>📥 คืนเดือนนี้: 12</div>
        <div className={styles.summaryCard}>⚠️ หมดอายุ: 5</div>
        <div className={styles.summaryCard}>🛠️ ชำรุด: 3</div>
      </div>

      {/* Blocks */}
      <div className={styles.grid}>
        {BLOCKS.map((b) => (
          <div
            key={b.path}
            className={`${styles.card} ${styles[b.color]}`}
            onClick={() => router.push(`/manage/history/${b.path}`)}
          >
            <div className={styles.icon}>{b.icon}</div>
            <h3 className={styles.cardTitle}>{b.label}</h3>
            <p className={styles.cardDesc}>ดูประวัติ {b.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
