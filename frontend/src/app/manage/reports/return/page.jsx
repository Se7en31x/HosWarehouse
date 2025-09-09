"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ClipboardList,
  FileDown,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { exportReturnPDF } from "@/app/components/pdf/templates/returnTemplate";
import { exportReturnCSV } from "@/app/components/Csv/templates/returnCSV";

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

export default function ReturnReport() {
  const [department, setDepartment] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(null); // ✅ user จริง

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const ITEMS_PER_PAGE = 10;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  /* ---- Options ---- */
  const departmentOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "ฉุกเฉิน", label: "ฉุกเฉิน" },
    { value: "ผู้ป่วยใน", label: "ผู้ป่วยใน" },
    { value: "ห้องผ่าตัด", label: "ห้องผ่าตัด" },
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

  const approvalStatusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "approved", label: "อนุมัติ" },
    { value: "rejected", label: "ปฏิเสธ" },
    { value: "partial", label: "อนุมัติบางส่วน" },
    { value: "waiting_approval", label: "รออนุมัติ" },
    { value: "waiting_approval_detail", label: "รออนุมัติรายละเอียด" },
    { value: "approved_in_queue", label: "อนุมัติ (รอดำเนินการ)" },
  ];

  /* ---- Helpers ---- */
  const translateApprovalStatus = (status) => {
    switch (status) {
      case "approved":
        return { text: "อนุมัติ", class: "stAvailable" };
      case "rejected":
        return { text: "ปฏิเสธ", class: "stOut" };
      case "partial":
        return { text: "อนุมัติบางส่วน", class: "stLow" };
      case "waiting_approval":
      case "waiting_approval_detail":
        return { text: "รออนุมัติ", class: "stHold" };
      case "approved_in_queue":
        return { text: "อนุมัติ (รอดำเนินการ)", class: "stLow" };
      default:
        return { text: "-", class: "stHold" };
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const toISODate = (date) => date.toISOString().split("T")[0];
  const openDatePicker = (ref) => ref.current?.showPicker?.();

  /* ---- Fetch User ---- */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await manageAxios.get("/profile");
        setCurrentUser(res.data);
      } catch (err) {
        console.error("โหลดข้อมูลผู้ใช้ล้มเหลว:", err);
      }
    };
    fetchProfile();
  }, []);

  /* ---- Fetch Report ---- */
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (department?.value && department.value !== "all")
        params.department = department.value;
      if (approvalStatus?.value && approvalStatus.value !== "all")
        params.approvalStatus = approvalStatus.value;

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
        params.start = customStart;
        params.end = customEnd;
      }

      if (start && end && option !== "custom") {
        params.start = toISODate(start);
        params.end = toISODate(end);
      }

      const res = await manageAxios.get("/report/return", { params });
      setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("Error fetching return report:", err);
    } finally {
      setLoading(false);
    }
  }, [department, dateRange, approvalStatus, customStart, customEnd]);

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

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredData.length &&
    setCurrentPage((c) => c + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
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
    return pages;
  };

  const startDisplay = filteredData.length
    ? (currentPage - 1) * ITEMS_PER_PAGE + 1
    : 0;
  const endDisplay = Math.min(
    startDisplay + ITEMS_PER_PAGE - 1,
    filteredData.length
  );

  const clearFilters = () => {
    setDepartment(null);
    setDateRange(null);
    setApprovalStatus(null);
    setCustomStart("");
    setCustomEnd("");
    setCurrentPage(1);
  };

  /* ---- Render ---- */
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>
            <ClipboardList size={28} /> รายงานการคืน
          </h1>
          <div className={styles.searchCluster}>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportReturnPDF({
                  data,
                  filters: {
                    departmentLabel: department?.label,
                    dateLabel: dateRange?.label,
                    dateValue: dateRange?.value,
                    start: customStart,
                    end: customEnd,
                    approvalLabel: approvalStatus?.label,
                  },
                  user: currentUser
                    ? {
                        user_fname: currentUser.user_fname,
                        user_lname: currentUser.user_lname,
                        role: currentUser.role,
                        department: currentUser.department,
                      }
                    : { user_fname: "-", user_lname: "-", role: "-", department: "-" },
                })
              }
              disabled={!currentUser}
            >
              <FileDown size={16} /> PDF
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportReturnCSV({ data, filename: "return-report.csv" })
              }
            >
              <FileDown size={16} /> CSV
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>แผนก</label>
              <DynamicSelect
                options={departmentOptions}
                isClearable
                value={department}
                onChange={setDepartment}
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะอนุมัติ</label>
              <DynamicSelect
                options={approvalStatusOptions}
                isClearable
                value={approvalStatus}
                onChange={setApprovalStatus}
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ช่วงเวลา</label>
              <DynamicSelect
                options={dateOptions}
                isClearable
                value={dateRange}
                onChange={(option) => {
                  setDateRange(option);
                  if (!option || option.value !== "custom") {
                    setCustomStart("");
                    setCustomEnd("");
                  }
                }}
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
                      onClick={() => openDatePicker(startDateRef)}
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
                      onClick={() => openDatePicker(endDateRef)}
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
              onClick={clearFilters}
              className={`${styles.ghostBtn} ${styles.clearButton}`}
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGridReturn} ${styles.tableHeader}`}>
            <div className={styles.tableCell}>เลขที่คำขอ</div>
            <div className={styles.tableCell}>แผนก</div>
            <div className={styles.tableCell}>ผู้ยืม</div>
            <div className={styles.tableCell}>ชื่อพัสดุ</div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>จำนวนอนุมัติ</div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>คืนแล้ว</div>
            <div className={`${styles.tableCell} ${styles.centerCell}`}>คงเหลือ</div>
            <div className={styles.tableCell}>สถานะการคืน</div>
            <div className={styles.tableCell}>วันคืนล่าสุด</div>
            <div className={styles.tableCell}>สถานะอนุมัติ</div>
          </div>

          <div
            className={styles.inventory}
            style={{ "--rows-per-page": ITEMS_PER_PAGE }}
          >
            {loading ? (
              <div className={styles.loadingContainer}>⏳ กำลังโหลดข้อมูล...</div>
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item, idx) => {
                const approval = translateApprovalStatus(item.approval_status);
                return (
                  <div
                    key={`${item.request_code || "row"}-${idx}`}
                    className={`${styles.tableGridReturn} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>{item.request_code || "-"}</div>
                    <div className={styles.tableCell}>{item.department || "-"}</div>
                    <div className={styles.tableCell}>{item.borrower_name || "-"}</div>
                    <div className={styles.tableCell}>{item.item_name || "-"}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.approved_qty || 0}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.returned_qty || 0}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.not_returned_qty || 0}
                    </div>
                    <div className={styles.tableCell}>
                      <span className={styles.stBadge}>
                        {item.return_status || "-"}
                      </span>
                    </div>
                    <div className={styles.tableCell}>
                      {formatDate(item.last_return_date)}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span
                        className={`${styles.stBadge} ${styles[approval.class]}`}
                      >
                        {approval.text}
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
                key={`filler-${i}`}
                className={`${styles.tableGridReturn} ${styles.tableRow} ${styles.fillerRow}`}
              >
                {Array.from({ length: 10 }).map((__, c) => (
                  <div key={c} className={styles.tableCell}>&nbsp;</div>
                ))}
              </div>
            ))}
          </div>
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
