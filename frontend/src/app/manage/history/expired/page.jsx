'use client';

import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import { manageAxios } from "@/app/utils/axiosInstance";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";
import styles from "./page.module.css";

// --- Imports ---
const Select = dynamic(() => import("react-select"), { ssr: false });

// --- React Select Styles ---
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

// --- Constants and Mappings ---
const statusMap = {
  pending: "รอดำเนินการ",
  partial: "ทำลายบางส่วนแล้ว",
  done: "ทำลายครบแล้ว",
};

const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v })),
];

// --- Helper Functions ---
const formatThaiDate = (isoString) => {
  if (!isoString) return "-";
  try {
    const parts = new Date(isoString).toISOString().split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
    }
  } catch (e) {
    // Fallback
  }
  return new Date(isoString).toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
};

const getStatusKey = (expiredQty, disposedQty) => {
  const remaining = (expiredQty || 0) - (disposedQty || 0);
  if (remaining <= 0) return "done";
  if (disposedQty > 0) return "partial";
  return "pending";
};

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "done":
      return "stAvailable";
    case "partial":
      return "stLow";
    case "pending":
      return "stOut";
    default:
      return "stHold";
  }
};

// --- Modal Component ---
const DetailModal = ({ show, onClose, data }) => {
  if (!show || !data) return null;

  const statusKey = getStatusKey(data.expired_qty, data.disposed_qty);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>รายละเอียด Lot {data.lot_no || "-"}</h2>
          <button onClick={onClose} className={styles.modalCloseBtn} aria-label="ปิดหน้าต่างรายละเอียด">
            <X size={24} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>ข้อมูลของหมดอายุ</h4>
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}>
                <b>วันที่บันทึก:</b> {formatThaiDate(data.expired_date) || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>Lot No:</b> {data.lot_no || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>รายการ:</b> {data.item_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>จำนวนรับเข้า:</b> {data.qty_imported || 0} {data.item_unit || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>จำนวนหมดอายุ:</b> {data.expired_qty || 0} {data.item_unit || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ทำลายแล้ว:</b> {data.disposed_qty || 0} {data.item_unit || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>คงเหลือ:</b> {(data.expired_qty || 0) - (data.disposed_qty || 0)} {data.item_unit || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>วันหมดอายุ:</b> {formatThaiDate(data.exp_date) || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>สถานะ:</b>{" "}
                <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(statusKey)]}`}>
                  {statusMap[statusKey]}
                </span>
              </div>
              <div className={styles.modalItem}>
                <b>รายงานโดย:</b> {data.user_name || "ระบบ"}
              </div>
              <div className={styles.modalItem}>
                <b>จัดการโดย:</b> {data.last_disposed_by || "ยังไม่มีข้อมูล"}
              </div>
              {data.note && (
                <div className={styles.modalItem}>
                  <b>หมายเหตุ:</b> {data.note}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function ExpiredHistoryPage() {
  // --- State ---
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const rowsPerPage = 12; // ปรับให้ตรงกับ InventoryCheck

  // --- Data Fetching ---
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await manageAxios.get("/history/expired");
        if (isMounted) {
          setRecords(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
        }
      } catch (err) {
        console.error("Error fetching expired history:", err);
        Swal.fire({
          icon: "error",
          title: "ข้อผิดพลาด",
          text: "ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้",
          confirmButtonColor: "#2563eb",
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

  // --- Data Filtering ---
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

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredData.slice(start, start + rowsPerPage);
  const startDisplay = filteredData.length ? start + 1 : 0;
  const endDisplay = Math.min(start + rowsPerPage, filteredData.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

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

  // --- Handlers ---
  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  const handleShowDetail = (row) => {
    setSelectedRow(row);
    setShowDetailModal(true);
  };

  const fillersCount = Math.max(0, rowsPerPage - (paginatedRows?.length || 0));

  // --- Render ---
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ประวัติของหมดอายุ</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
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
                menuPortalTarget={typeof window !== "undefined" ? document.body : null}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Lot No / รายการ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="ค้นหา Lot No หรือชื่อรายการ"
                />
              </div>
            </div>
          </div>
          <div className={styles.searchCluster}>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
              aria-label="ล้างตัวกรองทั้งหมด"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>วันที่บันทึก</div>
            <div className={styles.headerItem}>Lot No</div>
            <div className={styles.headerItem}>รายการ</div>
            <div className={styles.headerItem}>รับเข้า</div>
            <div className={styles.headerItem}>หมดอายุ</div>
            <div className={styles.headerItem}>คงเหลือ</div>
            <div className={styles.headerItem}>วันหมดอายุ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {isLoading ? (
              <div className={styles.loadingContainer} />
            ) : paginatedRows.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลของหมดอายุ</div>
            ) : (
              <>
                {paginatedRows.map((r) => {
                  const statusKey = getStatusKey(r.expired_qty, r.disposed_qty);
                  return (
                    <div
                      key={r.expired_id}
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                      role="row"
                    >
                      <div className={styles.tableCell} role="cell">
                        {formatThaiDate(r.expired_date)}
                      </div>
                      <div className={styles.tableCell} role="cell">{r.lot_no || "-"}</div>
                      <div className={styles.tableCell} role="cell">{r.item_name || "-"}</div>
                      <div className={styles.tableCell} role="cell">
                        {r.qty_imported || 0} {r.item_unit || ""}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {r.expired_qty || 0} {r.item_unit || ""}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {(r.expired_qty || 0) - (r.disposed_qty || 0)} {r.item_unit || ""}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {formatThaiDate(r.exp_date)}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                        <span
                          className={`${styles.stBadge} ${styles[getStatusBadgeClass(statusKey)]}`}
                        >
                          {statusMap[statusKey]}
                        </span>
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                        <button
                          className={styles.actionButton}
                          onClick={() => handleShowDetail(r)}
                          title="ดูรายละเอียด"
                          aria-label={`ดูรายละเอียด Lot ${r.lot_no}`}
                        >
                          <Search size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {Array.from({ length: fillersCount }).map((_, i) => (
                  <div
                    key={`filler-${i}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                    aria-hidden="true"
                  >
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  </div>
                ))}
              </>
            )}
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

        {/* Modal */}
        <DetailModal
          show={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          data={selectedRow}
        />
      </div>
    </div>
  );
}