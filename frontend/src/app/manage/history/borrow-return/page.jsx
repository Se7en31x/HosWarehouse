"use client";
import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles */
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
    boxShadow: "none",
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
const approvalStatusMap = {
  waiting_approval: "รอการอนุมัติ",
  approved_all: "อนุมัติทั้งหมด",
  approved_partial: "อนุมัติบางส่วน",
  approved_partial_and_rejected_partial: "อนุมัติบางส่วน",
  rejected: "ปฏิเสธ",
  canceled: "ยกเลิก",
  completed: "เสร็จสิ้น",
};

const borrowStatusMap = {
  not_returned: "ยังไม่คืน",
  partially_returned: "คืนบางส่วน",
  returned: "คืนครบแล้ว",
};
const urgentMap = { true: "ด่วน", false: "ปกติ" };
const returnStatusMap = {
  normal: "คืนปกติ",
  damaged: "ชำรุด",
  lost: "สูญหาย",
};

/* options */
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "waiting_approval", label: "รอการอนุมัติ" },
  { value: "approved_all", label: "อนุมัติทั้งหมด" },
  { value: "approved_partial", label: "อนุมัติบางส่วน" },
  { value: "rejected", label: "ถูกปฏิเสธ" },
  { value: "canceled", label: "ยกเลิก" },
];
const RETURN_OPTIONS = [
  { value: "all", label: "การคืนทั้งหมด" },
  { value: "normal", label: "คืนปกติ" },
  { value: "damaged", label: "คืนชำรุด" },
  { value: "lost", label: "สูญหาย" },
];
const URGENT_OPTIONS = [
  { value: "all", label: "เร่งด่วน/ปกติ" },
  { value: "urgent", label: "เฉพาะเร่งด่วน" },
  { value: "normal", label: "เฉพาะปกติ" },
];

/* helper */
const formatThaiDate = (isoString) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
};

export default function BorrowHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReturn, setFilterReturn] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/borrow");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch {
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
      const okReturn =
        filterReturn === "all" ||
        req.details?.some((d) => d.returns?.some((r) => r.condition === filterReturn));
      const okUrgent =
        filterUrgent === "all" ||
        (filterUrgent === "urgent" && req.is_urgent) ||
        (filterUrgent === "normal" && !req.is_urgent);
      const okSearch =
        searchText === "" ||
        req.request_code?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.department?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.requester_name?.toLowerCase().includes(searchText.toLowerCase());
      return okStatus && okReturn && okUrgent && okSearch;
    });
  }, [data, filterStatus, filterReturn, filterUrgent, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);

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

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterReturn("all");
    setFilterUrgent("all");
    setSearchText("");
    setCurrentPage(1);
  };

  const showDetail = (req) => {
    Swal.fire({
      title: `รายละเอียดคำขอ ${req.request_code}`,
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p><b>วันที่ยืม:</b> ${formatThaiDate(req.request_date)}</p>
          <p><b>ผู้ยืม:</b> ${req.requester_name || "-"}</p>
          <p><b>แผนก:</b> ${req.department || "-"}</p>
          <p><b>กำหนดคืน:</b> ${formatThaiDate(req.request_due_date)}</p>
          <p><b>สถานะอนุมัติ:</b> ${approvalStatusMap[req.request_status] || req.request_status}</p>
          <p><b>ความเร่งด่วน:</b> ${req.is_urgent ? urgentMap.true : urgentMap.false}</p>
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
          <h1 className={styles.pageTitle}>
            ประวัติการยืม/คืน
          </h1>
        </div>

        {/* Toolbar */}
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะอนุมัติ</label>
              <Select
                isClearable
                isSearchable={false}
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((o) => o.value === filterStatus) || null}
                onChange={(opt) => setFilterStatus(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะ..."
                aria-label="กรองตามสถานะอนุมัติ"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะการคืน</label>
              <Select
                isClearable
                isSearchable={false}
                options={RETURN_OPTIONS}
                value={RETURN_OPTIONS.find((o) => o.value === filterReturn) || null}
                onChange={(opt) => setFilterReturn(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะการคืน..."
                aria-label="กรองตามสถานะการคืน"
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
                  placeholder="รหัส / แผนก / ผู้ยืม"
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
            <div className={styles.headerItem}>วันที่ยืม</div>
            <div className={styles.headerItem}>เลขที่คำขอ</div>
            <div className={styles.headerItem}>ผู้ยืม</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>กำหนดคืน</div>
            <div className={styles.headerItem}>ด่วน</div>
            <div className={styles.headerItem}>สถานะอนุมัติ</div>
            <div className={styles.headerItem}>สถานะการคืน</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory}>
            {isLoading ? (
              <div className={styles.loadingContainer}>กำลังโหลดข้อมูล...</div>
            ) : pageRows.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลการยืม</div>
            ) : (
              pageRows.map((req, idx) => {
                const overallBorrow = req.details?.length
                  ? req.details.every((d) => d.borrow_status === "returned")
                    ? "returned"
                    : req.details.some((d) => d.borrow_status === "returned" || d.borrow_status === "partially_returned")
                    ? "partially_returned"
                    : "not_returned"
                  : "not_returned";
                return (
                  <div key={req.request_id || `row-${idx}`} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{formatThaiDate(req.request_date)}</div>
                    <div className={styles.tableCell}>{req.request_code || "-"}</div>
                    <div className={styles.tableCell}>{req.requester_name || "-"}</div>
                    <div className={styles.tableCell}>{req.department || "-"}</div>
                    <div className={styles.tableCell}>{formatThaiDate(req.request_due_date)}</div>
                    <div className={styles.tableCell}>
                      <span className={`${styles.stBadge} ${styles[req.is_urgent ? "stUrgent" : "stNormal"]}`}>
                        {req.is_urgent ? urgentMap.true : urgentMap.false}
                      </span>
                    </div>
                    <div className={styles.tableCell}>
                      <span className={`${styles.stBadge} ${styles[req.request_status]}`}>
                        {approvalStatusMap[req.request_status] || req.request_status}
                      </span>
                    </div>
                    <div className={styles.tableCell}>
                      <span className={`${styles.stBadge} ${styles[overallBorrow]}`}>
                        {borrowStatusMap[overallBorrow]}
                      </span>
                    </div>
                    <div className={styles.tableCell}>{req.details?.length ?? 0}</div>
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
                );
              })
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