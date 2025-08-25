"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";
import { FaEye } from "react-icons/fa";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

// ✅ react-select styles
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

// ✅ แปลสถานะ
const statusMap = {
  created: "สร้างแล้ว",
  submitted: "ส่งแล้ว",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธแล้ว",
  closed: "ปิดแล้ว",
  canceled: "ยกเลิก",
  draft: "ฉบับร่าง",
  processing: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
};

// ✅ ตัวเลือกสถานะ
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "created", label: "สร้างแล้ว" },
  { value: "submitted", label: "ส่งแล้ว" },
  { value: "approved", label: "อนุมัติแล้ว" },
  { value: "rejected", label: "ปฏิเสธแล้ว" },
  { value: "closed", label: "ปิดแล้ว" },
  { value: "canceled", label: "ยกเลิก" },
  { value: "draft", label: "ฉบับร่าง" },
  { value: "processing", label: "กำลังดำเนินการ" },
  { value: "completed", label: "เสร็จสิ้น" },
];

export default function RfqListPage() {
  const [rfqList, setRfqList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ฟิลเตอร์
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Pagination
  const rowsPerPage = 12;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchRfq = async () => {
      try {
        const response = await axiosInstance.get("/rfq/all");
        setRfqList(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } catch (err) {
        console.error("Error fetching RFQ list:", err);
        setError("ไม่สามารถดึงข้อมูลรายการใบขอราคาได้");
      } finally {
        setLoading(false);
      }
    };
    fetchRfq();
  }, []);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  // ✅ Filtered list
  const filteredList = useMemo(() => {
    return rfqList.filter((rfq) => {
      const okStatus = statusFilter === "all" || rfq.status === statusFilter;
      const okSearch =
        search === "" ||
        rfq.rfq_no?.toLowerCase().includes(search.toLowerCase()) ||
        rfq.created_by_name?.toLowerCase().includes(search.toLowerCase());
      return okStatus && okSearch;
    });
  }, [rfqList, statusFilter, search]);

  // Pagination
  const totalPages = useMemo(() => {
    const t = Math.ceil((filteredList?.length || 0) / rowsPerPage);
    return t > 0 ? t : 1;
  }, [filteredList]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageRows = (filteredList || []).slice(start, end);
  const displayRows = [...pageRows];
  while (displayRows.length < rowsPerPage) displayRows.push({ _placeholder: true });

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

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  // Badge class สี
  const getStatusClass = (s = "") => {
    const k = String(s).toLowerCase();
    if (["approved", "closed", "completed"].includes(k)) return styles.badgeGreen;
    if (["submitted", "open", "sent", "processing", "created"].includes(k)) return styles.badgeBlue;
    if (["rejected", "canceled", "cancelled"].includes(k)) return styles.badgeRed;
    if (["draft"].includes(k)) return styles.badgeYellow;
    return styles.badgeGray;
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.title}>รายการใบขอราคา (RFQ)</h1>

        {/* ✅ Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <label className={styles.label} htmlFor="status">สถานะ</label>
            <Select
              inputId="status"
              isClearable
              isSearchable={false}
              placeholder="ทุกสถานะ"
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
              onChange={(opt) => setStatusFilter(opt?.value || "all")}
              styles={customSelectStyles}
              menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
            />
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="search">ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  id="search"
                  type="text"
                  className={styles.input}
                  placeholder="ค้นหาเลขที่ RFQ หรือผู้สร้าง"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>เลขที่ RFQ</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={styles.headerItem}>วันที่สร้าง</div>
            <div className={styles.headerItem}>ผู้สร้าง</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>การจัดการ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": rowsPerPage }}>
            {filteredList.length === 0 ? (
              <div className={`${styles.tableGrid} ${styles.tableRow}`}>
                <div
                  className={`${styles.tableCell} ${styles.centerCell} ${styles.noDataRow}`}
                  style={{ gridColumn: "1 / -1" }}
                >
                  ไม่พบใบขอราคา
                </div>
              </div>
            ) : (
              displayRows.map((rfq, idx) => {
                const placeholder = !!rfq._placeholder;
                return (
                  <div
                    key={placeholder ? `p-${currentPage}-${idx}` : `rfq-${rfq.rfq_id}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ""}`}
                  >
                    <div className={styles.tableCell}>{placeholder ? "" : rfq.rfq_no}</div>
                    <div className={styles.tableCell}>
                      {placeholder ? "" : (
                        <span className={`${styles.statusBadge} ${getStatusClass(rfq.status)}`}>
                          {statusMap[rfq.status] || rfq.status || "-"}
                        </span>
                      )}
                    </div>
                    <div className={styles.tableCell}>{placeholder ? "" : formatDate(rfq.created_at)}</div>
                    <div className={styles.tableCell}>{placeholder ? "" : (rfq.created_by_name || "-")}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {!placeholder && (
                        <Link href={`/purchasing/rfq/${rfq.rfq_id}`} className={styles.detailButton}>
                          <FaEye className={styles.icon} />
                          <span>ดูรายละเอียด</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <li key={`e-${i}`} className={styles.ellipsis}>…</li>
              ) : (
                <li key={`p-${p}`}>
                  <button
                    className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </button>
                </li>
              )
            )}
            <li>
              <button
                className={styles.pageButton}
                onClick={() => handlePageChange(currentPage + 1)}
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
