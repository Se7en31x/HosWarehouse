"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import Swal from "sweetalert2";
import axiosInstance from "@/app/utils/axiosInstance";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles (เหมือนต้นแบบ แต่ปรับขนาดให้เล็กลง) */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem", /* ลดความสูงลงเล็กน้อย */
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    fontSize: "0.9rem", /* ลดขนาดฟอนต์ */
    width: "250px",     /* ✅ เพิ่มตรงนี้ */
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
    padding: "6px 10px", /* ลด padding */
    fontSize: "0.9rem",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af", fontSize: "0.9rem" }),
  clearIndicator: (base) => ({ ...base, padding: 4 }),
  dropdownIndicator: (base) => ({ ...base, padding: 4 }),
};

/* mapping */
const importTypeMap = {
  purchase: "จัดซื้อ",
  general: "รับเข้าทั่วไป",
  return: "คืนพัสดุ",
  repair_return: "คืนจากซ่อม",
  adjustment: "ปรับปรุงยอด",
};
const importStatusMap = {
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  posted: "บันทึกแล้ว",
  canceled: "ยกเลิก",
};

const TYPE_OPTIONS = [
  { value: "all", label: "ทุกประเภท" },
  ...Object.entries(importTypeMap).map(([k, v]) => ({ value: k, label: v })),
];
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(importStatusMap).map(([k, v]) => ({ value: k, label: v })),
];

// สถานะ badge
const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "posted":
      return "stAvailable"; // เขียว
    case "draft":
    case "waiting_approval":
      return "stLow"; // เหลือง
    case "canceled":
      return "stOut"; // แดง
    default:
      return "stHold"; // เทา
  }
};

export default function ImportHistory() {
  const [data, setData] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const rowsPerPage = 10;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  // ดึงข้อมูล
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/import");
        if (isMounted) {
          setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
        }
      } catch (err) {
        console.error("Error fetching import history:", err);
        Swal.fire({
          icon: "error",
          title: "ข้อผิดพลาด",
          text: "ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้",
          confirmButtonColor: "#008dda",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      : "-";

  // กรองข้อมูล
  const filtered = useMemo(() => {
    return data.filter((row) => {
      const okType = typeFilter === "all" || row.import_type === typeFilter;
      const okStatus =
        statusFilter === "all" || row.import_status === statusFilter;
      const okSearch =
        search === "" ||
        row.import_no?.toLowerCase().includes(search.toLowerCase()) ||
        row.source_name?.toLowerCase().includes(search.toLowerCase()) ||
        row.imported_by?.toLowerCase().includes(search.toLowerCase());
      return okType && okStatus && okSearch;
    });
  }, [data, typeFilter, statusFilter, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, search]);

  const getPageNumbers = () => {
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
    return pages;
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  // Popup detail
  const showDetail = (row) => {
    Swal.fire({
      title: `รายละเอียดการนำเข้า (${importTypeMap[row.import_type] || row.import_type})`,
      html: `
        <p><b>เลขที่เอกสาร:</b> ${row.import_no || "-"}</p>
        <p><b>วันที่นำเข้า:</b> ${formatDate(row.import_date)}</p>
        <p><b>ผู้นำเข้า:</b> ${row.imported_by || "-"}</p>
        <p><b>แหล่งที่มา:</b> ${row.source_name || "-"}</p>
        <p><b>สถานะ:</b> ${importStatusMap[row.import_status] || row.import_status}</p>
      `,
      width: "450px",
      confirmButtonColor: "#008dda",
    });
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ประวัติการนำเข้า</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.filterBar}>
          {/* ซ้าย: ประเภท + สถานะ */}
          <div className={styles.filterLeft}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภท</label>
              <Select
                isClearable
                isSearchable={false}
                options={TYPE_OPTIONS}
                value={TYPE_OPTIONS.find((o) => o.value === typeFilter) || null}
                onChange={(opt) => setTypeFilter(opt?.value || "all")}
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
                placeholder="เลือกประเภท..."
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <Select
                isClearable
                isSearchable={false}
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
                onChange={(opt) => setStatusFilter(opt?.value || "all")}
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
                placeholder="เลือกสถานะ..."
              />
            </div>
          </div>

          {/* ขวา: ค้นหา + ล้าง */}
          <div className={styles.filterRight}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ค้นหา..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>วันที่</div>
              <div className={styles.headerItem}>เลขที่เอกสาร</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>แหล่งที่มา</div>
              <div className={styles.headerItem}>ผู้นำเข้า</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>
                สถานะ
              </div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>
               ตรวจสอบ
              </div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
              {paginatedRows.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบข้อมูลการนำเข้า</div>
              ) : (
                paginatedRows.map((row) => (
                  <div
                    key={row.import_id}
                    className={`${styles.tableGrid} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>{formatDate(row.import_date)}</div>
                    <div className={styles.tableCell}>{row.import_no || "-"}</div>
                    <div className={styles.tableCell}>
                      {importTypeMap[row.import_type] || row.import_type}
                    </div>
                    <div className={styles.tableCell}>{row.source_name || "-"}</div>
                    <div className={styles.tableCell}>{row.imported_by || "-"}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span
                        className={`${styles.stBadge} ${styles[getStatusBadgeClass(row.import_status)]}`}
                      >
                        {importStatusMap[row.import_status] || row.import_status}
                      </span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <button
                        onClick={() => showDetail(row)}
                        className={styles.actionButton}
                        title="ดูรายละเอียด"
                        aria-label="ดูรายละเอียดการนำเข้า"
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
                  <li key={`ellipsis-${idx}`} className={styles.ellipsis}>
                    …
                  </li>
                ) : (
                  <li key={`page-${p}`}>
                    <button
                      className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""
                        }`}
                      onClick={() => setCurrentPage(p)}
                      aria-label={`หน้า ${p}`}
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
        )}
      </div>
    </div>
  );
}