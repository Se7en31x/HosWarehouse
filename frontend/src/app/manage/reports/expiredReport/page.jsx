"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ClipboardX,
  FileDown,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import { exportExpiredPDF } from "@/app/components/pdf/templates/expiredTemplate";
import { exportExpiredCSV } from "@/app/components/Csv/templates/expiredCSV";
import styles from "./page.module.css";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "var(--accent)" : "var(--border)",
    boxShadow: "none",
    "&:hover": { borderColor: "var(--accent)" },
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
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "8px 12px",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
};

export default function ExpiredReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(null);
  const [status, setStatus] = useState(null);
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

  /* ---- Options ---- */
  const categoryOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "general", label: "ของใช้ทั่วไป" },
    { value: "medsup", label: "เวชภัณฑ์" },
    { value: "equipment", label: "ครุภัณฑ์" },
    { value: "meddevice", label: "อุปกรณ์การแพทย์" },
    { value: "medicine", label: "ยา" },
  ];

  const statusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "managed", label: "จัดการแล้ว" },
    { value: "unmanaged", label: "ยังไม่จัดการ" },
    { value: "partially_managed", label: "จัดการบางส่วน" },
  ];

  const dateOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "today", label: "วันนี้" },
    { value: "1m", label: "1 เดือนที่ผ่านมา" },
    { value: "3m", label: "3 เดือนที่ผ่านมา" },
    { value: "6m", label: "6 เดือนที่ผ่านมา" },
    { value: "9m", label: "9 เดือนที่ผ่านมา" },
    { value: "12m", label: "12 เดือนที่ผ่านมา" },
    { value: "year", label: "ปีนี้" },
    { value: "custom", label: "กำหนดเอง" },
  ];

  /* ---- Helpers ---- */
  const toISODate = (date) => date.toISOString().split("T")[0];
  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  const translateCategory = (cat) => {
    const map = {
      general: "ของใช้ทั่วไป",
      medsup: "เวชภัณฑ์",
      equipment: "ครุภัณฑ์",
      meddevice: "อุปกรณ์การแพทย์",
      medicine: "ยา",
    };
    return map[cat] || cat || "-";
  };

  const translateManageStatus = (status) => {
    switch (status) {
      case "unmanaged":
        return { text: "ยังไม่จัดการ", class: "stOut" };
      case "managed":
        return { text: "จัดการแล้ว", class: "stAvailable" };
      case "partially_managed":
        return { text: "จัดการบางส่วน", class: "stLow" };
      default:
        return { text: "-", class: "stHold" };
    }
  };

  /* ---- Fetch ---- */
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (category?.value && category.value !== "all")
        params.category = category.value;
      if (status?.value && status.value !== "all") params.status = status.value;

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
      } else if (["1m", "3m", "6m", "9m", "12m"].includes(option)) {
        const months = parseInt(option.replace("m", ""));
        start = new Date();
        start.setMonth(today.getMonth() - months);
        end = today;
      } else if (option === "custom" && customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
        if (start > end) return;
        params.start_date = customStart;
        params.end_date = customEnd;
      }

      if (start && end && option !== "custom") {
        params.start_date = toISODate(start);
        params.end_date = toISODate(end);
      }

      const res = await manageAxios.get("/report/expired", { params });
      setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("Error fetching expired report:", err);
    } finally {
      setLoading(false);
    }
  }, [category, status, dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ---- Pagination ---- */
  const filteredData = useMemo(() => data, [data]);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);
  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  const goToPreviousPage = () =>
    currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredData.length &&
    setCurrentPage((c) => c + 1);

  /* ---- Render ---- */
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>
            <ClipboardX size={28} color="#dc2626" /> รายงานพัสดุหมดอายุ
          </h1>
          <div className={styles.searchCluster}>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportExpiredPDF({
                  data,
                  filters: {
                    categoryLabel: category?.label,
                    statusLabel: status?.label,
                    dateLabel: dateRange?.label,
                    dateValue: dateRange?.value, // ✅ ส่งไปใช้ mapDateRangeLabel
                    start: customStart,
                    end: customEnd,
                  },
                  user: { user_fname: "วัชรพล", user_lname: "อินทร์ทอง" },
                })
              }
            >
              <FileDown size={16} /> PDF
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => exportExpiredCSV({ data })}
            >
              <FileDown size={16} /> CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภท</label>
              <DynamicSelect
                options={categoryOptions}
                value={category}
                onChange={setCategory}
                isClearable
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
                placeholder="เลือกประเภทพัสดุ..."
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <DynamicSelect
                options={statusOptions}
                value={status}
                onChange={setStatus}
                isClearable
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
                placeholder="เลือกการทำรายการ..."
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ช่วงเวลา</label>
              <DynamicSelect
                options={dateOptions}
                value={dateRange}
                placeholder="เลือกช่วงเวลา..."
                onChange={(option) => {
                  setDateRange(option);
                  if (!option || option.value !== "custom") {
                    setCustomStart("");
                    setCustomEnd("");
                  }
                }}
                isClearable
                styles={customSelectStyles}
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
                      onChange={(e) => setCustomStart(e.target.value)}
                      className={styles.dateInput}
                      ref={startDateRef}
                    />
                    <button
                      className={styles.calendarButton}
                      onClick={() => startDateRef.current?.showPicker?.()}
                    >
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
                    <button
                      className={styles.calendarButton}
                      onClick={() => endDateRef.current?.showPicker?.()}
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
              <Search size={16} /> ค้นหา
            </button>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={() => {
                setCategory(null);
                setStatus(null);
                setDateRange(null);
                setCustomStart("");
                setCustomEnd("");
                setCurrentPage(1);
              }}
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGridExpired} ${styles.tableHeader}`}>
            <div className={styles.tableCell}>ลำดับ</div>
            <div className={styles.tableCell}>ชื่อพัสดุ</div>
            <div className={styles.tableCell}>ประเภท</div>
            <div className={styles.tableCell}>Lot No.</div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>
              จำนวนที่นำเข้า
            </div>
            <div className={styles.tableCell}>วันหมดอายุ</div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>
              จำนวนหมดอายุ
            </div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>
              จัดการแล้ว
            </div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>
              คงเหลือ
            </div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>สถานะ</div>
          </div>
          <div
            className={styles.inventory}
            style={{ "--rows-per-page": ITEMS_PER_PAGE }}
          >
            {loading ? (
              <div className={styles.loadingContainer}>⏳ กำลังโหลดข้อมูล...</div>
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item, idx) => {
                const s = translateManageStatus(item.manage_status);
                return (
                  <div
                    key={idx}
                    className={`${styles.tableGridExpired} ${styles.tableRow}`}
                  >
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </div>
                    <div className={styles.tableCell}>
                      {item.item_name || "-"}
                    </div>
                    <div className={styles.tableCell}>
                      {translateCategory(item.category)}
                    </div>
                    <div className={styles.tableCell}>{item.lot_no || "-"}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.qty_imported || 0}
                    </div>
                    <div className={styles.tableCell}>
                      {formatDate(item.exp_date)}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.expired_qty || 0}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.disposed_qty || 0}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.remaining_qty || 0}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.stBadge} ${styles[s.class]}`}>
                        {s.text}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
            )}
            {Array.from({ length: fillersCount }).map((_, i) => (
              <div
                key={i}
                className={`${styles.tableGridExpired} ${styles.tableRow} ${styles.fillerRow}`}
              >
                {Array.from({ length: 10 }).map((__, c) => (
                  <div key={c} className={styles.tableCell}>
                    &nbsp;
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className={styles.paginationBar}>
          <div className={styles.paginationInfo}>
            กำลังแสดง{" "}
            {filteredData.length
              ? (currentPage - 1) * ITEMS_PER_PAGE + 1
              : 0}
            -
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)}{" "}
            จาก {filteredData.length} รายการ
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

            {(() => {
              const pages = [];
              if (totalPages <= 4) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, "...", totalPages);
              } else if (currentPage >= totalPages - 3) {
                pages.push(
                  1,
                  "...",
                  totalPages - 3,
                  totalPages - 2,
                  totalPages - 1,
                  totalPages
                );
              } else {
                pages.push(
                  1,
                  "...",
                  currentPage - 1,
                  currentPage,
                  currentPage + 1,
                  "...",
                  totalPages
                );
              }
              return pages.map((p, idx) =>
                p === "..." ? (
                  <li key={`ellipsis-${idx}`} className={styles.ellipsis}>
                    …
                  </li>
                ) : (
                  <li key={`page-${p}`}>
                    <button
                      className={`${styles.pageButton} ${
                        p === currentPage ? styles.activePage : ""
                      }`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </li>
                )
              );
            })()}

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
