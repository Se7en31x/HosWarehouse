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

import exportReportGR from "@/app/components/pdf/templates/reportpurchasing/reportGR";
import { exportGRCSV } from "@/app/components/Csv/templates/grReportCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

/* ──────────── Helpers ──────────── */
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

const translateStatus = (status) => {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "partial":
      return "รับบางส่วน";
    case "completed":
      return "เสร็จสิ้น";
    default:
      return status || "-";
  }
};

const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
};

const toISODate = (date) => date.toISOString().split("T")[0];

/* ──────────── Component ──────────── */
export default function GRReport() {
  const [grs, setGRs] = useState([]);
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

  const statusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "pending", label: "รอดำเนินการ" },
    { value: "partial", label: "รับบางส่วน" },
    { value: "completed", label: "เสร็จสิ้น" },
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

  /* ──────────── Fetch ──────────── */
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter?.value && statusFilter.value !== "all")
        params.status = statusFilter.value;

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
        const months = parseInt(option.replace("last", "").replace("months", "").replace("month", ""));
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

      const res = await purchasingAxios.get("/gr/report", { params });
      setGRs(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("Error fetching GR report:", err);
      toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ──────────── Filter + Pagination ──────────── */
  const filteredData = useMemo(() => {
    return grs.sort((a, b) => new Date(b.gr_date || 0) - new Date(a.gr_date || 0));
  }, [grs]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  useEffect(() => setCurrentPage(1), [statusFilter, dateRange, customStart, customEnd]);
  useEffect(() => setCurrentPage((p) => Math.min(Math.max(1, p), totalPages)), [totalPages]);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredData.length && setCurrentPage((c) => c + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, "...", totalPages);
    else if (currentPage >= totalPages - 3)
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
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
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredData.length);

  /* ──────────── Render ──────────── */
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>
            <ClipboardCheck size={28} /> รายงานการรับสินค้า (GR Report)
          </h1>
          <div className={styles.searchCluster}>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportReportGR({
                  data: filteredData,
                  filters: {
                    statusLabel: statusFilter?.label,
                    dateValue: dateRange?.value,
                    start: customStart,
                    end: customEnd,
                  },
                })
              }
            >
              <FileDown size={16} /> PDF
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => exportGRCSV({ data: filteredData })}
            >
              <FileDown size={16} /> Excel
            </button>
          </div>
        </div>

        {/* Toolbar */}
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

            {/* Custom date */}
            {dateRange?.value === "custom" && (
              <div className={styles.filterGroup}>
                <label className={styles.label}>กำหนดวันที่</label>
                <div className={styles.customDateBox}>
                  <div className={styles.dateField}>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className={styles.dateInput}
                      ref={startDateRef}
                    />
                    <button className={styles.calendarButton} onClick={() => startDateRef.current?.showPicker?.()}>
                      <Calendar size={16} />
                    </button>
                  </div>
                  <span className={styles.toLabel}>ถึง</span>
                  <div className={styles.dateField}>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className={styles.dateInput}
                      ref={endDateRef}
                    />
                    <button className={styles.calendarButton} onClick={() => endDateRef.current?.showPicker?.()}>
                      <Calendar size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.searchCluster}>
            <button className={styles.btnPrimary} onClick={fetchReport}>
              <Search size={16} /> ค้นหา
            </button>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGridGR} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>GR No</div>
              <div className={styles.headerItem}>วันที่รับ</div>
              <div className={styles.headerItem}>ซัพพลายเออร์</div>
              <div className={styles.headerItem}>PO No</div>
              <div className={styles.headerItem}>สินค้า</div>
              <div className={styles.headerItem}>สั่ง</div>
              <div className={styles.headerItem}>รับจริง</div>
              <div className={styles.headerItem}>สถานะ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((gr, index) => (
                  <div key={gr.gr_id ?? index} className={`${styles.tableGridGR} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </div>
                    <div className={styles.tableCell}>{gr.gr_no || "-"}</div>
                    <div className={styles.tableCell}>{formatDate(gr.gr_date)}</div>
                    <div className={styles.tableCell}>{gr.supplier_name || "-"}</div>
                    <div className={styles.tableCell}>{gr.po_no || "-"}</div>
                    <div className={styles.tableCell}>{gr.item_name || "-"}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{gr.qty_ordered || 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{gr.qty_received || 0}</div>
                    <div className={styles.tableCell}>{translateStatus(gr.status)}</div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {/* fillerRow */}
              {Array.from({ length: fillersCount }).map((_, i) => (
                <div key={`filler-${i}`} className={`${styles.tableGridGR} ${styles.tableRow} ${styles.fillerRow}`}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <div
                      key={`cell-${j}`}
                      className={`${styles.tableCell} ${j === 0 || j >= 6 ? styles.centerCell : ""}`}
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
                  <button className={styles.pageButton} onClick={goToPreviousPage} disabled={currentPage === 1}>
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <li key={`ellipsis-${idx}`} className={styles.ellipsis}>
                      …
                    </li>
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
