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
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  waiting_approval_detail: "รออนุมัติ",
  approved_all: "อนุมัติทั้งหมด",
  approved_partial: "อนุมัติบางส่วน",
  approved_partial_and_rejected_partial: "อนุมัติบางส่วน",
  rejected_all: "ปฏิเสธทั้งหมด",
  canceled: "ยกเลิก",
  approved: "อนุมัติ",
  rejected: "ปฏิเสธ",
};

const processingStatusMap = {
  waiting_approval: "รออนุมัติ",
  in_progress: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  canceled: "ยกเลิก",
  pending: "รอดำเนินการ",
};

const urgentMap = {
  true: "ด่วน",
  false: "ปกติ",
};

const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(statusMap)
    .filter(([k]) => !["approved", "rejected", "waiting_approval_detail"].includes(k))
    .map(([k, v]) => ({ value: k, label: v })),
];

const URGENT_OPTIONS = [
  { value: "all", label: "เร่งด่วน/ปกติ" },
  { value: "urgent", label: "เฉพาะเร่งด่วน" },
  { value: "normal", label: "เฉพาะปกติ" },
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

const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "approved_all":
    case "approved":
    case "completed":
      return "stAvailable";
    case "approved_partial":
    case "approved_partial_and_rejected_partial":
    case "waiting_approval":
    case "waiting_approval_detail":
    case "in_progress":
      return "stLow";
    case "rejected_all":
    case "rejected":
    case "canceled":
      return "stOut";
    case "draft":
    case "pending":
    default:
      return "stHold";
  }
};

const getUrgentBadgeClass = (isUrgent) => (isUrgent ? "stOut" : "stHold");

const getOverallProcessingStatus = (req) => {
  if (["canceled", "rejected_all"].includes(req.request_status)) {
    return "canceled";
  }
  if (req.request_status === "waiting_approval" || req.request_status === "draft") {
    return "waiting_approval";
  }
  if (
    [
      "approved_all",
      "approved_partial",
      "approved_partial_and_rejected_partial",
      "approved",
    ].includes(req.request_status)
  ) {
    if (!req.details || req.details.length === 0) return "in_progress";
    if (req.details.every((d) => d.processing_status === "completed")) {
      return "completed";
    }
    return "in_progress";
  }
  return "pending";
};

// --- Modal Component ---
const DetailModal = ({ show, onClose, data }) => {
  if (!show || !data) return null;

  const overallProcessing = getOverallProcessingStatus(data);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>รายละเอียดคำขอ {data.request_code}</h2>
          <button onClick={onClose} className={styles.modalCloseBtn}>
            <X size={24} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>ข้อมูลคำขอ</h4>
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}>
                <b>วันที่:</b> {formatThaiDate(data.request_date) || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>แผนก:</b> {data.department || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ผู้ขอ:</b> {data.requester_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ผู้อนุมัติ:</b> {data.approved_by_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>จำนวนรายการ:</b> {data.details?.length || 0} รายการ
              </div>
              <div className={styles.modalItem}>
                <b>รวมจำนวน:</b> {data.total_qty || 0}
              </div>
              <div className={styles.modalItem}>
                <b>สถานะคำขอ:</b>{" "}
                <span
                  className={`${styles.stBadge} ${styles[getStatusBadgeClass(data.request_status)]}`}
                >
                  {statusMap[data.request_status] || data.request_status}
                </span>
              </div>
              <div className={styles.modalItem}>
                <b>สถานะดำเนินการ:</b>{" "}
                <span
                  className={`${styles.stBadge} ${styles[getStatusBadgeClass(overallProcessing)]}`}
                >
                  {processingStatusMap[overallProcessing]}
                </span>
              </div>
              <div className={styles.modalItem}>
                <b>ความเร่งด่วน:</b>{" "}
                <span
                  className={`${styles.stBadge} ${styles[getUrgentBadgeClass(data.is_urgent)]}`}
                >
                  {urgentMap[data.is_urgent] || "-"}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>รายการคำขอ</h4>
            <div className={styles.itemListContainer}>
              {(data.details || []).length > 0 ? (
                data.details.map((item, index) => (
                  <div key={index} className={styles.itemDetailCard}>
                    <div className={styles.itemHeader}>
                      <h5 className={styles.itemName}>{item.item_name || "-"}</h5>
                      <span
                        className={`${styles.stBadge} ${styles[getStatusBadgeClass(item.status)]}`}
                      >
                        {statusMap[item.status] || item.status}
                      </span>
                    </div>
                    <div className={styles.itemInfoGrid}>
                      <p>
                        <b>จำนวนที่ขอ:</b> {item.requested_qty || 0} {item.unit || "-"}
                      </p>
                      <p>
                        <b>จำนวนที่อนุมัติ:</b> {item.approved_qty || 0} {item.unit || "-"}
                      </p>
                      <p>
                        <b>สถานะดำเนินการ:</b>{" "}
                        <span
                          className={`${styles.stBadge} ${styles[getStatusBadgeClass(item.processing_status)]}`}
                        >
                          {processingStatusMap[item.processing_status] || "-"}
                        </span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noSubData}>ไม่พบรายการ</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export default function WithdrawHistory() {
  // --- State ---
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const rowsPerPage = 12; // ปรับให้ตรงกับ InventoryCheck (12 รายการต่อหน้า)

  // --- Data Fetching ---
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await manageAxios.get("/history/withdraw");
        if (isMounted) {
          setData(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        console.error("Error fetching withdraw history:", err);
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

  // --- Data Filtering ---
  const filteredData = useMemo(() => {
    return data.filter((req) => {
      const okStatus = filterStatus === "all" || req.request_status === filterStatus;
      const okUrgent =
        filterUrgent === "all" ||
        (filterUrgent === "urgent" && req.is_urgent) ||
        (filterUrgent === "normal" && !req.is_urgent);
      const okSearch =
        searchText === "" ||
        req.request_code?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.department?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.requester_name?.toLowerCase().includes(searchText.toLowerCase());
      return okStatus && okUrgent && okSearch;
    });
  }, [data, filterStatus, filterUrgent, searchText]);

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterUrgent, searchText]);

  // Clamp current page when total pages change
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

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

  // --- Handlers ---
  const clearFilters = () => {
    setFilterStatus("all");
    setFilterUrgent("all");
    setSearchText("");
    setCurrentPage(1);
  };

  const handleShowDetail = (row) => {
    setSelectedRequest(row);
    setShowDetailModal(true);
  };

  // --- Pagination Info ---
  const start = (currentPage - 1) * rowsPerPage;
  const startDisplay = filteredData.length ? start + 1 : 0;
  const endDisplay = Math.min(start + rowsPerPage, filteredData.length);

  // --- Render ---
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ประวัติการเบิก</h1>
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
                value={STATUS_OPTIONS.find((o) => o.value === filterStatus) || null}
                onChange={(opt) => setFilterStatus(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะ..."
                aria-label="กรองตามสถานะ"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ความเร่งด่วน</label>
              <Select
                isClearable
                isSearchable={false}
                options={URGENT_OPTIONS}
                value={URGENT_OPTIONS.find((o) => o.value === filterUrgent) || null}
                onChange={(opt) => setFilterUrgent(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกความเร่งด่วน..."
                aria-label="กรองตามความเร่งด่วน"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="รหัส / แผนก / ผู้ขอ"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  aria-label="ค้นหาคำขอ"
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
            <div className={styles.headerItem}>เลขที่คำขอ</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>ผู้ขอ</div>
            <div className={styles.headerItem}>จำนวนรายการ</div>
            <div className={styles.headerItem}>รวมจำนวน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ด่วน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": `${rowsPerPage}` }}>
            {isLoading ? (
              <div className={styles.loadingContainer} />
            ) : paginatedRows.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลคำขอเบิก</div>
            ) : (
              paginatedRows.map((req, index) => (
                <div key={req.request_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div className={styles.tableCell}>{formatThaiDate(req.request_date)}</div>
                  <div className={styles.tableCell}>{req.request_code || "-"}</div>
                  <div className={styles.tableCell}>{req.department || "-"}</div>
                  <div className={styles.tableCell}>{req.requester_name || "-"}</div>
                  <div className={styles.tableCell}>{req.details?.length || 0}</div>
                  <div className={styles.tableCell}>{req.total_qty || 0}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <span
                      className={`${styles.stBadge} ${styles[getStatusBadgeClass(req.request_status)]}`}
                    >
                      {statusMap[req.request_status] || req.request_status}
                    </span>
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <span
                      className={`${styles.stBadge} ${styles[getUrgentBadgeClass(req.is_urgent)]}`}
                    >
                      {urgentMap[req.is_urgent] || "-"}
                    </span>
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleShowDetail(req)}
                      title="ดูรายละเอียด"
                      aria-label={`ดูรายละเอียดคำขอ ${req.request_code}`}
                    >
                      <Search size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
            {/* เติมแถวว่างให้ครบ 12 แถว */}
            {Array.from({ length: paginatedRows.length > 0 ? Math.max(0, rowsPerPage - paginatedRows.length) : 0 }).map((_, i) => (
              <div
                key={`filler-${i}`}
                className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                aria-hidden="true"
              >
                <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
              </div>
            ))}
          </div>

          {/* Pagination Bar */}
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
          data={selectedRequest}
        />
      </div>
    </div>
  );
}