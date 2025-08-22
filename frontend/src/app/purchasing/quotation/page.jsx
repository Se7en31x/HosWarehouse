"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaEye, FaPlus } from "react-icons/fa";

export default function QuotationListPage() {
  const [rows, setRows] = useState([]);
  const [load, setLoad] = useState(true);
  const [err,   setErr] = useState(null);

  // Pagination (เหมือนโค้ดหลัก)
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await axiosInstance.get("/quotation");
        setRows(Array.isArray(res.data) ? res.data : []);
        setErr(null);
      } catch (e) {
        console.error(e);
        setErr("ไม่สามารถดึงข้อมูลได้");
      } finally {
        setLoad(false);
      }
    })();
  }, []);

  const fdate = (d) => {
    try {
      return new Date(d).toLocaleDateString("th-TH", {
        year: "numeric", month: "short", day: "numeric"
      });
    } catch { return "-"; }
  };

  // รวมหน้า
  const totalPages = useMemo(() => {
    const t = Math.ceil((rows?.length || 0) / rowsPerPage);
    return t > 0 ? t : 1;
  }, [rows]);

  // กันหลุดหน้า
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // ตัดหน้า + เติมแถวว่างให้ครบ 10
  const start = (currentPage - 1) * rowsPerPage;
  const end   = start + rowsPerPage;
  const pageRows = (rows || []).slice(start, end);
  const displayRows = [...pageRows];
  while (displayRows.length < rowsPerPage) displayRows.push({ _placeholder: true });

  // หมายเลขหน้าแบบมี …
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  if (load) {
    return (
      <div className={styles.pageBackground}>
        <div className={styles.card}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>กำลังโหลดใบเสนอราคา…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageBackground}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>ใบเสนอราคา (Quotation)</h1>
          <Link href="/purchasing/quotation/create" className={styles.primaryBtn}>
            <FaPlus className={styles.icon} />
            <span>เพิ่มใบเสนอราคา</span>
          </Link>
        </div>

        {err ? (
          <p className={styles.empty} style={{ color: "red" }}>{err}</p>
        ) : rows.length === 0 ? (
          <p className={styles.empty}>ยังไม่มีข้อมูล</p>
        ) : (
          <div className={styles.tableFrame}>
            {/* Header */}
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>เลขที่ใบเสนอ</div>
              <div className={styles.headerItem}>RFQ</div>
              <div className={styles.headerItem}>ผู้ขาย</div>
              <div className={`${styles.headerItem} ${styles.right}`}>ยอดสุทธิ</div>
              <div className={styles.headerItem}>วันที่ใบเสนอ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>ดูรายละเอียด</div>
            </div>

            {/* Body */}
            <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
              {displayRows.map((q, idx) => {
                const placeholder = !!q._placeholder;
                const key = placeholder ? `empty-${currentPage}-${idx}` : `q-${q.quotation_id}`;
                return (
                  <div
                    key={key}
                    className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ""}`}
                  >
                    <div className={styles.tableCell}>{placeholder ? "" : q.quote_no}</div>
                    <div className={styles.tableCell}>{placeholder ? "" : (q.rfq_no ? q.rfq_no : `#${q.rfq_id}`)}</div>
                    <div className={styles.tableCell}>{placeholder ? "" : q.supplier_name}</div>
                    <div className={`${styles.tableCell} ${styles.right}`}>
                      {placeholder ? "" : `${Number(q.total_after_vat || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ${q.currency || "THB"}`}
                    </div>
                    <div className={styles.tableCell}>{placeholder ? "" : fdate(q.quote_date)}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {!placeholder && (
                        <Link href={`/purchasing/quotation/${q.quotation_id}`} className={styles.detailButton}>
                          <FaEye className={styles.icon} />
                          <span>ดูรายละเอียด</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  ‹ ก่อนหน้า
                </button>
              </li>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <li key={`e-${i}`} className={styles.ellipsis}>…</li>
                ) : (
                  <li key={`p-${p}`}>
                    <button
                      className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  </li>
                )
              )}
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  ถัดไป ›
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
