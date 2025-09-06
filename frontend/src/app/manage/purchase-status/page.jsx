"use client";
import { useEffect, useMemo, useState } from "react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import dynamic from "next/dynamic";
const Select = dynamic(() => import("react-select"), { ssr: false });
import { ChevronLeft, ChevronRight, Trash2, PackageCheck } from "lucide-react";
import { toast } from "react-toastify";

// Filter options
const statusOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "processing", label: "กำลังดำเนินการ" },
  { value: "pending", label: "รอดำเนินการ" },
];

const categoryOptions = [
  { value: "all", label: "ทุกประเภท" },
  { value: "medicine", label: "ยา" },
  { value: "medsup", label: "เวชภัณฑ์" },
  { value: "equipment", label: "ครุภัณฑ์" },
  { value: "meddevice", label: "อุปกรณ์ทางการแพทย์" },
  { value: "general", label: "ของใช้ทั่วไป" },
];

// react-select styles
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
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
    padding: "8px 12px",
    textAlign: "left",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  singleValue: (base) => ({ ...base, textAlign: "left" }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

export default function WarehousePurchaseStatus() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters + pagination
  const [filter, setFilter] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const ITEMS_PER_PAGE = 12;
  const COLS = 9;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  const safeTime = (d) => {
    const t = new Date(d).getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await manageAxios.get("/purchase-status");
      setRows(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("❌ โหลดข้อมูลไม่สำเร็จ:", err);
      setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
      toast?.error?.("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Translate status with badge classes
  const translateStatus = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return { text: "เสร็จสิ้น", class: "stCompleted" };
      case "processing":
        return { text: "กำลังดำเนินการ", class: "stProcessing" };
      case "pending":
        return { text: "รอดำเนินการ", class: "stPending" };
      default:
        return { text: status || "-", class: "stNeutral" };
    }
  };

  // Translate category
  const translateCategory = (category) => {
    if (!category) return "-";
    switch (category.toLowerCase()) {
      case "medicine":
        return "ยา";
      case "medsup":
        return "เวชภัณฑ์";
      case "equipment":
        return "ครุภัณฑ์";
      case "meddevice":
        return "อุปกรณ์ทางการแพทย์";
      case "general":
        return "ของใช้ทั่วไป";
      default:
        return category;
    }
  };

  // Filter + sort
  const filteredRows = useMemo(() => {
    const q = debouncedSearch;
    return rows
      .filter((r) => {
        const statusMatch = filter === "all" || r.status?.toLowerCase() === filter;
        const categoryMatch = filterCategory === "all" || r.item_category?.toLowerCase() === filterCategory;
        const searchMatch =
          (r.item_name || "").toLowerCase().includes(q) ||
          (r.pr_no || "").toLowerCase().includes(q);
        return statusMatch && categoryMatch && searchMatch;
      })
      .sort((a, b) => safeTime(b.request_date) - safeTime(a.request_date));
  }, [rows, filter, filterCategory, debouncedSearch]);

  // Reset page on filter/search change
  useEffect(() => {
    setPage(1);
  }, [filter, filterCategory, debouncedSearch]);

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredRows.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRows, page]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedRows?.length || 0));
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const startDisplay = filteredRows.length ? startIndex + 1 : 0;
  const endDisplay = Math.min(startIndex + ITEMS_PER_PAGE, filteredRows.length);

  const goToPreviousPage = () => page > 1 && setPage((p) => p - 1);
  const goToNextPage = () => page < totalPages && setPage((p) => p + 1);
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
    }
    return pages;
  };

  const clearFilters = () => {
    setFilter("all");
    setFilterCategory("all");
    setSearch("");
    setPage(1);
  };

  const formatDateTime = (d) => {
    try {
      return d
        ? new Date(d).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
    } catch {
      return "-";
    }
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <PackageCheck size={28} />
              ติดตามสถานะคำขอซื้อ (ฝ่ายคลัง)
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <Select
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานะ..."
                styles={customSelectStyles}
                value={statusOptions.find((o) => o.value === filter) || null}
                onChange={(opt) => setFilter(opt?.value || "all")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>หมวดหมู่</label>
              <Select
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={categoryOptions.find((o) => o.value === filterCategory) || null}
                onChange={(opt) => setFilterCategory(opt?.value || "all")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <input
                className={styles.input}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาด้วยชื่อสินค้า หรือ PR No..."
                aria-label="ค้นหาด้วยชื่อสินค้า หรือ PR No"
              />
            </div>
          </div>
          <div className={styles.searchCluster}>
            <button
              onClick={clearFilters}
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              title="ล้างตัวกรอง"
              aria-label="ล้างตัวกรอง"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        {error ? (
          <div className={styles.errorContainer}>
            <span>{error}</span>
            <button
              onClick={fetchData}
              className={`${styles.ghostBtn} ${styles.retryButton}`}
              aria-label="ลองใหม่"
            >
              ลองใหม่
            </button>
          </div>
        ) : loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection} role="region" aria-label="ตารางสถานะคำขอซื้อ">
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>วันที่ขอ</div>
              <div className={styles.headerItem}>PR No</div>
              <div className={styles.headerItem}>รายการ</div>
              <div className={styles.headerItem}>หมวดหมู่</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวน</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>หน่วย</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>รับแล้ว</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>คงเหลือ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedRows.length > 0 ? (
                <>
                  {paginatedRows.map((r, idx) => {
                    const { text, class: statusClass } = translateStatus(r.status);
                    return (
                      <div
                        key={`${r.pr_no || "-"}-${idx}`}
                        className={`${styles.tableGrid} ${styles.tableRow}`}
                        role="row"
                      >
                        <div className={styles.tableCell} role="cell">
                          {formatDateTime(r.request_date)}
                        </div>
                        <div className={styles.tableCell} role="cell">
                          {r.pr_no || "-"}
                        </div>
                        <div className={styles.tableCell} role="cell" title={r.item_name}>
                          {r.item_name || "-"}
                        </div>
                        <div className={styles.tableCell} role="cell">
                          {translateCategory(r.item_category)}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {r.qty_requested ?? 0}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {r.item_unit || "-"}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {r.received_qty ?? 0}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {r.remaining_qty ?? 0}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          <span className={`${styles.stBadge} ${styles[statusClass]}`}>
                            {text}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Fill empty rows to maintain 12 rows */}
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
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    </div>
                  ))}
                </>
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}
            </div>

            {/* Pagination bar */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredRows.length} รายการ
              </div>
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={goToPreviousPage}
                    disabled={page === 1}
                    aria-label="ไปยังหน้าที่แล้ว"
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
                        className={`${styles.pageButton} ${p === page ? styles.activePage : ""}`}
                        onClick={() => setPage(p)}
                        aria-label={`ไปยังหน้า ${p}`}
                        aria-current={p === page ? "page" : undefined}
                      >
                        {p}
                      </button>
                    </li>
                  )
                )}
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={goToNextPage}
                    disabled={page >= totalPages}
                    aria-label="ไปยังหน้าถัดไป"
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