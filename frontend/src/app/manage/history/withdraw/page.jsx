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

/* mapping สถานะ */
const statusMap = {
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  approved_all: "อนุมัติทั้งหมด",
  approved_partial: "อนุมัติบางส่วน",
  approved_partial_and_rejected_partial: "อนุมัติบางส่วน",
  rejected_all: "ปฏิเสธทั้งหมด",
  canceled: "ยกเลิก",
};
const urgentMap = { true: "ด่วน", false: "ปกติ" };

const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "waiting_approval", label: "รอการอนุมัติ" },
  { value: "approved_all", label: "อนุมัติทั้งหมด" },
  { value: "approved_partial", label: "อนุมัติบางส่วน" },
  { value: "rejected_all", label: "ปฏิเสธทั้งหมด" },
  { value: "canceled", label: "ยกเลิก" },
];
const URGENT_OPTIONS = [
  { value: "all", label: "เร่งด่วน/ปกติ" },
  { value: "urgent", label: "เฉพาะเร่งด่วน" },
  { value: "normal", label: "เฉพาะปกติ" },
];

export default function WithdrawHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [searchText, setSearchText] = useState("");

  // ✅ Pagination
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/withdraw");
        setData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching withdraw history:", err);
        Swal.fire({ icon: "error", title: "ข้อผิดพลาด", text: "โหลดข้อมูลไม่สำเร็จ" });
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

  // ✅ Pagination calc
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = filteredData.slice(start, end);

  // ✅ เติม placeholder rows ให้ครบ 10 แถว
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
    setFilterUrgent("all");
    setSearchText("");
    setCurrentPage(1);
  };

  // ✅ Popup detail
  const showDetail = (row) => {
    Swal.fire({
      title: `รายละเอียดคำขอ ${row.request_code}`,
      html: `
        <p><b>วันที่:</b> ${row.request_date}</p>
        <p><b>แผนก:</b> ${row.department}</p>
        <p><b>ผู้ขอ:</b> ${row.requester_name}</p>
        <p><b>จำนวน:</b> ${row.total_items} รายการ (${row.total_qty} ชิ้น)</p>
        <p><b>สถานะ:</b> ${statusMap[row.request_status] || row.request_status}</p>
        <p><b>ด่วน:</b> ${row.is_urgent ? "ด่วน" : "ปกติ"}</p>
      `,
      width: "700px",
      confirmButtonText: "ปิด",
      confirmButtonColor: "#2563eb",
    });
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>📦 ประวัติการเบิก/ยืม</h1>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>สถานะ</label>
            <Select
              isClearable
              isSearchable={false}
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.find((o) => o.value === filterStatus) || null}
              onChange={(opt) => setFilterStatus(opt?.value || "all")}
              styles={customSelectStyles}
              menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
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
              menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
            />
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="ค้นหา: รหัส / แผนก / ผู้ขอ"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>วันที่</div>
            <div className={styles.headerItem}>เลขที่คำขอ</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>ผู้ขอ</div>
            <div className={styles.headerItem}>จำนวนรายการ</div>
            <div className={styles.headerItem}>รวมจำนวน</div>
            <div className={styles.headerItem}>สถานะรวม</div>
            <div className={styles.headerItem}>ด่วน</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>จัดการ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {isLoading ? (
              <div className={`${styles.tableGrid} ${styles.tableRow} ${styles.noDataRow}`}>
                กำลังโหลดข้อมูล...
              </div>
            ) : displayRows.map((req, idx) => {
              const placeholder = !!req._placeholder;
              return (
                <div
                  key={req.request_id || `row-${idx}`}
                  className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ""}`}
                >
                  <div className={styles.tableCell}>{placeholder ? "" : req.request_date}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.request_code}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.department}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.requester_name}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.total_items}</div>
                  <div className={styles.tableCell}>{placeholder ? "" : req.total_qty}</div>
                  <div className={styles.tableCell}>
                    {placeholder ? "" : (
                      <span className={styles.statusBadge}>
                        {statusMap[req.request_status] || req.request_status}
                      </span>
                    )}
                  </div>
                  <div className={styles.tableCell}>
                    {placeholder ? "" : (
                      <span className={styles.statusBadge}>
                        {req.is_urgent ? urgentMap.true : urgentMap.false}
                      </span>
                    )}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {placeholder ? "" : (
                      <button
                        className={styles.detailButton}
                        onClick={() => showDetail(req)}
                      >
                        ดูรายละเอียด
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
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
