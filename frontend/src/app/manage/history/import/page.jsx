"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import Swal from "sweetalert2";
import axiosInstance from "@/app/utils/axiosInstance";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
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

export default function ImportHistory() {
  const [data, setData] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // ✅ Pagination
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/import");
        setData(res.data || []);
      } catch (err) {
        console.error("Error fetching import history:", err);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("th-TH") : "-";

  // ✅ Filter
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

  // ✅ Pagination calc
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filtered.slice(start, start + rowsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(
        1,
        "...",
        totalPages - 4,
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

  // ✅ Popup detail
  const showDetail = (row) => {
    Swal.fire({
      title: `รายละเอียดการนำเข้า (${importTypeMap[row.import_type] || row.import_type
        })`,
      html: `
        <p><b>เลขที่เอกสาร:</b> ${row.import_no || "-"}</p>
        <p><b>วันที่นำเข้า:</b> ${formatDate(row.import_date)}</p>
        <p><b>ผู้นำเข้า:</b> ${row.imported_by}</p>
        <p><b>สถานะ:</b> ${importStatusMap[row.import_status] || row.import_status}</p>
      `,
      width: "450px",
    });
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>ประวัติการนำเข้า (Import)</h1>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>ประเภท</label>
            <Select
              isClearable
              isSearchable={false}
              options={TYPE_OPTIONS}
              value={TYPE_OPTIONS.find((o) => o.value === typeFilter) || null}
              onChange={(opt) => setTypeFilter(opt?.value || "all")}
              styles={customSelectStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : undefined
              }
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
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : undefined
              }
            />
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="ค้นหาเอกสาร / แหล่งที่มา / ผู้นำเข้า"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
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
        <div className={styles.tableFrame}>
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
              จัดการ
            </div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {pageRows.length === 0 ? (
              <div
                className={`${styles.tableGrid} ${styles.tableRow} ${styles.noDataRow}`}
              >
                ไม่พบข้อมูลการนำเข้า
              </div>
            ) : (
              pageRows.map((row) => (
                <div
                  key={row.import_id}
                  className={`${styles.tableGrid} ${styles.tableRow}`}
                >
                  <div className={styles.tableCell}>
                    {formatDate(row.import_date)}
                  </div>
                  <div className={styles.tableCell}>{row.import_no || "-"}</div>
                  <div className={styles.tableCell}>
                    {importTypeMap[row.import_type] || row.import_type}
                  </div>
                  <div className={styles.tableCell}>
                    {row.source_name || "-"}
                  </div>
                  <div className={styles.tableCell}>{row.imported_by}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <span className={styles.statusBadge}>
                      {importStatusMap[row.import_status] || row.import_status}
                    </span>
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <button
                      onClick={() => showDetail(row)}
                      className={styles.detailButton}
                    >
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ✅ Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
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
