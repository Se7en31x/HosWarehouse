"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { ClipboardCheck, FileDown, Search, Trash2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { toast } from "react-toastify";
import styles from "./page.module.css";
import exportReportRFQ from "@/app/components/pdf/templates/reportpurchasing/reportRFQ";
import { exportRFQCSV } from "@/app/components/Csv/templates/rfqReportCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

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

const formatDateTH = (val) => {
  if (!val) return "-";
  try {
    return new Date(val).toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });
  } catch { return "-"; }
};

/* ────────── Export Wrapper ────────── */
const handleExportPDF = async (filteredData, filters, user) => {
  const columns = ["ลำดับ","RFQ No","วันที่สร้าง","ผู้สร้าง","จำนวนสินค้า","รวมจำนวน (Qty)","สถานะ"];
  const rows = filteredData.map((rfq, idx) => [
    idx + 1,
    rfq.rfq_no || "-",
    formatDateTH(rfq.created_at),
    `${rfq.firstname || "-"} ${rfq.lastname || "-"}`,
    rfq.item_count || 0,
    rfq.total_qty || 0,
    rfq.status || "-",
  ]);

  await exportReportRFQ({
    data: filteredData,
    filters,
    user,
    filename: "report-rfq.pdf",
    title: "รายงานใบขอราคา (RFQ)",
    columns,
    rows,
  });
};

export default function RFQReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 12;
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const menuPortalTarget = useMemo(() => (typeof window !== "undefined" ? document.body : null), []);

  /* options */
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
    { value: "last12months", label: "12 เดือนที่ผ่านมา" },
    { value: "year", label: "ปีนี้" },
    { value: "custom", label: "กำหนดเอง" },
  ];

  /* handlers (date inputs) */
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

  /* fetch */
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await purchasingAxios.get("/rfq/report");
      setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch {
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  /* filter & paginate */
  const filteredData = useMemo(() => [...data], [data]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);
  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  const startDisplay = filteredData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredData.length);

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

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}><ClipboardCheck size={28}/> รายงานใบขอราคา (RFQ)</h1>
          <div className={styles.searchCluster}>
            <button className={styles.btnSecondary}
              onClick={() => handleExportPDF(filteredData, {
                dateValue: dateRange?.value,
                start: customStart,
                end: customEnd,
                statusLabel: statusFilter?.label,
              })}>
              <FileDown size={16}/> PDF
            </button>
            <button className={styles.btnSecondary}
              onClick={() => exportRFQCSV({ data: filteredData, filename: "report-rfq.csv" })}>
              <FileDown size={16}/> Excel
            </button>
          </div>
        </div>

        {/* toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
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
                      aria-label="เปิดปฏิทินวันที่เริ่มต้น"
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
                      aria-label="เปิดปฏิทินวันที่สิ้นสุด"
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className={styles.searchCluster}>
            <button className={styles.btnPrimary} onClick={fetchReport}>
              <Search size={16} style={{ marginRight: "6px" }} /> ค้นหา
            </button>
            <button onClick={clearFilters} className={`${styles.ghostBtn} ${styles.clearButton}`}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* table */}
        {loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGridRFQ} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>RFQ No</div>
              <div className={styles.headerItem}>วันที่สร้าง</div>
              <div className={styles.headerItem}>ผู้สร้าง</div>
              <div className={styles.headerItem}>จำนวนสินค้า</div>
              <div className={styles.headerItem}>รวมจำนวน (Qty)</div>
              <div className={styles.headerItem}>สถานะ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((rfq, index) => (
                  <div key={rfq.rfq_id ?? `${rfq.rfq_no}-${index}`} className={`${styles.tableGridRFQ} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </div>
                    <div className={styles.tableCell}>{rfq.rfq_no || "-"}</div>
                    <div className={styles.tableCell}>{formatDateTH(rfq.created_at)}</div>
                    <div className={styles.tableCell}>{`${rfq.firstname || "-"} ${rfq.lastname || "-"}`}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{rfq.item_count || 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{rfq.total_qty || 0}</div>
                    <div className={styles.tableCell}>{rfq.status || "-"}</div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {Array.from({ length: fillersCount }).map((_, i) => (
                <div key={`filler-${i}`} className={`${styles.tableGridRFQ} ${styles.tableRow} ${styles.fillerRow}`} aria-hidden="true">
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                </div>
              ))}
            </div>

            {/* pagination */}
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
                    aria-label="หน้าก่อนหน้า"
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
                        aria-current={p === currentPage ? "page" : undefined}
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
                    aria-label="หน้าถัดไป"
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
