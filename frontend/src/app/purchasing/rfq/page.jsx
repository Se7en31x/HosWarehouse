"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaEye } from "react-icons/fa";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function RfqListPage() {
  const [rfqList, setRfqList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== Pagination (เหมือนโค้ดหลัก) =====
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchRfq = async () => {
      try {
        const response = await axiosInstance.get("/rfq/all");
        setRfqList(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error("Error fetching RFQ list:", err);
        setError("ไม่สามารถดึงข้อมูลรายการใบขอราคาได้");
      } finally {
        setLoading(false);
      }
    };
    fetchRfq();
  }, []);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  // รวมหน้า
  const totalPages = useMemo(() => {
    const t = Math.ceil((rfqList?.length || 0) / rowsPerPage);
    return t > 0 ? t : 1;
  }, [rfqList]);

  // กันหลุดหน้าเมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // ตัดข้อมูลตามหน้า + เติมแถวว่างให้ครบ 10
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = (rfqList || []).slice(start, end);
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

  // Badge สีสถานะ (เผื่อหลายระบบสถานะ)
  const getStatusClass = (s = "") => {
    const k = String(s).toLowerCase();
    if (["approved", "closed", "completed"].includes(k)) return styles.badgeGreen;
    if (["submitted", "open", "sent", "processing"].includes(k)) return styles.badgeBlue;
    if (["rejected", "canceled", "cancelled"].includes(k)) return styles.badgeRed;
    if (["draft"].includes(k)) return styles.badgeYellow;
    return styles.badgeGray;
  };

  if (loading) {
    return (
      <div className={styles.pageBackground}>
        <div className={styles.card}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageBackground}>
        <div className={styles.card}>
          <p style={{ color: "red", padding: 12 }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageBackground}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>รายการใบขอราคา (RFQ)</h1>
        </div>

        {rfqList.length === 0 ? (
          <p className={styles.empty}>ยังไม่มีรายการใบขอราคาในระบบ</p>
        ) : (
          <div className={styles.tableFrame}>
            {/* Header */}
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>เลขที่ RFQ</div>
              <div className={styles.headerItem}>สถานะ</div>
              <div className={styles.headerItem}>วันที่สร้าง</div>
              <div className={styles.headerItem}>ผู้สร้าง</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>การจัดการ</div>
            </div>

            {/* Body */}
            <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
              {displayRows.map((rfq, idx) => {
                const placeholder = !!rfq._placeholder;
                return (
                  <div
                    key={placeholder ? `p-${currentPage}-${idx}` : `rfq-${rfq.rfq_id}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ""}`}
                  >
                    <div className={styles.tableCell}>{placeholder ? "" : rfq.rfq_no}</div>
                    <div className={styles.tableCell}>
                      {placeholder ? "" : (
                        <span className={`${styles.statusBadge} ${getStatusClass(rfq.status)}`}>
                          {rfq.status || "-"}
                        </span>
                      )}
                    </div>
                    <div className={styles.tableCell}>{placeholder ? "" : formatDate(rfq.created_at)}</div>
                    <div className={styles.tableCell}>{placeholder ? "" : (rfq.created_by_name || "-")}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {!placeholder && (
                        <Link href={`/purchasing/rfq/${rfq.rfq_id}`} className={styles.detailButton}>
                          <FaEye className={styles.icon} />
                          <span>ดูรายละเอียด</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ✅ Pagination แบบเดียวกับหน้าที่แล้ว */}
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
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
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}