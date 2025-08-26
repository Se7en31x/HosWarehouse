"use client";
import { useEffect, useState, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles (aligned with ImportHistory) */
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

/* Map ประเภท */
const typeMap = {
  withdraw: "เบิกพัสดุ",
  borrow: "ยืมออก",
  return_damaged: "คืนสภาพชำรุด",
  damaged_dispose: "ทำลายชำรุด",
  expired_dispose: "ทำลายหมดอายุ",
  adjust_out: "ปรับปรุงยอดตัดออก",
  return_lost: "สูญหาย (ตรวจนับ)",
};
const CATEGORY_OPTIONS = [
  { value: "all", label: "ทุกประเภท" },
  ...Object.entries(typeMap).map(([k, v]) => ({ value: k, label: v })),
];

export default function StockOutHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/stockout");
        setRecords(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching stockout history:", err);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, search]);

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
    setSearch("");
    setTypeFilter("all");
    setCurrentPage(1);
  };

  const handleShowDetail = async (doc) => {
    setSelected(doc);
    try {
      const res = await axiosInstance.get(`/history/stockout/${doc.stockout_id}`);
      setDetails(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching stockout detail:", err);
      setDetails([]);
    }
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>
             ประวัติการตัดออกจากคลัง
          </h1>
        </div>

        {/* Toolbar */}
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
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
                  placeholder="เลขที่เอกสาร / ผู้ดำเนินการ"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="ค้นหาเลขที่เอกสารหรือผู้ดำเนินการ"
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
            <div className={styles.headerItem}>เลขที่เอกสาร</div>
            <div className={styles.headerItem}>ผู้ดำเนินการ</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>จัดการ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": ROWS_PER_PAGE }}>
            {filteredRecords.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลการตัดออกจากคลัง</div>
            ) : (
              pageRows.map((r) => (
                <div key={r.stockout_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div className={styles.tableCell}>{formatThaiDate(r.stockout_date)}</div>
                  <div className={styles.tableCell}>{r.stockout_no || "-"}</div>
                  <div className={styles.tableCell}>{r.user_name || "-"}</div>
                  <div className={styles.tableCell}>
                    {typeMap[r.stockout_type] || "อื่น ๆ"}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleShowDetail(r)}
                      aria-label={`ดูรายละเอียดเอกสาร ${r.stockout_no || "ไม่ระบุ"}`}
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

        {/* Modal */}
        {selected && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>
                  รายละเอียดเอกสาร {selected.stockout_no || "-"}
                </h3>
                <button
                  className={styles.closeIcon}
                  onClick={() => {
                    setSelected(null);
                    setDetails([]);
                  }}
                  aria-label="ปิดหน้าต่างรายละเอียด"
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.detailContent}>
                <p><b>เลขที่เอกสาร:</b> {selected.stockout_no || "-"}</p>
                <p><b>ผู้ดำเนินการ:</b> {selected.user_name || "-"}</p>
                <p><b>ประเภท:</b> {typeMap[selected.stockout_type] || "อื่น ๆ"}</p>
                <p><b>สร้างเมื่อ:</b> {formatThaiDate(selected.created_at)}</p>
              </div>

              <h4 className={styles.detailTableTitle}>รายการพัสดุ</h4>
              <div className={styles.popupTableWrapper}>
                {/* Header */}
                <div className={`${styles.popupTable} ${styles.popupTableHeader}`}>
                  <div>พัสดุ</div>
                  <div>จำนวน</div>
                  <div>Lot No</div>
                  <div>วันหมดอายุ</div>
                </div>

                {/* Rows */}
                {details.length > 0 ? (
                  details.map((d) => (
                    <div key={d.stockout_detail_id} className={`${styles.popupTable} ${styles.popupTableRow}`}>
                      <div>{d.item_name || "-"}</div>
                      <div>{d.qty || 0} {d.unit || ""}</div>
                      <div>{d.lot_no || "-"}</div>
                      <div>{formatThaiDate(d.exp_date)}</div>
                    </div>
                  ))
                ) : (
                  <div className={`${styles.popupTable} ${styles.popupTableRow} ${styles.noDataRow}`}>
                    ไม่มีข้อมูลรายการพัสดุ
                  </div>
                )}

                {/* Empty Rows */}
                {Array.from({ length: Math.max(0, 5 - details.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className={`${styles.popupTable} ${styles.popupTableRow}`}>
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                  </div>
                ))}
              </div>
              <button
                className={styles.closeBtn}
                onClick={() => {
                  setSelected(null);
                  setDetails([]);
                }}
                aria-label="ปิดหน้าต่างรายละเอียด"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}