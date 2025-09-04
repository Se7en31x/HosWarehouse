// File: WithdrawHistory.js
"use client";
import { useState, useEffect, useMemo } from "react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";

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
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "6px 10px",
    fontSize: "0.9rem",
  }),
};

/* mapping */
const statusMap = {
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  waiting_approval_detail: "รออนุมัติ", // ✅ เพิ่มอันนี้
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

const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v })),
];

const URGENT_OPTIONS = [
  { value: "all", label: "เร่งด่วน/ปกติ" },
  { value: "urgent", label: "เฉพาะเร่งด่วน" },
  { value: "normal", label: "เฉพาะปกติ" },
];

/* badge class */
const getStatusBadgeClass = (status) => {
  switch (status) {
    case "approved_all":
    case "approved":
    case "completed":
      return "stAvailable"; // เขียว
    case "approved_partial":
    case "approved_partial_and_rejected_partial":
    case "waiting_approval":
    case "waiting_approval_detail": // ✅ เพิ่มตรงนี้
    case "in_progress":
      return "stLow"; // เหลือง
    case "rejected_all":
    case "rejected":
    case "canceled":
      return "stOut"; // แดง
    case "draft":
    case "pending":
    default:
      return "stHold"; // เทา
  }
};

/* helper */
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

/* overall processing logic */
const getOverallProcessingStatus = (req) => {
  if (["canceled", "rejected_all"].includes(req.request_status)) {
    return "canceled";
  }
  if (req.request_status === "waiting_approval" || req.request_status === "draft") {
    return "waiting_approval";
  }
  if (
    ["approved_all", "approved_partial", "approved_partial_and_rejected_partial", "approved"].includes(
      req.request_status
    )
  ) {
    if (!req.details || req.details.length === 0) return "in_progress";
    if (req.details.every((d) => d.processing_status === "completed")) {
      return "completed";
    }
    return "in_progress";
  }
  return "pending";
};

// Modal Component
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
            <h4 className={styles.modalSectionTitle}>ข้อมูลสรุป</h4>
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}><b>วันที่:</b> {formatThaiDate(data.request_date)}</div>
              <div className={styles.modalItem}><b>แผนก:</b> {data.department || "-"}</div>
              <div className={styles.modalItem}><b>ผู้ขอ:</b> {data.requester_name || "-"}</div>
              <div className={styles.modalItem}><b>ผู้อนุมัติ:</b> {data.approved_by_name || "-"}</div>
              <div className={styles.modalItem}>
                <b>สถานะคำขอ:</b>{" "}
                {statusMap[data.request_status] || data.request_status}
              </div>
              <div className={styles.modalItem}>
                <b>สถานะดำเนินการ:</b>{" "}
                <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(overallProcessing)]}`}>
                  {processingStatusMap[overallProcessing]}
                </span>
              </div>
              <div className={styles.modalItem}><b>ความเร่งด่วน:</b> {data.is_urgent ? "ด่วน" : "ปกติ"}</div>
            </div>
          </div>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>รายการ</h4>
            <div className={styles.tableContainer}>
              <table className={styles.detailTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>รายการ</th>
                    <th>จำนวนที่ขอ</th>
                    <th>จำนวนที่อนุมัติ</th>
                    <th>หน่วย</th>
                    <th>สถานะอนุมัติ</th>
                    <th>สถานะดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.item_name}</td>
                      <td className={styles.textCenter}>{item.requested_qty}</td>
                      <td className={styles.textCenter}>{item.approved_qty}</td>
                      <td>{item.unit}</td>
                      <td>
                        <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(item.status)]}`}>
                          {statusMap[item.status] || item.status}
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(item.processing_status)]}`}>
                          {processingStatusMap[item.processing_status] || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function WithdrawHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await manageAxios.get("/history/withdraw");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
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

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterUrgent, searchText]);

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
    setFilterStatus("all");
    setFilterUrgent("all");
    setSearchText("");
    setCurrentPage(1);
  };

  const handleShowDetail = (row) => {
    setSelectedRequest(row);
    setShowDetailModal(true);
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>ประวัติการเบิก</h1>
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
                value={STATUS_OPTIONS.find((o) => o.value === filterStatus) || null}
                onChange={(opt) => setFilterStatus(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะ..."
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
              />
            </div>
          </div>
          <div className={styles.filterRight}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="รหัส / แผนก / ผู้ขอ"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={16} /> ล้างตัวกรอง
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
            <div className={styles.headerItem}>จำนวนในรายการ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะคำขอ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะดำเนินการ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory}>
            {isLoading ? (
              <div className={styles.loadingContainer}>กำลังโหลดข้อมูล...</div>
            ) : pageRows.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลคำขอเบิก</div>
            ) : (
              pageRows.map((req) => {
                const overallProcessing = getOverallProcessingStatus(req);
                return (
                  <div key={req.request_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{formatThaiDate(req.request_date)}</div>
                    <div className={styles.tableCell}>{req.request_code || "-"}</div>
                    <div className={styles.tableCell}>{req.department || "-"}</div>
                    <div className={styles.tableCell}>{req.requester_name || "-"}</div>
                    <div className={styles.tableCell}>{req.details?.length || 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(req.request_status)]}`}>
                        {statusMap[req.request_status] || req.request_status}
                      </span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.stBadge} ${styles[getStatusBadgeClass(overallProcessing)]}`}>
                        {processingStatusMap[overallProcessing]}
                      </span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <button className={styles.actionButton} onClick={() => handleShowDetail(req)}>
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
              <button className={styles.pageButton} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
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
                  >
                    {p}
                  </button>
                </li>
              )
            )}
            <li>
              <button className={styles.pageButton} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages}>
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>
      <DetailModal show={showDetailModal} onClose={() => setShowDetailModal(false)} data={selectedRequest} />
    </div>
  );
}