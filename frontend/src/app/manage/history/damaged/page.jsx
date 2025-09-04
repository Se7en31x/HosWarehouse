"use client";
import { useEffect, useState, useMemo } from "react";
import { manageAxios } from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles (aligned with BorrowHistory) */
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

/* Mapping */
const TYPE_OPTIONS = [
  { value: "all", label: "ทุกประเภท" },
  { value: "damaged", label: "ชำรุด" },
  { value: "lost", label: "สูญหาย" },
];
const SOURCE_MAP = {
  borrow_return: "คืนจากการยืม",
  stock_check: "ตรวจสต็อก",
};

/* Badge class mapping */
const getTypeBadgeClass = (type) => {
  switch (type) {
    case "damaged":
      return "st-warning";
    case "lost":
      return "st-rejected";
    default:
      return "st-default";
  }
};

/* Helper */
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
    timeZone: "Asia/Bangkok",
  });
};

/* Modal Component */
const DetailModal = ({ show, onClose, data }) => {
  if (!show || !data) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            รายละเอียดพัสดุ {data.item_name || "-"}
          </h2>
          <button onClick={onClose} className={styles.modalCloseBtn} aria-label="ปิดหน้าต่างรายละเอียด">
            <X size={24} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>ข้อมูลพัสดุชำรุด/สูญหาย</h4>
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}>
                <b>วันที่:</b> {formatThaiDate(data.damaged_date) || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>พัสดุ:</b> {data.item_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>จำนวน:</b> {data.damaged_qty || 0} {data.item_unit || ""}
              </div>
              <div className={styles.modalItem}>
                <b>ประเภท:</b>
                <span className={`${styles.stBadge} ${styles[getTypeBadgeClass(data.damage_type)]}`}>
                  {TYPE_OPTIONS.find((t) => t.value === data.damage_type)?.label || "-"}
                </span>
              </div>
              <div className={styles.modalItem}>
                <b>ที่มา:</b> {SOURCE_MAP[data.source_type] || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ผู้รายงาน:</b> {data.reported_by || "-"}
              </div>
              {data.damaged_note && (
                <div className={styles.modalItem}>
                  <b>หมายเหตุ:</b> {data.damaged_note}
                </div>
              )}
              {data.damage_type === "lost" && (
                <div className={`${styles.modalItem} ${styles.lostNotice}`}>
                  <span aria-hidden="true">❌</span> สูญหาย - ไม่สามารถดำเนินการเพิ่มเติมได้
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DamagedHistoryPage() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await manageAxios.get("/history/damaged");
        setRecords(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching damaged history:", err);
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

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        search === "" ||
        r.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.reported_by?.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || r.damage_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [records, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE));
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredRecords.slice(start, start + ROWS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter]);

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
    setSearch("");
    setTypeFilter("all");
    setCurrentPage(1);
  };

  const handleShowDetail = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>ประวัติชำรุด/สูญหาย</h1>
        </div>

        {/* Toolbar */}
        <div className={styles.filterBar}>
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
                placeholder="เลือกประเภท..."
                aria-label="กรองตามประเภท"
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
                  placeholder="พัสดุ / ผู้รายงาน"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="ค้นหาพัสดุหรือผู้รายงาน"
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
            <div className={styles.headerItem}>พัสดุ</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={styles.headerItem}>ที่มา</div>
            <div className={styles.headerItem}>ผู้รายงาน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory}>
            {isLoading ? (
              <div className={styles.loadingContainer}>กำลังโหลดข้อมูล...</div>
            ) : filteredRecords.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลชำรุด/สูญหาย</div>
            ) : (
              pageRows.map((r) => (
                <div key={r.damaged_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div className={styles.tableCell}>{formatThaiDate(r.damaged_date)}</div>
                  <div className={styles.tableCell}>{r.item_name || "-"}</div>
                  <div className={styles.tableCell}>
                    {r.damaged_qty || 0} {r.item_unit || ""}
                  </div>
                  <div className={styles.tableCell}>
                    <span className={`${styles.stBadge} ${styles[getTypeBadgeClass(r.damage_type)]}`}>
                      {TYPE_OPTIONS.find((t) => t.value === r.damage_type)?.label || "-"}
                    </span>
                  </div>
                  <div className={styles.tableCell}>
                    {SOURCE_MAP[r.source_type] || "-"}
                  </div>
                  <div className={styles.tableCell}>{r.reported_by || "-"}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleShowDetail(r)}
                      aria-label={`ดูรายละเอียดพัสดุ ${r.item_name || "ไม่ระบุ"}`}
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
        <DetailModal
          show={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          data={selectedRecord}
        />
      </div>
    </div>
  );
}