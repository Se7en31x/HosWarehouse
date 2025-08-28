"use client";

import styles from "./Modal.module.css";

const Icon = ({ variant="po" }) => {
  if (variant === "rfq") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M4 4h16v2H4zm0 6h16v2H4zm0 6h10v2H4z"/>
      </svg>
    );
  }
  if (variant === "gr") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path fill="currentColor" d="M5 4h14v2H5zm0 6h14v2H5zm0 6h14v2H5z"/>
      </svg>
    );
  }
  // po
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M7 4h10v2H7zm-2 4h14v2H5zm0 4h14v2H5zm0 4h9v2H5z"/>
    </svg>
  );
};

export default function HistoryModal({
  open,
  title,
  onClose,
  loading = false,
  variant = "po",         // "po" | "rfq" | "gr"
  children,
  rightNode               // optional ปุ่ม/slot ด้านขวาหัว modal
}) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles[`box-${variant}`]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.header} ${styles[`hdr-${variant}`]}`}>
          <div className={styles.titleWrap}>
            <span className={styles.icon}><Icon variant={variant}/></span>
            <h3 className={styles.title}>{title || "รายละเอียด"}</h3>
          </div>
          <div className={styles.headerRight}>
            {rightNode}
            <button className={styles.close} onClick={onClose} aria-label="close">×</button>
          </div>
        </div>

        <div className={styles.body}>
          {loading ? <div className={styles.skeleton}>กำลังโหลด...</div> : (children || <p>ไม่มีข้อมูล</p>)}
        </div>

        <div className={styles.footer}>
          <button className={styles.primary} onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  );
}
