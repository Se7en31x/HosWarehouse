'use client';

import { useState, useEffect, useMemo } from "react";
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

/* mapping */
const approvalStatusMap = {
  waiting_approval: "รอการอนุมัติ",
  approved_all: "อนุมัติทั้งหมด",
  approved_partial: "อนุมัติบางส่วน",
  approved_partial_and_rejected_partial: "อนุมัติบางส่วน",
  rejected: "ถูกปฏิเสธ",
  canceled: "ยกเลิก",
  completed: "เสร็จสิ้น",
};

const borrowStatusMap = {
  not_returned: "ยังไม่คืน",
  partially_returned: "คืนบางส่วน",
  returned_complete: "คืนครบแล้ว",
};

const urgentMap = { true: "ด่วน", false: "ปกติ" };
const returnConditionMap = {
  normal: "คืนปกติ",
  damaged: "ชำรุด",
  lost: "สูญหาย",
};

/* helper */
const formatThaiDate = (isoString) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  try {
    const parts = new Date(isoString).toISOString().split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
    }
  } catch (e) {
    // Fallback
  }
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
};

/* options */
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "waiting_approval", label: "รอการอนุมัติ" },
  { value: "approved_all", label: "อนุมัติทั้งหมด" },
  { value: "approved_partial", label: "อนุมัติบางส่วน" },
  { value: "rejected", label: "ถูกปฏิเสธ" },
  { value: "canceled", label: "ยกเลิก" },
  { value: "completed", label: "เสร็จสิ้น" },
];
const RETURN_OPTIONS = [
  { value: "all", label: "การคืนทั้งหมด" },
  { value: "not_returned", label: "ยังไม่คืน" },
  { value: "partially_returned", label: "คืนบางส่วน" },
  { value: "returned_complete", label: "คืนครบแล้ว" },
];
const URGENT_OPTIONS = [
  { value: "all", label: "เร่งด่วน/ปกติ" },
  { value: "urgent", label: "เฉพาะเร่งด่วน" },
  { value: "normal", label: "เฉพาะปกติ" },
];

/* badge class mapping */
const getStatusBadgeClass = (status) => {
  switch (status) {
    case "approved_all":
    case "returned_complete":
    case "completed":
      return "stAvailable";
    case "approved_partial":
    case "approved_partial_and_rejected_partial":
    case "waiting_approval":
    case "partially_returned":
      return "stLow";
    case "rejected":
    case "canceled":
      return "stOut";
    case "not_returned":
    default:
      return "stHold";
  }
};
const getUrgentBadgeClass = (isUrgent) => (isUrgent ? "stOut" : "stHold");
const getConditionBadgeClass = (condition) => {
  switch (condition) {
    case "normal":
      return "stAvailable";
    case "damaged":
    case "lost":
      return "stOut";
    default:
      return "stHold";
  }
};

// Modal Component
const DetailModal = ({ show, onClose, data }) => {
  if (!show || !data) return null;

  const getReturnStatus = (detail) => {
    const approvedQty = detail.approved_qty ?? 0;
    const returnedQty = detail.returned_total ?? 0;

    if (returnedQty === 0) return "not_returned";
    if (returnedQty < approvedQty) return "partially_returned";
    return "returned_complete";
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            รายละเอียดคำขอ {data.request_code}
          </h2>
          <button onClick={onClose} className={styles.modalCloseBtn}>
            <X size={24} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>ข้อมูลคำขอ</h4>
            <div className={styles.modalGrid}>
              <div className={styles.modalItem}>
                <b>วันที่ยืม:</b> {formatThaiDate(data.request_date) || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>กำหนดคืน:</b> {formatThaiDate(data.request_due_date) || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ผู้ยืม:</b> {data.requester_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>แผนก:</b> {data.department_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ผู้อนุมัติ:</b> {data.approved_by_name || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>วันที่อนุมัติ:</b> {formatThaiDate(data.approved_at) || "-"}
              </div>
              <div className={styles.modalItem}>
                <b>ความเร่งด่วน:</b>
                <span
                  className={`${styles.stBadge} ${styles[getUrgentBadgeClass(
                    data.is_urgent
                  )]}`}
                >
                  {data.is_urgent ? urgentMap.true : urgentMap.false}
                </span>
              </div>
              <div className={styles.modalItem}>
                <b>สถานะอนุมัติ:</b>
                <span
                  className={`${styles.stBadge} ${styles[getStatusBadgeClass(
                    data.request_status
                  )]}`}
                >
                  {approvalStatusMap[data.request_status] ||
                    data.request_status}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.modalSection}>
            <h4 className={styles.modalSectionTitle}>รายการสินค้าที่ยืม</h4>
            <div className={styles.itemListContainer}>
              {(data.details || []).map((detail, index) => {
                const returnStatus = getReturnStatus(detail);
                const returnStatusText =
                  borrowStatusMap[returnStatus] || returnStatus;

                return (
                  <div key={index} className={styles.itemDetailCard}>
                    <div className={styles.itemHeader}>
                      <h5 className={styles.itemName}>{detail.item_name}</h5>
                      <span
                        className={`${styles.stBadge} ${styles[getStatusBadgeClass(
                          returnStatus
                        )]}`}
                      >
                        {returnStatusText}
                      </span>
                    </div>
                    <div className={styles.itemInfoGrid}>
                      <p>
                        <b>จำนวนที่อนุมัติ:</b> {detail.approved_qty ?? "-"}{" "}
                        {detail.item_unit}
                      </p>
                      <p>
                        <b>จำนวนที่คืนแล้ว:</b>{" "}
                        {detail.returned_total ?? 0} {detail.item_unit}
                      </p>
                      <p>
                        <b>จำนวนคงเหลือ:</b>{" "}
                        {(detail.approved_qty ?? 0) -
                          (detail.returned_total ?? 0)}{" "}
                        {detail.item_unit}
                      </p>
                    </div>

                    <div className={styles.subDetailSection}>
                      <h6 className={styles.subDetailHeader}>
                        ประวัติการคืน
                      </h6>
                      {(detail.returns || []).length > 0 ? (
                        <ul className={styles.subDetailList}>
                          {detail.returns.map((ret, retIndex) => (
                            <li key={retIndex}>
                              <b>วันที่:</b>{" "}
                              {formatThaiDate(ret.return_date)} |{" "}
                              <b>จำนวน:</b> {ret.qty} {detail.item_unit}
                              <span
                                className={`${styles.stBadge} ${styles[getConditionBadgeClass(
                                  ret.condition
                                )]}`}
                              >
                                {returnConditionMap[ret.condition] ||
                                  ret.condition}
                              </span>
                              {ret.return_note &&
                                ` | <b>หมายเหตุ:</b> ${ret.return_note}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.noSubData}>ยังไม่มีการคืน</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function BorrowHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReturn, setFilterReturn] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12; // ปรับให้ตรงกับ InventoryCheck

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await manageAxios.get("/history/borrow");
        if (isMounted) {
          setData(Array.isArray(res.data) ? res.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch borrow history:", error);
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

  const filteredData = useMemo(() => {
    return data
      .map((req) => {
        const allReturned = req.details?.every((d) => {
          const approvedQty = d.approved_qty ?? 0;
          const returnedQty = d.returned_total ?? 0;
          return approvedQty > 0 && returnedQty >= approvedQty;
        });

        const hasReturns = req.details?.some((d) => d.returned_total > 0);

        let overallReturnStatus = "not_returned";
        if (allReturned) {
          overallReturnStatus = "returned_complete";
        } else if (hasReturns) {
          overallReturnStatus = "partially_returned";
        }

        return {
          ...req,
          overall_return_status: overallReturnStatus,
        };
      })
      .filter((req) => {
        const okStatus =
          filterStatus === "all" || req.request_status === filterStatus;
        const okReturn =
          filterReturn === "all" ||
          req.overall_return_status === filterReturn;
        const okUrgent =
          filterUrgent === "all" ||
          (filterUrgent === "urgent" && req.is_urgent) ||
          (filterUrgent === "normal" && !req.is_urgent);
        const okSearch =
          searchText === "" ||
          req.request_code?.toLowerCase().includes(searchText.toLowerCase()) ||
          req.department?.toLowerCase().includes(searchText.toLowerCase()) ||
          req.requester_name?.toLowerCase().includes(
            searchText.toLowerCase()
          ) ||
          (req.details || []).some((d) =>
            d.item_name?.toLowerCase().includes(searchText.toLowerCase())
          );
        return okStatus && okReturn && okUrgent && okSearch;
      });
  }, [data, filterStatus, filterReturn, filterUrgent, searchText]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);
  const startDisplay = filteredData.length ? start + 1 : 0;
  const endDisplay = Math.min(start + rowsPerPage, filteredData.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterReturn, filterUrgent, searchText]);

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
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }
    return pages;
  };

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterReturn("all");
    setFilterUrgent("all");
    setSearchText("");
    setCurrentPage(1);
  };

  const handleShowDetail = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const fillersCount = Math.max(0, rowsPerPage - (pageRows?.length || 0));

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ประวัติการยืม/คืน</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะอนุมัติ</label>
              <Select
                isClearable
                isSearchable={false}
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((o) => o.value === filterStatus) || null}
                onChange={(opt) => setFilterStatus(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะ..."
                aria-label="กรองตามสถานะอนุมัติ"
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะการคืน</label>
              <Select
                isClearable
                isSearchable={false}
                options={RETURN_OPTIONS}
                value={RETURN_OPTIONS.find((o) => o.value === filterReturn) || null}
                onChange={(opt) => setFilterReturn(opt?.value || "all")}
                styles={customSelectStyles}
                placeholder="เลือกสถานะการคืน..."
                aria-label="กรองตามสถานะการคืน"
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
                  placeholder="รหัส / แผนก / ผู้ยืม"
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
            <div className={styles.headerItem}>วันที่ยืม</div>
            <div className={styles.headerItem}>เลขที่คำขอ</div>
            <div className={styles.headerItem}>ผู้ยืม</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>กำหนดคืน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ด่วน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะอนุมัติ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะการคืน</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ตรวจสอบ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {isLoading ? (
              <div className={styles.loadingContainer} />
            ) : pageRows.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลการยืม</div>
            ) : (
              <>
                {pageRows.map((req, idx) => {
                  const overallBorrow = req.overall_return_status;
                  return (
                    <div
                      key={req.request_id || `row-${idx}`}
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                      role="row"
                    >
                      <div className={styles.tableCell} role="cell">
                        {formatThaiDate(req.request_date)}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {req.request_code || "-"}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {req.requester_name || "-"}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {req.department_name || "-"}
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {formatThaiDate(req.request_due_date)}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                        <span
                          className={`${styles.stBadge} ${styles[getUrgentBadgeClass(
                            req.is_urgent
                          )]}`}
                        >
                          {req.is_urgent ? urgentMap.true : urgentMap.false}
                        </span>
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                        <span
                          className={`${styles.stBadge} ${styles[getStatusBadgeClass(
                            req.request_status
                          )]}`}
                        >
                          {approvalStatusMap[req.request_status] ||
                            req.request_status}
                        </span>
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                        <span
                          className={`${styles.stBadge} ${styles[getStatusBadgeClass(
                            overallBorrow
                          )]}`}
                        >
                          {borrowStatusMap[overallBorrow] || overallBorrow}
                        </span>
                      </div>
                      <div className={styles.tableCell} role="cell">
                        {req.details?.length ?? 0}
                      </div>
                      <div
                        className={`${styles.tableCell} ${styles.centerCell}`}
                        role="cell"
                      >
                        <button
                          className={styles.actionButton}
                          onClick={() => handleShowDetail(req)}
                          aria-label={`ดูรายละเอียดคำขอ ${req.request_code}`}
                          title="ดูรายละเอียด"
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
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
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
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
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
                      className={`${styles.pageButton} ${
                        p === currentPage ? styles.activePage : ""
                      }`}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <DetailModal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        data={selectedRequest}
      />
    </div>
  );
}