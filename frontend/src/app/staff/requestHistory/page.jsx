"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { useRouter } from "next/navigation";
import exportPDF from "@/app/components/pdf/PDFExporter";
import exportCSV from "@/app/components/CSVexport";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { BsFiletypePdf, BsFiletypeCsv } from "react-icons/bs";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* ---------- React-Select options ---------- */
const typeOptions = [
  { value: "all", label: "ทุกประเภท" },
  { value: "withdraw", label: "เบิก" },
  { value: "borrow", label: "ยืม" },
];

const statusOptions = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "waiting_approval", label: "รออนุมัติ" },
  { value: "approved_all", label: "อนุมัติแล้ว" },
  { value: "rejected_all", label: "ถูกปฏิเสธ" },
  { value: "approved_partial", label: "อนุมัติบางส่วน" },
  { value: "rejected_partial", label: "ปฏิเสธบางส่วน" },
  { value: "approved_partial_and_rejected_partial", label: "อนุมัติบางส่วน" },
];

/* เร่งด่วน */
const urgentOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "urgent", label: "เร่งด่วน" },
  { value: "normal", label: "ปกติ" },
];

/* ---------- React-Select custom styles ---------- */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: 12,
    minHeight: 40,
    paddingLeft: 4,
    borderColor: state.isFocused ? "#3b82f6" : "#cfeaf6",
    boxShadow: state.isFocused ? "0 0 0 3px rgba(59,130,246,.25)" : "none",
    "&:hover": { borderColor: "#3b82f6" },
    backgroundColor: "#fff",
  }),
  valueContainer: (b) => ({ ...b, padding: "2px 8px" }),
  singleValue: (b) => ({ ...b, fontWeight: 600, color: "#0f3a54" }),
  indicatorsContainer: (b) => ({ ...b, paddingRight: 6 }),
  dropdownIndicator: (b, s) => ({ ...b, color: s.isFocused ? "#0f3a54" : "#6b7280" }),
  menu: (b) => ({
    ...b,
    borderRadius: 12,
    marginTop: 6,
    border: "1px solid #cfeaf6",
    boxShadow: "0 12px 24px rgba(2,132,199,.12)",
    overflow: "hidden",
    zIndex: 9000,
  }),
  option: (b, s) => ({
    ...b,
    padding: "10px 12px",
    backgroundColor: s.isSelected ? "#e9f6fb" : s.isFocused ? "#f7fdff" : "#fff",
    color: "#0f3a54",
    fontWeight: s.isSelected ? 700 : 500,
    cursor: "pointer",
  }),
  menuPortal: (b) => ({ ...b, zIndex: 9000 }),
};

export default function RequestHistory() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // react-select portal
  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axiosInstance.get("/my-requests");
        setRequests(res.data || []);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // กลับไปหน้า 1 เมื่อเปลี่ยนตัวกรอง
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterStatus, filterUrgent, startDate, endDate]);

  // Map status
  const requestStatusMap = {
    waiting_approval: "รอการอนุมัติ",
    approved_all: "อนุมัติทั้งหมด",
    rejected_all: "ปฏิเสธทั้งหมด",
    approved_partial: "อนุมัติบางส่วน",
    rejected_partial: "ปฏิเสธบางส่วน",
    approved_partial_and_rejected_partial: "อนุมัติบางส่วน",
  };

  const getRequestStatusBadge = (status) => {
    let statusClass = styles.statusBadge;
    if (status === "approved_all") statusClass += ` ${styles.statusSuccess}`;
    else if (status === "rejected_all") statusClass += ` ${styles.statusCancelled}`;
    else if (["approved_partial", "rejected_partial", "approved_partial_and_rejected_partial"].includes(status)) {
      statusClass += ` ${styles.statusMixed}`;
    } else statusClass += ` ${styles.statusPending}`;
    return <span className={statusClass}>{requestStatusMap[status] || status}</span>;
  };

  const getTypeLabel = (type) => (type === "borrow" ? "ยืม" : type === "withdraw" ? "เบิก" : type || "-");

  const getUrgentBadge = (isUrgent) => {
    let urgentClass = styles.urgentBadge;
    urgentClass += isUrgent ? ` ${styles.urgentTrue}` : ` ${styles.urgentFalse}`;
    return <span className={urgentClass}>{isUrgent ? "เร่งด่วน" : "ปกติ"}</span>;
  };


  // ✅ ฟอร์แมตวันเวลา: 26/08/2568 13:39
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const dt = new Date(dateString);
      if (isNaN(dt.getTime())) return "-";
      return new Intl.DateTimeFormat("th-TH-u-nu-latn", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(dt);
    } catch {
      return "-";
    }
  };


  // ==== Type chips (新增) ====
  const parseTypes = (types) => {
    if (!types) return [];
    if (Array.isArray(types)) return [...new Set(types.map(t => String(t).toLowerCase().trim()))];
    return [...new Set(String(types).split(",").map(t => t.trim().toLowerCase()))];
  };

  const renderTypeChips = (types) => {
    const arr = parseTypes(types);
    if (arr.length === 0) return "-";
    const label = (t) => (t === "withdraw" ? "เบิก" : t === "borrow" ? "ยืม" : t === "return" ? "คืน" : t);
    return (
      <div className={styles.typePills}>
        {arr.map((t) => {
          let cls = styles.typePill;
          if (t === "withdraw") cls += ` ${styles.typeWithdraw}`;
          else if (t === "borrow") cls += ` ${styles.typeBorrow}`;
          else if (t === "return") cls += ` ${styles.typeReturn}`;
          return <span key={t} className={cls}>{label(t)}</span>;
        })}
      </div>
    );
  };

  // Filter (endDate ครอบคลุมถึง 23:59:59)
  const filteredRequests = requests.filter((req) => {
    let match = true;
    if (filterType !== "all" && req.request_type !== filterType) match = false;
    if (filterStatus !== "all" && req.request_status !== filterStatus) match = false;

    if (filterUrgent !== "all") {
      if (filterUrgent === "urgent" && !req.is_urgent) match = false;
      if (filterUrgent === "normal" && req.is_urgent) match = false;
    }

    const d = req.request_date ? new Date(req.request_date) : null;
    if (startDate && d && d < new Date(startDate)) match = false;
    if (endDate && d) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (d > end) match = false;
    }
    return match;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const pageRequests = filteredRequests.slice(startIdx, startIdx + itemsPerPage);

  // ===== Pagination =====
  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        // ต้น ๆ
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // ท้าย ๆ
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // กลาง
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };


  // Export
  const prepareTableData = () => {
    const columns = ["เลขคำขอ", "วันที่", "ประเภท", "สถานะการอนุมัติ", "ความเร่งด่วน", "ผู้ขอ"];
    const rows = filteredRequests.map((req) => [
      req.request_code || "-",
      formatDate(req.request_date),
      getTypeLabel(req.request_type),
      requestStatusMap[req.request_status] || req.request_status || "-",
      req.is_urgent ? "เร่งด่วน" : "ปกติ",
      req.user_name || "-",
    ]);
    return { columns, rows };
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { columns, rows } = prepareTableData();
      await exportPDF({
        filename: `request_history_${new Date().toISOString().split("T")[0]}.pdf`,
        columns,
        rows,
        title: "ประวัติการเบิก-ยืม",
      });
    } catch (err) {
      console.error("Error exporting PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const { columns, rows } = prepareTableData();
      exportCSV({
        filename: `request_history_${new Date().toISOString().split("T")[0]}.csv`,
        columns,
        rows,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <h1 className={styles.pageTitle}>ประวัติการเบิก-ยืม</h1>

        {/* Controls */}
        <div className={styles.controls}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.filterInput}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.filterInput}
          />

          {/* ▼ ประเภท */}
          <div className={styles.selectWrap}>
            <Select
              inputId="filter-type"
              options={typeOptions}
              isSearchable={false}
              value={typeOptions.find((o) => o.value === filterType)}
              onChange={(opt) => setFilterType(opt?.value ?? "all")}
              styles={customSelectStyles}
              menuPosition="fixed"
              menuPortalTarget={menuPortalTarget}
            />
          </div>

          {/* ▼ สถานะ */}
          <div className={styles.selectWrap}>
            <Select
              inputId="filter-status"
              options={statusOptions}
              isSearchable={false}
              value={statusOptions.find((o) => o.value === filterStatus)}
              onChange={(opt) => setFilterStatus(opt?.value ?? "all")}
              styles={customSelectStyles}
              menuPosition="fixed"
              menuPortalTarget={menuPortalTarget}
            />
          </div>

          {/* ▼ เร่งด่วน */}
          <div className={styles.selectWrap}>
            <Select
              inputId="filter-urgent"
              options={urgentOptions}
              isSearchable={false}
              value={urgentOptions.find((o) => o.value === filterUrgent)}
              onChange={(opt) => setFilterUrgent(opt?.value ?? "all")}
              styles={customSelectStyles}
              menuPosition="fixed"
              menuPortalTarget={menuPortalTarget}
            />
          </div>

          {/* Export icons */}
          <button
            onClick={handleExportPDF}
            className={`${styles.btn} ${styles.iconBtn} ${styles.pdfBtn}`}
            disabled={isExporting}
            aria-label="Export PDF"
            title="Export PDF"
          >
            {isExporting ? <Loader2 size={18} className={styles.spin} /> : <BsFiletypePdf size={20} />}
          </button>
          <button
            onClick={handleExportCSV}
            className={`${styles.btn} ${styles.iconBtn} ${styles.csvBtn}`}
            disabled={isExporting}
            aria-label="Export CSV"
            title="Export CSV"
          >
            {isExporting ? <Loader2 size={18} className={styles.spin} /> : <BsFiletypeCsv size={20} />}
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.noDataCell}>⏳ กำลังโหลดข้อมูล...</div>
        ) : (
          <div className={styles.tableFrame} style={{ "--rows-per-page": itemsPerPage }}>
            {/* Header */}
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div>เลขคำขอ</div>
              <div>วันที่</div>
              <div>ผู้ขอ</div>
              <div>ประเภท</div>
              <div>ความเร่งด่วน</div>
              <div>สถานะการอนุมัติ</div>
              <div>การดำเนินการ</div>
            </div>

            {/* Body */}
            <div className={styles.tableBody}>
              {pageRequests.length > 0 ? (
                pageRequests.map((req) => (
                  <div key={req.request_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div>{req.request_code}</div>
                    <div>{formatDate(req.request_date)}</div>
                    {/* ✅ ใช้ชิปประเภท */}
                    <div>{req.user_name || "-"}</div>
                    <div className={styles.typeCell}>{renderTypeChips(req.request_type)}</div>
                    <div>{getUrgentBadge(req.is_urgent)}</div>
                    <div>{getRequestStatusBadge(req.request_status)}</div>
                    <div>
                      <button
                        className={`${styles.btn} ${styles.primaryBtn}`}
                        onClick={() => router.push(`/staff/requestHistory/${req.request_id}`)}
                      >ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataCell}>ไม่พบข้อมูล</div>
              )}
            </div>

            {/* Footer / Pagination */}
            <div className={styles.tableFooter}>
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, i) =>
                  p === "..." ? (
                    <li key={`e-${i}`} className={styles.ellipsis}>
                      …
                    </li>
                  ) : (
                    <li key={p}>
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
