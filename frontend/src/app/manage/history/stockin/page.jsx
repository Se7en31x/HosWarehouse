'use client';

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { manageAxios } from "@/app/utils/axiosInstance";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });
const MySwal = withReactContent(Swal);

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
    width: "200px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    border: "1px solid #e5e7eb",
    zIndex: 9000,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "6px 10px",
    fontSize: "0.9rem",
  }),
};

/* mapping */
const stockinTypeMap = {
  purchase: "จัดซื้อ",
  "purchase-extra": "รับเพิ่มเติมจากการสั่งซื้อ",
  general: "รับเข้าทั่วไป",
  return: "คืนพัสดุ",
  repair_return: "คืนจากซ่อม",
  adjustment: "ปรับปรุงยอด",
};

const stockinStatusMap = {
  posted: "บันทึกแล้ว",
  completed: "เสร็จสิ้น",
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  canceled: "ยกเลิก",
};

const TYPE_OPTIONS = [
  { value: "all", label: "ทุกประเภท" },
  ...Object.entries(stockinTypeMap).map(([k, v]) => ({
    value: k,
    label: v,
  })),
];
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(stockinStatusMap).map(([k, v]) => ({
    value: k,
    label: v,
  })),
];

/* badge */
const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "posted":
    case "completed":
      return "stAvailable";
    case "draft":
    case "waiting_approval":
      return "stLow";
    case "canceled":
      return "stOut";
    default:
      return "stHold";
  }
};

/* render extra info */
const renderExtraInfo = (row) => {
  switch (row.stockin_type) {
    case "purchase":
    case "purchase-extra":
      return `<p><b>หมายเหตุ GR:</b> ${row.gr_note || "-"}</p>`;
    case "adjustment":
      return `<p><b>เหตุผลการปรับปรุง:</b> ${row.stockin_note || "-"}</p>`;
    default:
      return `<p><b>หมายเหตุ:</b> ${row.stockin_note || "-"}</p>`;
  }
};

export default function ImportHistory() {
  const [data, setData] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const rowsPerPage = 12;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  // ดึงข้อมูล
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await manageAxios.get("/history/stockin");
        const fetchedData = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
        if (isMounted) {
          setData(fetchedData);
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching stockin history:", err);
        if (isMounted) {
          setError("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้: " + (err?.response?.data?.message || err.message));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("th-TH", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  // filter
  const filtered = useMemo(() => {
    const result = data.filter((row) => {
      const okType = typeFilter === "all" || row.stockin_type === typeFilter;
      const okStatus = statusFilter === "all" || row.stockin_status === statusFilter;
      const okSearch =
        debouncedSearch === "" ||
        row.stockin_no?.toLowerCase().includes(debouncedSearch) ||
        row.user_name?.toLowerCase().includes(debouncedSearch);
      return okType && okStatus && okSearch;
    });
    return result;
  }, [data, typeFilter, statusFilter, debouncedSearch]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    const result = filtered.slice(start, start + rowsPerPage);
    return result;
  }, [filtered, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, debouncedSearch]);

  // Clamp current page when total pages change
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const fillersCount = Math.max(0, rowsPerPage - (paginatedRows?.length || 0));
  const startDisplay = filtered.length ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * rowsPerPage + paginatedRows.length, filtered.length);

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
    setTypeFilter("all");
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  // popup detail
  const showDetail = (row) => {
    const detailsHtml = row.details
      ?.map(
        (item, index) => `
          <div class="${styles.tableGrid} ${styles.tableRow}">
            <div class="${styles.tableCell}">${index + 1}</div>
            <div class="${styles.tableCell}">${item.item_name || "-"}</div>
            <div class="${styles.tableCell} ${styles.rightCell}">${item.qty || 0} ${item.unit || "-"}</div>
            <div class="${styles.tableCell}">${item.lot_no || "-"}</div>
            <div class="${styles.tableCell}">${item.note || "-"}</div>
          </div>
        `
      )
      .join("");

    MySwal.fire({
      title: `รายละเอียดการนำเข้า`,
      html: `
        <div class="${styles.detailContainer}">
          <div class="${styles.detailGrid}">
            <p><b>เลขที่เอกสาร:</b> ${row.stockin_no || "-"}</p>
            <p><b>วันที่นำเข้า:</b> ${formatDate(row.stockin_date)}</p>
            <p><b>ประเภท:</b> ${stockinTypeMap[row.stockin_type] || row.stockin_type || "-"}</p>
            <p><b>สถานะ:</b> <span class="${styles.stBadge} ${styles[getStatusBadgeClass(row.stockin_status)]}">${stockinStatusMap[row.stockin_status] || row.stockin_status || "-"}</span></p>
            <p><b>ผู้นำเข้า:</b> ${row.user_name || "-"}</p>
            ${renderExtraInfo(row)}
          </div>
          <h3 class="${styles.detailTitle}">รายการพัสดุ</h3>
          <div class="${styles.tableSection}">
            <div class="${styles.detailTable}">
              <div class="${styles.tableGrid} ${styles.tableHeader}">
                <div class="${styles.headerItem}">#</div>
                <div class="${styles.headerItem}">ชื่อพัสดุ</div>
                <div class="${styles.headerItem} ${styles.rightCell}">จำนวน</div>
                <div class="${styles.headerItem}">Lot</div>
                <div class="${styles.headerItem}">หมายเหตุ</div>
              </div>
              <div class="${styles.tableBody}">
                ${
                  detailsHtml ||
                  `<div class="${styles.noDataMessage}">ไม่พบรายการ</div>`
                }
              </div>
            </div>
          </div>
        </div>
      `,
      width: "800px",
      showCloseButton: true,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "ปิด",
      cancelButtonColor: "#2563eb",
      customClass: {
        container: styles.swalContainer,
        popup: styles.swalPopup,
        cancelButton: styles.swalCancelButton,
      },
    });
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ประวัติการนำเข้า</h1>
          </div>
        </div>

        {/* toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
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
                aria-label="เลือกประเภทการนำเข้า"
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
                aria-label="เลือกสถานะการนำเข้า"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ค้นหาเลขที่เอกสารหรือผู้นำเข้า"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="ค้นหาเลขที่เอกสารหรือผู้นำเข้า"
                />
              </div>
            </div>
          </div>
          <div className={styles.searchCluster}>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
              aria-label="ล้างตัวกรอง"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* table */}
        {error ? (
          <div className={styles.errorContainer}>
            <span>{error}</span>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                setData([]);
                manageAxios.get("/history/stockin").then((res) => {
                  setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
                  setIsLoading(false);
                }).catch((err) => {
                  setError("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้: " + (err?.response?.data?.message || err.message));
                  setIsLoading(false);
                });
              }}
              className={`${styles.ghostBtn} ${styles.retryButton}`}
              aria-label="ลองใหม่"
            >
              ลองใหม่
            </button>
          </div>
        ) : isLoading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection} role="region" aria-label="ตารางประวัติการนำเข้า">
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>วันที่</div>
              <div className={styles.headerItem}>เลขที่เอกสาร</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>ผู้นำเข้า</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
              {paginatedRows.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              ) : (
                <>
                  {paginatedRows.map((row, idx) => (
                    <div
                      key={row.stockin_id ?? `row-${idx}`}
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                      role="row"
                    >
                      <div className={styles.tableCell} role="cell">
                        {formatDate(row.stockin_date)}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {row.stockin_no || "-"}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {stockinTypeMap[row.stockin_type] || row.stockin_type || "-"}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {row.user_name || "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                        <span
                          className={`${styles.stBadge} ${styles[getStatusBadgeClass(row.stockin_status)]}`}
                        >
                          {stockinStatusMap[row.stockin_status] || row.stockin_status || "-"}
                        </span>
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                        <button
                          onClick={() => showDetail(row)}
                          className={styles.actionButton}
                          aria-label={`ดูรายละเอียด ${row.stockin_no || "การนำเข้า"}`}
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

            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filtered.length} รายการ
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
        )}
      </div>
    </div>
  );
}