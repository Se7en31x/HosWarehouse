"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ClipboardCheck,
  FileDown,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { toast } from "react-toastify";
import styles from "./page.module.css";

import exportReportPR from "@/app/components/pdf/templates/reportpurchasing/reportPR";
import { exportPRCSV } from "@/app/components/Csv/templates/prReportCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

/* =========================
   react-select custom styles
   ========================= */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    width: "200px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    border: "1px solid #e5e7eb",
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
};

/* =========================
   Helpers
   ========================= */
const formatDateTH = (val) => {
  if (!val) return "-";
  try {
    return new Date(val).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
};

const toISODate = (date) => date.toISOString().split("T")[0];

export default function PRReport() {
  /* =========================
     States
     ========================= */
  const [prs, setPRs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const ITEMS_PER_PAGE = 12;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  /* =========================
     Options
     ========================= */
  const statusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "pending", label: "รอดำเนินการ" },
    { value: "approved", label: "อนุมัติ" },
    { value: "completed", label: "เสร็จสิ้น" },
    { value: "canceled", label: "ยกเลิก" },
  ];

  const dateOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "today", label: "วันนี้" },
    { value: "last1month", label: "1 เดือนที่ผ่านมา" },
    { value: "last3months", label: "3 เดือนที่ผ่านมา" },
    { value: "last6months", label: "6 เดือนที่ผ่านมา" },
    { value: "last9months", label: "9 เดือนที่ผ่านมา" },
    { value: "last12months", label: "12 เดือนที่ผ่านมา" },
    { value: "year", label: "ปีนี้" },
    { value: "custom", label: "กำหนดเอง" },
  ];

  /* =========================
     Date Handlers
     ========================= */
  const handleCustomStartChange = (e) => {
    const startDate = e.target.value;
    if (customEnd && startDate > customEnd) {
      toast.error("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }
    setCustomStart(startDate);
  };

  const handleCustomEndChange = (e) => {
    const endDate = e.target.value;
    if (customStart && endDate < customStart) {
      toast.error("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
      return;
    }
    setCustomEnd(endDate);
  };

  const openDatePicker = (ref) => {
    if (ref.current) {
      try {
        ref.current.showPicker?.();
      } catch {
        ref.current.focus();
      }
    }
  };

  /* =========================
     Fetch
     ========================= */
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (statusFilter?.value && statusFilter.value !== "all") {
        params.status = statusFilter.value;
      }

      const today = new Date();
      let start = null,
        end = null;
      const option = dateRange?.value;

      if (option === "today") {
        start = today;
        end = today;
      } else if (option === "year") {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
      } else if (option?.startsWith("last")) {
        const months = parseInt(
          option.replace("last", "").replace("months", "").replace("month", "")
        );
        start = new Date();
        start.setMonth(today.getMonth() - months);
        end = today;
      } else if (option === "custom" && customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
        if (start > end) {
          toast.error("วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด");
          setLoading(false);
          return;
        }
        params.start_date = customStart;
        params.end_date = customEnd;
      }

      if (start && end && option !== "custom") {
        params.start_date = toISODate(start);
        params.end_date = toISODate(end);
      }

      const res = await purchasingAxios.get("/pr/report", { params });
      setPRs(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("Error fetching PR report:", err);
      toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* =========================
     Filter + Sort
     ========================= */
  const filteredData = useMemo(() => {
    return prs.sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });
  }, [prs]);

  /* =========================
     Pagination
     ========================= */
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateRange, customStart, customEnd]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredData.length && setCurrentPage((c) => c + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  const clearFilters = () => {
    setStatusFilter(null);
    setDateRange(null);
    setCustomStart("");
    setCustomEnd("");
    setCurrentPage(1);
  };

  const startDisplay = filteredData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min(
    (currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE,
    filteredData.length
  );

  /* =========================
     Render
     ========================= */
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* ===== Header ===== */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <ClipboardCheck size={28} />
              รายงานใบขอซื้อ (PR Report)
            </h1>
          </div>
          <div className={styles.searchCluster}>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportReportPR({
                  data: filteredData,
                  filters: {
                    dateValue: dateRange?.value,
                    start: customStart,
                    end: customEnd,
                    statusLabel: statusFilter?.label,
                  },
                })
              }
              disabled={loading}
            >
              <FileDown size={16} style={{ marginRight: "6px" }} /> PDF
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => exportPRCSV({ data: filteredData })}
              disabled={loading}
            >
              <FileDown size={16} style={{ marginRight: "6px" }} /> Excel
            </button>
          </div>
        </div>

        {/* ===== Toolbar ===== */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            {/* สถานะ */}
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <DynamicSelect
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานะ..."
                styles={customSelectStyles}
                value={statusFilter}
                onChange={setStatusFilter}
                menuPortalTarget={menuPortalTarget}
              />
            </div>

            {/* ช่วงเวลา */}
            <div className={styles.filterGroup}>
              <label className={styles.label}>ช่วงเวลา</label>
              <DynamicSelect
                options={dateOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกช่วงเวลา..."
                styles={customSelectStyles}
                value={dateRange}
                onChange={(option) => {
                  setDateRange(option);
                  if (!option || option.value !== "custom") {
                    setCustomStart("");
                    setCustomEnd("");
                  }
                }}
                menuPortalTarget={menuPortalTarget}
              />
            </div>

            {/* Custom Date */}
            {dateRange?.value === "custom" && (
              <div className={styles.filterGroup}>
                <label className={styles.label}>กำหนดวันที่</label>
                <div className={styles.customDateBox}>
                  <div className={styles.dateField}>
                    <input
                      type="date"
                      value={customStart}
                      onChange={handleCustomStartChange}
                      className={styles.dateInput}
                      ref={startDateRef}
                    />
                    <button
                      className={styles.calendarButton}
                      onClick={() => openDatePicker(startDateRef)}
                      type="button"
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                  <span className={styles.toLabel}>ถึง</span>
                  <div className={styles.dateField}>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={handleCustomEndChange}
                      className={styles.dateInput}
                      ref={endDateRef}
                    />
                    <button
                      className={styles.calendarButton}
                      onClick={() => openDatePicker(endDateRef)}
                      type="button"
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ปุ่ม ค้นหา + ล้างตัวกรอง */}
          <div className={styles.searchCluster}>
            <button
              className={styles.btnPrimary}
              onClick={fetchReport}
              disabled={loading}
            >
              <Search size={16} style={{ marginRight: "6px" }} /> ค้นหา
            </button>
            <button
              onClick={clearFilters}
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              type="button"
              disabled={loading}
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* ===== Table ===== */}
        {loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            {/* Header */}
            <div className={`${styles.tableGridPR} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>PR No</div>
              <div className={styles.headerItem}>วันที่สร้าง</div>
              <div className={styles.headerItem}>ผู้ขอซื้อ</div>
              <div className={styles.headerItem}>สินค้า</div>
              <div className={styles.headerItem}>จำนวน</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>สถานะ</div>
            </div>

            {/* Rows */}
            <div
              className={styles.inventory}
              style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}
            >
              {paginatedItems.length > 0 ? (
                paginatedItems.map((pr, index) => (
                  <div
                    key={pr.pr_id ?? `${pr.pr_no}-${index}`}
                    className={`${styles.tableGridPR} ${styles.tableRow}`}
                  >
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </div>
                    <div className={styles.tableCell}>{pr.pr_no || "-"}</div>
                    <div className={styles.tableCell}>{formatDateTH(pr.created_at)}</div>
                    <div className={styles.tableCell}>
                      {`${pr.firstname || "-"} ${pr.lastname || "-"}`}
                    </div>
                    <div className={styles.tableCell}>{pr.item_name || "-"}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {pr.qty_requested || 0}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {pr.unit || "-"}
                    </div>
                    <div className={styles.tableCell}>{pr.status || "-"}</div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {/* fillerRow */}
              {Array.from({ length: fillersCount }).map((_, i) => (
                <div
                  key={`filler-${i}`}
                  className={`${styles.tableGridPR} ${styles.tableRow} ${styles.fillerRow}`}
                  aria-hidden="true"
                >
                  {Array.from({ length: 8 }).map((__, j) => (
                    <div
                      key={`cell-${j}`}
                      className={`${styles.tableCell} ${j === 0 || j === 5 || j === 6 ? styles.centerCell : ""}`}
                    >
                      &nbsp;
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredData.length} รายการ
              </div>
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
        )}
      </div>
    </div>
  );
}
