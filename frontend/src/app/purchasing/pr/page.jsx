"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.3rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

export default function PurchasingPrPage() {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ฟิลเตอร์
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Pagination
  const rowsPerPage = 12;
  const [currentPage, setCurrentPage] = useState(1);

  const statusMap = {
    submitted: "รออนุมัติ",
    approved: "อนุมัติแล้ว",
    rejected: "ปฏิเสธแล้ว",
    draft: "ฉบับร่าง",
    canceled: "ยกเลิก",
    processed: "กำลังดำเนินการ",
  };

  const STATUS_OPTIONS = [
    { value: "all", label: "ทุกสถานะ" },
    { value: "submitted", label: "รออนุมัติ" },
    { value: "approved", label: "อนุมัติแล้ว" },
    { value: "rejected", label: "ปฏิเสธแล้ว" },
    { value: "draft", label: "ฉบับร่าง" },
    { value: "canceled", label: "ยกเลิก" },
    { value: "processed", label: "กำลังดำเนินการ" },
  ];

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

  // Filter list
  const filteredList = useMemo(() => {
    return purchaseRequests.filter((pr) => {
      const okStatus = statusFilter === "all" || pr.status === statusFilter;
      const okSearch =
        search === "" ||
        pr.pr_no?.toLowerCase().includes(search.toLowerCase()) ||
        pr.requester_name?.toLowerCase().includes(search.toLowerCase());
      return okStatus && okSearch;
    });
  }, [purchaseRequests, statusFilter, search]);

  const totalPages = useMemo(() => {
    const t = Math.ceil((filteredList?.length || 0) / rowsPerPage);
    return t > 0 ? t : 1;
  }, [filteredList]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = (filteredList || []).slice(start, end);
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

  const goToPreviousPage = () => handlePageChange(currentPage - 1);
  const goToNextPage = () => handlePageChange(currentPage + 1);

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>รายการคำขอซื้อ</h1>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="status">สถานะ</label>
            <Select
              inputId="status"
              isClearable
              isSearchable={false}
              placeholder="ทุกสถานะ"
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
              onChange={(opt) => setStatusFilter(opt?.value || "all")}
              styles={customSelectStyles}
              menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
            />
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="search">ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  id="search"
                  type="text"
                  className={styles.input}
                  placeholder="ค้นหาเลขที่ PR หรือผู้ร้องขอ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>เลขที่ PR</div>
            <div className={styles.headerItem}>ผู้ร้องขอ</div>
            <div className={styles.headerItem}>วันที่สร้าง</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ดูรายละเอียด</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {filteredList.length === 0 ? (
              <div className={`${styles.noData} ${styles.centerCell}`}>ไม่พบคำขอซื้อ</div>
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
              <button className={styles.pageButton} onClick={goToPreviousPage} disabled={currentPage === 1}>
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
              <button className={styles.pageButton} onClick={goToNextPage} disabled={currentPage >= totalPages}>
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
