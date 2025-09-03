'use client';
import { useEffect, useState, useMemo } from "react";
import {manageAxios} from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
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

/* Map สถานะ */
const statusMap = {
  pending: "รอดำเนินการ",
  partial: "ทำลายบางส่วนแล้ว",
  done: "ทำลายครบแล้ว",
};
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v })),
];

/* badge class mapping */
const getStatusBadgeClass = (status) => {
  switch (status) {
    case "done":
      return "stAvailable"; // เขียว
    case "partial":
      return "stLow"; // เหลือง
    case "pending":
      return "stOut"; // แดง
    default:
      return "stHold"; // เทา
  }
};

export default function ExpiredHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await manageAxios.get("/history/expired");
        setRecords(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching expired history:", err);
      }
    };
    fetchData();
  }, []);

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

  const getStatusKey = (expiredQty, disposedQty) => {
    const remaining = (expiredQty || 0) - (disposedQty || 0);
    if (remaining <= 0) return "done";
    if (disposedQty > 0) return "partial";
    return "pending";
  };

  const filteredData = useMemo(() => {
    return records.filter((r) => {
      const statusKey = getStatusKey(r.expired_qty, r.disposed_qty);
      const okStatus = statusFilter === "all" || statusKey === statusFilter;
      const okSearch =
        search === "" ||
        r.lot_no?.toLowerCase().includes(search.toLowerCase()) ||
        r.item_name?.toLowerCase().includes(search.toLowerCase());
      return okStatus && okSearch;
    });
  }, [records, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

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
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>ประวัติของหมดอายุ</h1>
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
                value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
                onChange={(opt) => setStatusFilter(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะ..."
                aria-label="กรองตามสถานะ"
                menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
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
                  placeholder="Lot No / ชื่อพัสดุ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="ค้นหา Lot No หรือชื่อพัสดุ"
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
            <div className={styles.headerItem}>วันที่บันทึก</div>
            <div className={styles.headerItem}>Lot No</div>
            <div className={styles.headerItem}>พัสดุ</div>
            <div className={styles.headerItem}>รับเข้า</div>
            <div className={styles.headerItem}>หมดอายุ</div>
            <div className={styles.headerItem}>วันหมดอายุ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {filteredData.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลของหมดอายุ</div>
            ) : (
              pageRows.map((r) => {
                const statusKey = getStatusKey(r.expired_qty, r.disposed_qty);
                return (
                  <div key={r.expired_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{formatThaiDate(r.expired_date)}</div>
                    <div className={styles.tableCell}>{r.lot_no || "-"}</div>
                    <div className={styles.tableCell}>{r.item_name || "-"}</div>
                    <div className={styles.tableCell}>
                      {r.qty_imported || 0} {r.item_unit || ""}
                    </div>
                    <div className={styles.tableCell}>
                      {r.expired_qty || 0} {r.item_unit || ""}
                    </div>
                    <div className={styles.tableCell}>
                      {formatThaiDate(r.exp_date)}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(statusKey)]}`}>
                        {statusMap[statusKey]}
                      </span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <button
                        className={styles.actionButton}
                        onClick={() => setSelected(r)}
                        aria-label={`ดูรายละเอียด Lot ${r.lot_no}`}
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

        {/* Modal */}
        {selected && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>รายละเอียด Lot {selected.lot_no || "-"}</h3>
                <button className={styles.modalClose} onClick={() => setSelected(null)}>
                  <X size={24} />
                </button>
              </div>
              <div className={styles.modalContent}>
                <table className={styles.detailTable}>
                  <tbody>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>วันที่บันทึก:</td>
                      <td className={styles.detailValue}>{formatThaiDate(selected.expired_date)}</td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>Lot No:</td>
                      <td className={styles.detailValue}>{selected.lot_no || "-"}</td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>พัสดุ:</td>
                      <td className={styles.detailValue}>{selected.item_name || "-"}</td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>จำนวนรับเข้า:</td>
                      <td className={styles.detailValue}>
                        {selected.qty_imported || 0} {selected.item_unit || ""}
                      </td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>จำนวนหมดอายุ:</td>
                      <td className={styles.detailValue}>
                        {selected.expired_qty || 0} {selected.item_unit || ""}
                      </td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>ทำลายแล้ว:</td>
                      <td className={styles.detailValue}>
                        {selected.disposed_qty || 0} {selected.item_unit || ""}
                      </td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>คงเหลือ:</td>
                      <td className={styles.detailValue}>
                        {(selected.expired_qty || 0) - (selected.disposed_qty || 0)} {selected.item_unit || ""}
                      </td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>วันหมดอายุ:</td>
                      <td className={styles.detailValue}>{formatThaiDate(selected.exp_date)}</td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>สถานะ:</td>
                      <td className={styles.detailValue}>
                        <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(getStatusKey(selected.expired_qty, selected.disposed_qty))]}`}>
                          {statusMap[getStatusKey(selected.expired_qty, selected.disposed_qty)]}
                        </span>
                      </td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>รายงานโดย:</td>
                      <td className={styles.detailValue}>{selected.user_name || "ระบบ"}</td>
                    </tr>
                    <tr className={styles.detailRow}>
                      <td className={styles.detailLabel}>จัดการโดย:</td>
                      <td className={styles.detailValue}>{selected.last_disposed_by || "ยังไม่มีข้อมูล"}</td>
                    </tr>
                    {selected.note && (
                      <tr className={styles.detailRow}>
                        <td className={styles.detailLabel}>หมายเหตุ:</td>
                        <td className={styles.detailValue}>{selected.note}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.btnSecondary} ${styles.closeBtn}`}
                  onClick={() => setSelected(null)}
                  aria-label="ปิดหน้าต่างรายละเอียด"
                >
                  ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}