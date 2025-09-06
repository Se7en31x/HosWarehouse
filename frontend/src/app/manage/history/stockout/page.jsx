'use client';

import { useEffect, useState, useMemo } from "react";
import { manageAxios } from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
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
const typeMap = {
  withdraw: "เบิกจ่าย",
  borrow: "ยืมออก",
  return_damaged: "คืนสภาพชำรุด",
  damaged_dispose: "จัดการชำรุด",
  expired_dispose: "จัดการหมดอายุ",
  adjust_out: "ปรับปรุงยอดตัดออก",
  return_lost: "สูญหาย (ตรวจนับ)",
  damaged: "การชำรุด",
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "ทุกประเภท" },
  ...Object.entries(typeMap).map(([k, v]) => ({ value: k, label: v })),
];

/* Badge class mapping */
const getTypeBadgeClass = (type) => {
  switch (type) {
    case "withdraw":
    case "borrow":
      return "stAvailable";
    case "return_damaged":
    case "damaged_dispose":
    case "expired_dispose":
    case "damaged":
      return "stLow";
    case "return_lost":
      return "stOut";
    case "adjust_out":
      return "stHold";
    default:
      return "stHold";
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
const DetailModal = ({ show, onClose, data, details }) => {
  if (!show || !data) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            รายละเอียดเอกสาร {data.stockout_no || "-"}
          </h2>
          <button onClick={onClose} className={styles.modalCloseBtn} aria-label="ปิดหน้าต่างรายละเอียด">
            <X size={24} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>ข้อมูลเอกสาร</h4>
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}>
                <b>เลขที่เอกสาร:</b> {data.stockout_no || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ผู้ดำเนินการ:</b> {data.user_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ประเภท:</b>
                <span className={`${styles.stBadge} ${styles[getTypeBadgeClass(data.stockout_type)]}`}>
                  {typeMap[data.stockout_type] || "อื่น ๆ"}
                </span>
              </div>
              <div className={styles.modalItem}>
                <b>สร้างเมื่อ:</b> {formatThaiDate(data.created_at) || "-"}
              </div>
            </div>
          </div>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>รายการพัสดุ</h4>
            <div className={styles.itemListContainer}>
              {details.length > 0 ? (
                details.map((d, index) => (
                  <div key={d.stockout_detail_id} className={styles.itemDetailCard}>
                    <div className={styles.itemHeader}>
                      <h5 className={styles.itemName}>{d.item_name || "-"}</h5>
                    </div>
                    <div className={styles.itemInfoGrid}>
                      <p><b>ลำดับ:</b> {index + 1}</p>
                      <p><b>Lot No.:</b> {d.lot_no || "-"}</p>
                      <p><b>จำนวน:</b> {d.qty || 0} {d.unit || ""}</p>
                      <p><b>วันหมดอายุ:</b> {formatThaiDate(d.exp_date) || "-"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noSubData}>ไม่มีข้อมูลรายการพัสดุ</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function StockOutHistoryPage() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [details, setDetails] = useState([]);
  const ROWS_PER_PAGE = 12; // ปรับให้ตรงกับ InventoryCheck

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await manageAxios.get("/history/stockout");
        if (isMounted) {
          setRecords(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Error fetching stockout history:", err);
        Swal.fire({
          icon: "error",
          title: "ข้อผิดพลาด",
          text: "ไม่สามารถโหลดข้อมูลได้",
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

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesType = typeFilter === "all" || r.stockout_type === typeFilter;
      const matchesSearch =
        search === "" ||
        r.stockout_no?.toLowerCase().includes(search.toLowerCase()) ||
        r.user_name?.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [records, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE));
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredRecords.slice(start, start + ROWS_PER_PAGE);
  const startDisplay = filteredRecords.length ? start + 1 : 0;
  const endDisplay = Math.min(start + ROWS_PER_PAGE, filteredRecords.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, search]);

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

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCurrentPage(1);
  };

  const handleShowDetail = async (doc) => {
    setSelectedRecord(doc);
    setShowDetailModal(true);
    try {
      const res = await manageAxios.get(`/history/stockout/${doc.stockout_id}`);
      setDetails(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching stockout detail:", err);
      Swal.fire({
        icon: "error",
        title: "ข้อผิดพลาด",
        text: "ไม่สามารถโหลดรายละเอียดได้",
        confirmButtonColor: "#2563eb",
      });
      setDetails([]);
    }
  };

  const fillersCount = Math.max(0, ROWS_PER_PAGE - (pageRows?.length || 0));

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ประวัติการตัดออกจากคลัง</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภทเอกสาร</label>
              <Select
                isClearable
                isSearchable={false}
                options={CATEGORY_OPTIONS}
                value={CATEGORY_OPTIONS.find((o) => o.value === typeFilter) || null}
                onChange={(opt) => setTypeFilter(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกประเภท..."
                aria-label="กรองตามประเภทเอกสาร"
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
                  placeholder="เลขที่เอกสาร / ผู้ดำเนินการ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="ค้นหาเลขที่เอกสารหรือผู้ดำเนินการ"
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
            <div className={styles.headerItem}>วันที่</div>
            <div className={styles.headerItem}>เลขที่เอกสาร</div>
            <div className={styles.headerItem}>ผู้ดำเนินการ</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวนรายการ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": ROWS_PER_PAGE }}>
            {isLoading ? (
              <div className={styles.loadingContainer} />
            ) : filteredRecords.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลการตัดออกจากคลัง</div>
            ) : (
              <>
                {pageRows.map((r) => (
                  <div key={r.stockout_id} className={`${styles.tableGrid} ${styles.tableRow}`} role="row">
                    <div className={styles.tableCell} role="cell">{formatThaiDate(r.stockout_date)}</div>
                    <div className={styles.tableCell} role="cell">{r.stockout_no || "-"}</div>
                    <div className={styles.tableCell} role="cell">{r.user_name || "-"}</div>
                    <div className={styles.tableCell} role="cell">
                      <span className={`${styles.stBadge} ${styles[getTypeBadgeClass(r.stockout_type)]}`}>
                        {typeMap[r.stockout_type] || "อื่น ๆ"}
                      </span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                      {r.total_items || 0} รายการ
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                      <button
                        className={styles.actionButton}
                        onClick={() => handleShowDetail(r)}
                        aria-label={`ดูรายละเอียดเอกสาร ${r.stockout_no || "ไม่ระบุ"}`}
                        title="ดูรายละเอียด"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>
                ))}
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
              กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredRecords.length} รายการ
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
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecord(null);
            setDetails([]);
          }}
          data={selectedRecord}
          details={details}
        />
      </div>
    </div>
  );
}