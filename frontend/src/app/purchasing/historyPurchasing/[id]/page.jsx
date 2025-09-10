"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { PackageCheck } from "lucide-react";
import { FaTimes } from "react-icons/fa";

/* ───────── helpers ───────── */
const statusLabel = (s) => {
  const t = String(s || "pending").toLowerCase();
  const map = {
    approved: "อนุมัติ",
    completed: "เสร็จสิ้น",
    canceled: "ยกเลิก",
    cancelled: "ยกเลิก",
    pending: "รอดำเนินการ",
  };
  return map[t] || s || "รอดำเนินการ";
};

const badgeClass = (s, css) => {
  const t = String(s || "pending").toLowerCase();
  if (t === "approved") return `${css.stBadge} ${css.approved}`;
  if (t === "completed") return `${css.stBadge} ${css.completed}`;
  if (t === "canceled" || t === "cancelled") return `${css.stBadge} ${css.canceled}`;
  return `${css.stBadge} ${css.pending}`;
};

const fmtDateTH = (d) => {
  try {
    return d
      ? new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" })
      : "-";
  } catch {
    return "-";
  }
};

const fmtMoneyTH = (n, minFrac = 2) => {
  const v = Number(n ?? 0);
  return v.toLocaleString("th-TH", { minimumFractionDigits: minFrac, maximumFractionDigits: minFrac });
};

/* ───────── components ───────── */
const StatusBadge = ({ status }) => (
  <span className={badgeClass(status, styles)}>{statusLabel(status)}</span>
);

export default function HistoryDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isReady = typeof id === "string" && id.length > 0;

  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);

  // โหลดข้อมูลเมื่อได้ id แล้ว
  useEffect(() => {
    if (!isReady) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get(`/po/${id}`);
        if (alive) setPoData(res.data);
      } catch (err) {
        console.error("❌ load detail error:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [id, isReady]);

  const items = poData?.items || [];

  // คำนวณยอดสำรอง (กรณีแบ็กเอนด์ไม่ส่ง)
  const calc = useMemo(() => {
    const subtotalCalc = items.reduce((sum, it) => {
      const qty = Number(it?.quantity ?? 0);
      const price = Number(it?.price ?? 0);
      const discount = Number(it?.discount ?? 0);
      return sum + Math.max(qty * price - discount, 0);
    }, 0);
    const vatRate = Number(poData?.vat_rate ?? 7);
    const vatAmount = poData?.vat_amount != null ? Number(poData.vat_amount) : (subtotalCalc * vatRate) / 100;
    const grandTotal = poData?.grand_total != null ? Number(poData.grand_total) : subtotalCalc + vatAmount;
    return {
      subtotal: poData?.subtotal != null ? Number(poData.subtotal) : subtotalCalc,
      vatRate,
      vatAmount,
      grandTotal,
    };
  }, [items, poData]);

  const attachmentTypes = [
    { label: "ใบเสนอราคา", type: "quotation" },
    { label: "ใบส่งของ / ใบส่งมอบ", type: "delivery_note" },
    { label: "ใบกำกับภาษี", type: "tax_invoice" },
    { label: "ใบแจ้งหนี้", type: "invoice" },
    { label: "หลักฐานการจ่ายเงิน", type: "payment_proof" },
    { label: "ใบเสร็จรับเงิน", type: "receipt" },
    { label: "สัญญาซื้อขาย", type: "contract" },
    { label: "อื่น ๆ", type: "other" },
  ];

  const groupedFiles = useMemo(() => {
    const files = poData?.attachments || [];
    return files.reduce((acc, f) => {
      const key = f?.file_category || "other";
      acc[key] = [...(acc[key] || []), f];
      return acc;
    }, {});
  }, [poData]);

  // รอ id / กำลังโหลด
  if (!isReady || loading) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.skeletonHeader} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonTable} />
        </div>
      </div>
    );
  }

  if (!poData) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.pageBar}>
            <div className={styles.titleGroup}>
              <h1 className={styles.pageTitle}>
                <PackageCheck size={28} /> รายละเอียดประวัติการสั่งซื้อ
              </h1>
            </div>
            <Link href="/purchasing/historyPurchasing" className={`${styles.ghostBtn} ${styles.actionButton}`}>
              <FaTimes size={18} /> กลับไปประวัติ
            </Link>
          </div>
          <div className={styles.emptyState}>❌ ไม่พบข้อมูลใบสั่งซื้อ</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* ── Header ───────────────────────────────────────── */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
               รายละเอียดประวัติการสั่งซื้อ
            </h1>
            <p className={styles.subtitle}>ใบสั่งซื้อเลขที่ {poData.po_no || "-"}</p>
          </div>
          <Link href="/purchasing/historyPurchasing" className={`${styles.ghostBtn} ${styles.actionButton}`}>
            <FaTimes size={18} /> กลับไปประวัติ
          </Link>
        </div>

        {/* ── PO Info ──────────────────────────────────────── */}
        <section className={styles.detail}>
          <h2 className={styles.sectionTitle}>📦 ข้อมูลใบสั่งซื้อ</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>สถานะ</span>
              <span className={styles.infoValue}><StatusBadge status={poData.po_status} /></span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>วันที่สร้าง</span>
              <span className={styles.infoValue}>{fmtDateTH(poData.created_at)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ซัพพลายเออร์</span>
              <span className={styles.infoValue}>{poData.supplier_name || "-"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ผู้สร้าง</span>
              <span className={styles.infoValue}>{poData.created_by_name || poData.created_by || "-"}</span>
            </div>
            <div className={`${styles.infoItem} ${styles.span2}`}>
              <span className={styles.infoLabel}>หมายเหตุ</span>
              <span className={styles.infoValue}>{poData.notes || "-"}</span>
            </div>
          </div>

          {/* ── Items Table ───────────────────────────────── */}
          <h3 className={styles.sectionTitle}>📑 รายการสินค้า</h3>
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div>ชื่อสินค้า</div>
              <div className={styles.centerCell}>จำนวน</div>
              <div className={styles.centerCell}>หน่วย</div>
              <div className={styles.rightCell}>ราคา/หน่วย</div>
              <div className={styles.rightCell}>ส่วนลด</div>
              <div className={styles.rightCell}>รวม</div>
            </div>

            {items.length > 0 ? (
              items.map((item) => {
                const qty = Number(item?.quantity ?? 0);
                const price = Number(item?.price ?? 0);
                const discount = Number(item?.discount ?? 0);
                const total = Math.max(qty * price - discount, 0);
                return (
                  <div
                    key={item.po_item_id ?? `${item.item_id}-${item.item_name}`}
                    className={`${styles.tableGrid} ${styles.tableRow}`}
                  >
                    <div className={styles.textWrap} title={item.item_name}>{item.item_name || "-"}</div>
                    <div className={styles.centerCell}>{fmtMoneyTH(qty, 0)}</div>
                    <div className={styles.centerCell}>{item.unit || "-"}</div>
                    <div className={styles.rightCell}>{fmtMoneyTH(price)} บาท</div>
                    <div className={styles.rightCell}>{fmtMoneyTH(discount)} บาท</div>
                    <div className={styles.rightCell}><strong>{fmtMoneyTH(total)} บาท</strong></div>
                  </div>
                );
              })
            ) : (
              <div className={styles.noDataRow}>ไม่มีรายการสินค้า</div>
            )}
          </div>

          {/* ── Summary ──────────────────────────────────── */}
          <div className={styles.summaryContainer}>
            <div className={styles.summaryRow}>
              <span>รวม (ก่อน VAT):</span>
              <span>{fmtMoneyTH(calc.subtotal)} บาท</span>
            </div>
            <div className={styles.summaryRow}>
              <span>VAT ({fmtMoneyTH(calc.vatRate, 0)}%):</span>
              <span>{fmtMoneyTH(calc.vatAmount)} บาท</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
              <span>ยอดสุทธิ:</span>
              <span>{fmtMoneyTH(calc.grandTotal)} บาท</span>
            </div>
          </div>

          {/* ── Attachments ──────────────────────────────── */}
          <h3 className={styles.sectionTitle}>เอกสารแนบ</h3>
          <div className={styles.fileGrid}>
            {attachmentTypes.map((t) => {
              const files = groupedFiles[t.type] || [];
              return (
                <div key={t.type} className={styles.fileGroup}>
                  <div className={styles.fileLabelRow}>
                    <label className={styles.fileLabel}>{t.label}</label>
                    <span className={styles.fileCount}>{files.length}</span>
                  </div>
                  <div className={styles.fileList}>
                    {files.length > 0 ? (
                      files.map((f) => (
                        <div key={f.file_id ?? `${t.type}-${f.file_name}`} className={styles.fileItem}>
                          <a
                            href={f.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.fileLink}
                            title={f.file_name}
                          >
                            {f.file_name}
                          </a>
                        </div>
                      ))
                    ) : (
                      <span className={styles.noFile}>ไม่มีไฟล์</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
