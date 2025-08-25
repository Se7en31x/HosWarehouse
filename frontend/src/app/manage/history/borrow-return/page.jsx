"use client";
import { useState, useEffect, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.3rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

/* mapping */
const approvalStatusMap = {
  waiting_approval: "รอการอนุมัติ",
  approved_all: "อนุมัติทั้งหมด",
  approved_partial: "อนุมัติบางส่วน",
  approved_partial_and_rejected_partial: "อนุมัติบางส่วน",  // ✅ เพิ่มตรงนี้
  rejected: "ปฏิเสธ",
  canceled: "ยกเลิก",
  completed: "เสร็จสิ้น",
};

const borrowStatusMap = {
  not_returned: "ยังไม่คืน",
  partially_returned: "คืนบางส่วน",
  returned: "คืนครบแล้ว",
};
const urgentMap = { true: "ด่วน", false: "ปกติ" };
const returnStatusMap = {
  normal: "คืนปกติ",
  damaged: "ชำรุด",
  lost: "สูญหาย",
};

/* options */
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "waiting_approval", label: "รอการอนุมัติ" },
  { value: "approved_all", label: "อนุมัติทั้งหมด" },
  { value: "approved_partial", label: "อนุมัติบางส่วน" },
  { value: "rejected", label: "ถูกปฏิเสธ" },
  { value: "canceled", label: "ยกเลิก" },
];
const RETURN_OPTIONS = [
  { value: "all", label: "การคืนทั้งหมด" },
  { value: "normal", label: "คืนปกติ" },
  { value: "damaged", label: "คืนชำรุด" },
  { value: "lost", label: "สูญหาย" },
];
const URGENT_OPTIONS = [
  { value: "all", label: "เร่งด่วน/ปกติ" },
  { value: "urgent", label: "เฉพาะเร่งด่วน" },
  { value: "normal", label: "เฉพาะปกติ" },
];

/* helper */
const formatThaiDate = (isoString) => {
  if (!isoString) return "-";
  const d = new Date(isoString);
  return d.toLocaleString("th-TH", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function BorrowHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReturn, setFilterReturn] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [searchText, setSearchText] = useState("");

  // pagination
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/borrow");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch {
        Swal.fire({ icon: "error", title: "โหลดข้อมูลผิดพลาด" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    return data.filter((req) => {
      const okStatus = filterStatus === "all" || req.request_status === filterStatus;
      const okReturn =
        filterReturn === "all" ||
        req.details?.some((d) => d.returns?.some((r) => r.condition === filterReturn));
      const okUrgent =
        filterUrgent === "all" ||
        (filterUrgent === "urgent" && req.is_urgent) ||
        (filterUrgent === "normal" && !req.is_urgent);
      const okSearch =
        searchText === "" ||
        req.request_code?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.department?.toLowerCase().includes(searchText.toLowerCase()) ||
        req.requester_name?.toLowerCase().includes(searchText.toLowerCase());
      return okStatus && okReturn && okUrgent && okSearch;
    });
  }, [data, filterStatus, filterReturn, filterUrgent, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);

  // เติม placeholder rows
  const displayRows = [...pageRows];
  while (displayRows.length < rowsPerPage) {
    displayRows.push({ _placeholder: true, request_id: `ph-${displayRows.length}` });
  }

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
    setFilterStatus("all");
    setFilterReturn("all");
    setFilterUrgent("all");
    setSearchText("");
    setCurrentPage(1);
  };

  // popup
  const showDetail = (req) => {
    Swal.fire({
      title: `รายละเอียดคำขอ ${req.request_code}`,
      html: `
        <p><b>วันที่ยืม:</b> ${formatThaiDate(req.request_date)}</p>
        <p><b>ผู้ยืม:</b> ${req.requester_name}</p>
        <p><b>แผนก:</b> ${req.department}</p>
        <p><b>กำหนดคืน:</b> ${formatThaiDate(req.request_due_date)}</p>
        <p><b>สถานะอนุมัติ:</b> ${approvalStatusMap[req.request_status] || req.request_status}</p>
        <p><b>ความเร่งด่วน:</b> ${req.is_urgent ? urgentMap.true : urgentMap.false}</p>
      `,
      width: "700px",
      confirmButtonText: "ปิด",
      confirmButtonColor: "#2563eb",
    });
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>📚 ประวัติการยืม/คืน</h1>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>สถานะอนุมัติ</label>
            <Select
              isClearable
              isSearchable={false}
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.find((o) => o.value === filterStatus) || null}
              onChange={(opt) => setFilterStatus(opt?.value || "all")}
              styles={customSelectStyles}
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
            />
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="ค้นหา: รหัส / แผนก / ผู้ยืม"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>วันที่ยืม</div>
            <div className={styles.headerItem}>เลขที่คำขอ</div>
            <div className={styles.headerItem}>ผู้ยืม</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>กำหนดคืน</div>
            <div className={styles.headerItem}>ด่วน</div>
            <div className={styles.headerItem}>สถานะอนุมัติ</div>
            <div className={styles.headerItem}>สถานะการคืน</div>
            <div className={styles.headerItem}>จำนวนรายการ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>จัดการ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {isLoading ? (
              <div className={`${styles.tableGrid} ${styles.tableRow} ${styles.noDataRow}`}>กำลังโหลดข้อมูล...</div>
            ) : displayRows.map((req, idx) => {
              const placeholder = !!req._placeholder;
              let overallBorrow = "not_returned";
              if (!placeholder) {
                const statuses = req.details?.map((d) => d.borrow_status) || [];
                if (statuses.length > 0) {
                  if (statuses.every((s) => s === "returned")) overallBorrow = "returned";
                  else if (statuses.some((s) => s === "returned" || s === "partially_returned"))
                    overallBorrow = "partially_returned";
                }
              }
              return (
                <div key={req.request_id || `row-${idx}`} className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ""}`}>
                  <div className={styles.tableCell}>{placeholder ? "" : formatThaiDate(req.request_date)}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.request_code}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.requester_name}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.department}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : formatThaiDate(req.request_due_date)}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : <span className={styles.statusBadge}>{req.is_urgent ? urgentMap.true : urgentMap.false}</span>}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : <span className={styles.statusBadge}>{approvalStatusMap[req.request_status] || req.request_status}</span>}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : <span className={styles.statusBadge}>{borrowStatusMap[overallBorrow]}</span>}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.details?.length ?? 0}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {placeholder ? "" : <button className={styles.detailButton} onClick={() => showDetail(req)}>ดูรายละเอียด</button>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button className={styles.pageButton} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft size={16} />
              </button>
            </li>
            {getPageNumbers().map((p, idx) =>
              p === "..." ? <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li> : (
                <li key={`page-${p}`}>
                  <button className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`} onClick={() => setCurrentPage(p)}>
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
    </div>
  );
}
