"use client";
import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles (identical to ImportHistory) */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    fontSize: "0.9rem",
    width: "250px",
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
    padding: "6px 10px",
    fontSize: "0.9rem",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "0.9rem" }),
  clearIndicator: (base) => ({ ...base, padding: 4 }),
  dropdownIndicator: (base) => ({ ...base, padding: 4 }),
};

/* mapping */
const statusMap = {
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  approved_all: "อนุมัติทั้งหมด",
  approved_partial: "อนุมัติบางส่วน",
  approved_partial_and_rejected_partial: "อนุมัติบางส่วน",
  rejected_all: "ปฏิเสธทั้งหมด",
  canceled: "ยกเลิก",
};
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v })),
];
const URGENT_OPTIONS = [
  { value: "all", label: "เร่งด่วน/ปกติ" },
  { value: "urgent", label: "เฉพาะเร่งด่วน" },
  { value: "normal", label: "เฉพาะปกติ" },
];

/* badge class mapping */
const getStatusBadgeClass = (status) => {
  switch (status) {
    case "approved_all":
      return "stAvailable"; // เขียว
    case "approved_partial":
    case "approved_partial_and_rejected_partial":
    case "waiting_approval":
      return "stLow"; // เหลือง
    case "rejected_all":
    case "canceled":
      return "stOut"; // แดง
    case "draft":
    default:
      return "stHold"; // เทา
  }
};
const getUrgentBadgeClass = (isUrgent) => (isUrgent ? "stOut" : "stHold");

/* helper */
const formatThaiDate = (isoString) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Bangkok",
  });
};

export default function WithdrawHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/withdraw");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "ข้อผิดพลาด",
          text: "ไม่สามารถโหลดข้อมูลได้",
          confirmButtonColor: "#008dda",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((req) => {
      const okStatus = filterStatus === "all" || req.request_status === filterStatus;
      const okUrgent =
        filterUrgent === "all" ||
        (filterUrgent === "urgent" && req.is_urgent) ||
        (filterUrgent === "normal" && !req.is_urgent);
      const okSearch =
        searchText === "" ||
        req.request_code?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.department?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.requester_name?.toLowerCase().includes(searchText.toLowerCase());
      return okStatus && okUrgent && okSearch;
    });
  }, [data, filterStatus, filterUrgent, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterUrgent, searchText]);

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
    setFilterStatus("all");
    setFilterUrgent("all");
    setSearchText("");
    setCurrentPage(1);
  };

  const showDetail = (row) => {
    Swal.fire({
      title: `รายละเอียดคำขอ ${row.request_code}`,
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p><b>วันที่:</b> ${formatThaiDate(row.request_date)}</p>
          <p><b>แผนก:</b> ${row.department || "-"}</p>
          <p><b>ผู้ขอ:</b> ${row.requester_name || "-"}</p>
          <p><b>จำนวน:</b> ${row.total_items || 0} รายการ (${row.total_qty || 0} ชิ้น)</p>
          <p><b>สถานะ:</b> ${statusMap[row.request_status] || row.request_status}</p>
          <p><b>ความเร่งด่วน:</b> ${row.is_urgent ? "ด่วน" : "ปกติ"}</p>
        </div>
      `,
      width: "450px",
      confirmButtonText: "ปิด",
      confirmButtonColor: "#008dda",
    });
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>ประวัติการเบิก/ยืม</h1>
        </div>

        {/* Toolbar */}
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <Select
                isClearable
                isSearchable={false}
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((o) => o.value === filterStatus) || null}
                onChange={(opt) => setFilterStatus(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะ..."
                aria-label="กรองตามสถานะ"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ความเร่งด่วน</label>
              <Select
                isClearable
                isSearchable={false}
                options={URGENT_OPTIONS}
                value={URGENT_OPTIONS.find((o) => o.value === filterUrgent) || null}
                onChange={(opt) => setFilterUrgent(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกความเร่งด่วน..."
                aria-label="กรองตามความเร่งด่วน"
              />
            </div>
          </div>
          <div className={styles.filterRight}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="รหัส / แผนก / ผู้ขอ"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  aria-label="ค้นหาคำขอ"
                />
              </div>
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
              aria-label="ล้างตัวกรองทั้งหมด"
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>วันที่</div>
            <div className={styles.headerItem}>เลขที่คำขอ</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>ผู้ขอ</div>
            <div className={styles.headerItem}>จำนวนรายการ</div>
            <div className={styles.headerItem}>รวมจำนวน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ด่วน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>จัดการ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {isLoading ? (
              <div className={styles.loadingContainer}>กำลังโหลดข้อมูล...</div>
            ) : pageRows.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลคำขอเบิก/ยืม</div>
            ) : (
              pageRows.map((req) => (
                <div key={req.request_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div className={styles.tableCell}>{formatThaiDate(req.request_date)}</div>
                  <div className={styles.tableCell}>{req.request_code || "-"}</div>
                  <div className={styles.tableCell}>{req.department || "-"}</div>
                  <div className={styles.tableCell}>{req.requester_name || "-"}</div>
                  <div className={styles.tableCell}>{req.total_items || 0}</div>
                  <div className={styles.tableCell}>{req.total_qty || 0}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(req.request_status)]}`}>
                      {statusMap[req.request_status] || req.request_status}
                    </span>
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <span className={`${styles.stBadge} ${styles[getUrgentBadgeClass(req.is_urgent)]}`}>
                      {req.is_urgent ? "ด่วน" : "ปกติ"}
                    </span>
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <button
                      className={styles.actionButton}
                      onClick={() => showDetail(req)}
                      aria-label={`ดูรายละเอียดคำขอ ${req.request_code}`}
                    >
                      <Search size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
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
            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
              ) : (
                <li key={`page-${p}`}>
                  <button
                    className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                    onClick={() => setCurrentPage(p)}
                    aria-label={`หน้า ${p}`}
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
    </div>
  );
}