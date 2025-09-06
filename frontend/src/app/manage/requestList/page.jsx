"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import { manageAxios } from "../../utils/axiosInstance";
import { Trash2, ChevronLeft, ChevronRight, Settings, Search } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* ---- react-select styles: ให้ตรงกับ InventoryWithdraw ---- */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    width: "100%",
    maxWidth: "250px",
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
    padding: "8px 12px",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  singleValue: (base) => ({ ...base, textAlign: "left" }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

/* แปลงสถานะ -> ภาษาไทย */
const mapStatusToThai = (status) => {
  switch (status) {
    case "waiting_approval": return "รอการอนุมัติ";
    case "approved_all": return "อนุมัติทั้งหมด";
    case "rejected_all": return "ปฏิเสธทั้งหมด";
    case "approved_partial": return "อนุมัติบางส่วน";
    case "rejected_partial": return "ปฏิเสธบางรายการ";
    case "approved_partial_and_rejected_partial": return "อนุมัติบางส่วน";
    default: return status;
  }
};

/* แมปสถานะ → ชื่อคลาสเรียบง่าย */
const statusClass = (status) => {
  switch (status) {
    case "waiting_approval": return "stWaiting";
    case "approved_all": return "stApproved";
    case "rejected_all": return "stRejected";
    case "approved_partial": return "stApprovedPartial";
    case "rejected_partial": return "stRejectedPartial";
    case "approved_partial_and_rejected_partial": return "stMixed";
    default: return "stDefault";
  }
};

/* ตัวเลือกสถานะสำหรับฟิลเตอร์ */
const STATUS_OPTIONS = [
  { value: "", label: "ทุกสถานะ" },
  { value: "waiting_approval", label: mapStatusToThai("waiting_approval") },
  { value: "approved_all", label: mapStatusToThai("approved_all") },
  { value: "rejected_all", label: mapStatusToThai("rejected_all") },
  { value: "approved_partial", label: mapStatusToThai("approved_partial") },
  { value: "rejected_partial", label: mapStatusToThai("rejected_partial") },
  { value: "approved_partial_and_rejected_partial", label: mapStatusToThai("approved_partial_and_rejected_partial") },
];

/* helper: ทำ key ให้เสถียร */
const stableKey = (item) => {
  const base =
    item?.request_id ??
    item?.request_code ??
    `${item?.user_name || "user"}-${item?.request_date || "time"}`;
  return `req-${String(base)}`;
};

/* helper: dedupe ตาม request_id โดยเลือกตัวที่ request_date ใหม่สุด */
const dedupeByIdLatest = (list) => {
  const map = new Map(); // id → item (latest)
  for (const it of list) {
    const id = it?.request_id ?? it?.request_code ?? `${it?.user_name}-${it?.request_date}`;
    const t = new Date(it?.request_date || 0).getTime();
    const prev = map.get(id);
    if (!prev) {
      map.set(id, it);
    } else {
      const pt = new Date(prev?.request_date || 0).getTime();
      if (t >= pt) map.set(id, it);
    }
  }
  return Array.from(map.values());
};

export default function ApprovalRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // ⬅️ ล็อค 12 แถวต่อหน้า

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await manageAxios.get(
        "/requests?status=waiting_approval,approved_all,rejected_all,approved_partial,rejected_partial,approved_partial_and_rejected_partial"
      );
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    const socket = connectSocket();
    socket.on("requestUpdated", () => { fetchRequests(); });
    return () => { disconnectSocket(); };
  }, []);

  /* filter ตามสถานะ + คำค้น */
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((item) => {
      const okStatus = status === "" || item.request_status === status;
      const okSearch =
        q === "" ||
        item.request_code?.toLowerCase().includes(q) ||
        item.user_name?.toLowerCase().includes(q) ||
        item.department?.toLowerCase().includes(q);
      return okStatus && okSearch;
    });
  }, [requests, status, search]);

  /* ✅ dedupe เพื่อกัน key ซ้ำจาก backend (เช่น ได้หลายแถว id เดียวกันต่างสถานะ) */
  const uniqRequests = useMemo(() => dedupeByIdLatest(filteredRequests), [filteredRequests]);

  const totalPages = Math.max(1, Math.ceil(uniqRequests.length / itemsPerPage));

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return uniqRequests.slice(start, start + itemsPerPage);
  }, [uniqRequests, currentPage]);

  // เติมแถวว่างให้ครบหน้า
  const fillersCount = Math.max(0, itemsPerPage - (currentItems?.length || 0));

  const handlePrevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);
  const handleNextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, "...", totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    return pages;
  };

  const clearFilters = () => {
    setStatus("");
    setSearch("");
    setCurrentPage(1);
  };

  useEffect(() => { setCurrentPage(1); }, [status, search]);
  // คลัมป์หมายเลขหน้าเมื่อจำนวนหน้าลดลง
  useEffect(() => { setCurrentPage((p) => Math.min(Math.max(1, p), totalPages)); }, [totalPages]);

  // ช่วงแสดงผล (info bar)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const startDisplay = uniqRequests.length ? startIndex + 1 : 0;
  const endDisplay = Math.min(startIndex + itemsPerPage, uniqRequests.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ตรวจสอบรายการเบิก ยืม</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={`${styles.filterGrid} ${styles.filterGridCompact}`}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="status">สถานะ</label>
              <Select
                inputId="status"
                isClearable
                isSearchable={false}
                placeholder="ทุกสถานะ"
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find(o => o.value === status) || null}
                onChange={(opt) => setStatus(opt?.value || "")}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget || undefined}
              />
            </div>
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.inputIcon} />
              <input
                id="search"
                className={styles.input}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="รหัสคำขอ, ชื่อผู้ขอ, แผนก..."
                aria-label="ค้นหาด้วยรหัสคำขอ, ชื่อผู้ขอ, หรือแผนก"
              />
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
              title="ล้างตัวกรอง"
              aria-label="ล้างตัวกรอง"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* ตาราง */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>รหัสคำขอ</div>
            <div className={styles.headerItem}>ผู้ขอเบิก</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>วันที่/เวลา</div>
            <div className={styles.headerItem}>จำนวนรายการ</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={`${styles.headerItem} ${styles.centerHeader}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerHeader}`}>การดำเนินการ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": `${itemsPerPage}` }}>
            {loading ? (
              <div className={styles.loadingContainer} />
            ) : error ? (
              <div className={styles.noDataMessage}>{error}</div>
            ) : currentItems.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>
            ) : (
              <>
                {currentItems.map((item) => {
                  const typeLabel = String(item.request_types).toLowerCase() === "borrow" ? "ยืม" : "เบิก";
                  return (
                    <div className={`${styles.tableGrid} ${styles.tableRow}`} key={stableKey(item)}>
                      <div className={styles.tableCell}>{item.request_code || "-"}</div>
                      <div className={styles.tableCell}>{item.user_name || "-"}</div>
                      <div className={styles.tableCell}>{item.department || "-"}</div>
                      <div className={styles.tableCell}>
                        {item.request_date
                          ? new Date(item.request_date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                          : "-"}
                      </div>
                      <div className={styles.tableCell}>{item.item_count ?? "-"}</div>
                      <div className={styles.tableCell}>{typeLabel}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <span className={`${styles.stBadge} ${styles[statusClass(item.request_status)]}`}>
                          {mapStatusToThai(item.request_status)}
                        </span>
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <Link href={`/manage/approvalRequest/${item.request_id}`}>
                          <button className={styles.actionButton}>
                            <Settings size={16} /> จัดการ
                          </button>
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* เติมแถวว่างให้ครบ 12 แถวเสมอ */}
                {Array.from({ length: fillersCount }).map((_, i) => (
                  <div
                    key={`filler-${currentPage}-${i}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                    aria-hidden="true"
                  >
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

          {/* แถบสรุป + หน้า */}
          <div className={styles.paginationBar}>
            <div className={styles.paginationInfo}>
              กำลังแสดง {startDisplay}-{endDisplay} จาก {uniqRequests.length} รายการ
            </div>
            {totalPages > 1 && (
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    aria-label="ไปยังหน้าที่แล้ว"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
                  ) : (
                    <li key={`page-${p}-${idx}`}>
                      <button
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                        onClick={() => setCurrentPage(p)}
                        aria-label={`ไปยังหน้า ${p}`}
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
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages}
                    aria-label="ไปยังหน้าถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
