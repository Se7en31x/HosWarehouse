"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import Link from "next/link";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import axiosInstance from "../../utils/axiosInstance";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* ---- react-select styles: ให้ตรงกับ InventoryWithdraw ---- */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",          // = 40px
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
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
};

/* แปลงสถานะ -> ภาษาไทย */
const mapStatusToThai = (status) => {
  switch (status) {
    case "waiting_approval": return "รอการอนุมัติ";
    case "approved_all": return "อนุมัติทั้งหมด";
    case "rejected_all": return "ปฏิเสธทั้งหมด";
    case "approved_partial": return "อนุมัติบางส่วน";
    case "rejected_partial": return "ปฏิเสธบางรายการ";
    case "approved_partial_and_rejected_partial": return "อนุมัติและปฏิเสธบางส่วน";
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
  { value: "waiting_approval", label: mapStatusToThai("waiting_approval") },
  { value: "approved_all", label: mapStatusToThai("approved_all") },
  { value: "rejected_all", label: mapStatusToThai("rejected_all") },
  { value: "approved_partial", label: mapStatusToThai("approved_partial") },
  { value: "rejected_partial", label: mapStatusToThai("rejected_partial") },
  { value: "approved_partial_and_rejected_partial", label: mapStatusToThai("approved_partial_and_rejected_partial") },
];

export default function ApprovalRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ คงฟิลเตอร์: status + search
  const [status, setStatus] = useState("");     // ว่าง = ทุกสถานะ
  const [search, setSearch] = useState("");

  // paging
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // สำหรับ react-select portal ให้เด้งบนสุดเสมอ (เมนูไม่โดนตัด)
  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(
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

  // ฟิลเตอร์ + ค้นหา (เหมือนเดิม)
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

  // เพจจิเนชัน
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage]);

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
          {/* ⬇️ เพิ่ม styles.filterGridCompact ตรงนี้ */}
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
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="search">ค้นหา</label>
              <input
                id="search"
                className={styles.input}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="รหัสคำขอ, ชื่อผู้ขอ, แผนก..."
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
            <div className={styles.headerItem}>ลำดับ</div>
            <div className={styles.headerItem}>วันที่และเวลา</div>
            <div className={styles.headerItem}>รหัสคำขอ</div>
            <div className={styles.headerItem}>ผู้ขอเบิก</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>จำนวนรายการ</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={styles.headerItem}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": itemsPerPage }}>
            {loading ? (
              <div className={styles.loadingContainer}>กำลังโหลดข้อมูล...</div>
            ) : error ? (
              <div className={styles.noDataMessage} style={{ color: "red" }}>{error}</div>
            ) : currentItems.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</div>
            ) : (
              currentItems.map((item, index) => (
                <div className={`${styles.tableGrid} ${styles.tableRow}`} key={item.request_id}>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </div>
                  <div className={styles.tableCell}>
                    {item.request_date
                      ? new Date(item.request_date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                      : "-"}
                  </div>
                  <div className={styles.tableCell}>{item.request_code || "-"}</div>
                  <div className={styles.tableCell}>{item.user_name || "-"}</div>
                  <div className={styles.tableCell}>{item.department || "-"}</div>
                  <div className={styles.tableCell}>{item.item_count ?? "-"}</div>
                  <div className={styles.tableCell}>{item.request_types || "-"}</div>
                  <div className={styles.tableCell}>
                    <span className={`${styles.stBadge} ${styles[statusClass(item.request_status)]}`}>
                      {mapStatusToThai(item.request_status)}
                    </span>
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <Link href={`/manage/approvalRequest/${item.request_id}`}>
                      <button className={styles.actionButton}>รายละเอียด</button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination แบบเดียวกัน */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={handlePrevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            {(function () {
              const nums = getPageNumbers();
              return nums.map((p, idx) =>
                p === "..." ? (
                  <li key={idx} className={styles.ellipsis}>…</li>
                ) : (
                  <li key={idx}>
                    <button
                      className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </li>
                )
              );
            })()
            }
            <li>
              <button
                className={styles.pageButton}
                onClick={handleNextPage}
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
