// src/app/purchasing/pr/page.jsx
"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react"; // ✅ import ไอคอน

export default function PurchasingPrPage() {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  // แปลสถานะ
  const statusMap = {
    submitted: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ปฏิเสธแล้ว",
    draft: "ฉบับร่าง",
    canceled: "ยกเลิก",
    processed: "กำลังดำเนินการ",
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "submitted":
        return styles.submitted;
      case "approved":
        return styles.approved;
      case "rejected":
        return styles.rejected;
      default:
        return styles.defaultStatus;
    }
  };

  useEffect(() => {
    const fetchPurchaseRequests = async () => {
      try {
        const response = await axiosInstance.get("/pr/all");
        setPurchaseRequests(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error("Error fetching purchase requests:", err);
        setError("ไม่สามารถดึงข้อมูลคำขอซื้อได้");
      } finally {
        setLoading(false);
      }
    };
    fetchPurchaseRequests();
  }, []);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const totalPages = useMemo(() => {
    const t = Math.ceil((purchaseRequests?.length || 0) / rowsPerPage);
    return t > 0 ? t : 1;
  }, [purchaseRequests]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = (purchaseRequests || []).slice(start, end);
  const displayRows = [...pageRows];
  while (displayRows.length < rowsPerPage) displayRows.push({ _placeholder: true });

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

  // ✅ ฟังก์ชันสำหรับปุ่มลูกศร
  const goToPreviousPage = () => handlePageChange(currentPage - 1);
  const goToNextPage = () => handlePageChange(currentPage + 1);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>กำลังโหลดรายการคำขอซื้อ…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>รายการคำขอซื้อ</h1>
        <p className={styles.emptyList}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.pageBackground}>
      <div className={styles.card}>
        <h1 className={styles.title}>รายการคำขอซื้อ</h1>

        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>เลขที่ PR</div>
            <div className={styles.headerItem}>ผู้ร้องขอ</div>
            <div className={styles.headerItem}>วันที่สร้าง</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ดูรายละเอียด</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {purchaseRequests.length === 0 ? (
              <div className={`${styles.noData} ${styles.centerCell}`}>ยังไม่มีรายการคำขอซื้อ</div>
            ) : (
              displayRows.map((pr, idx) => {
                const placeholder = !!pr._placeholder;
                const key = placeholder ? `empty-${currentPage}-${idx}` : `pr-${pr.pr_id}`;

                return (
                  <div
                    key={key}
                    className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ""}`}
                  >
                    <div className={styles.tableCell}>{placeholder ? "" : pr.pr_no}</div>
                    <div className={styles.tableCell}>{placeholder ? "" : pr.requester_name}</div>
                    <div className={styles.tableCell}>{placeholder ? "" : formatDate(pr.created_at)}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {placeholder ? "" : (
                        <span className={`${styles.statusBadge} ${getStatusClass(pr.status)}`}>
                          {statusMap[pr.status] || pr.status}
                        </span>
                      )}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {!placeholder && (
                        <Link href={`/purchasing/pr/${pr.pr_id}`}>
                          <button className={styles.detailButton}>ดูรายละเอียด</button>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
              ) : (
                <li key={`page-${p}`}>
                  <button
                    className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                </li>
              )
            )}
            <li>
              <button
                className={styles.pageButton}
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
