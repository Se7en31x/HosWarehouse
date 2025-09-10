"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ── ตัวเลือกสถานะ (ภาษาไทยด้านหน้า / mapping ภายใน) ───────────────── */
const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "รอรับเพิ่ม", "เสร็จสิ้น", "ยกเลิก"];

const normalizeStatusKey = (thaiStatus = "") => {
  switch (thaiStatus) {
    case "รอดำเนินการ":
      return "pending";
    case "รอรับเพิ่ม":
      return "partial";
    case "เสร็จสิ้น":
      return "completed";
    case "ยกเลิก":
      return "cancelled";
    default:
      return thaiStatus?.toLowerCase?.() || "";
  }
};

const toThaiStatus = (status = "") => {
  const s = status.toLowerCase();
  if (s === "pending") return "รอดำเนินการ";
  if (s === "partial") return "รอรับเพิ่ม";
  if (s === "completed") return "เสร็จสิ้น";
  if (s === "cancelled") return "ยกเลิก";
  return status ? status : "ไม่ทราบสถานะ";
};

/* ── Badge ───────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  let badgeStyle = styles.pending;
  if (s === "completed") badgeStyle = styles.completed;
  else if (s === "partial") badgeStyle = styles.partial;
  else if (s === "cancelled") badgeStyle = styles.canceled;

  return <span className={`${styles.stBadge} ${badgeStyle}`}>{toThaiStatus(s)}</span>;
};

export default function GoodsReceiptListPage() {
  const [grList, setGrList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);

  /* ── Pagination (12 แถวคงที่) ───────────────────── */
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  /* ── โหลดข้อมูล ─────────────────────────────────── */
  useEffect(() => {
    const fetchGRs = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/gr");
        const arr = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
        setGrList(arr);
      } catch (err) {
        Swal.fire({
          title: "ผิดพลาด",
          text: err?.response?.data?.message || err.message || "ไม่สามารถโหลดข้อมูลได้",
          icon: "error",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      } finally {
        setLoading(false);
      }
    };
    fetchGRs();
  }, []);

  /* ── กรอง + จัดเรียง ─────────────────────────────── */
  const filteredGrList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const want = normalizeStatusKey(filterStatus);

    const list = grList.filter((gr) => {
      const matchStatus = filterStatus === "ทั้งหมด" || (gr.status || "").toLowerCase() === want;
      const hay =
        (gr.gr_no || "").toLowerCase() +
        " " +
        (gr.po_no || "").toLowerCase() +
        " " +
        (gr.supplier_name || "").toLowerCase();
      const matchText = q ? hay.includes(q) : true;
      return matchStatus && matchText;
    });

    // เรียงจากวันที่รับล่าสุด -> เก่าสุด, ถ้าเท่ากันเรียงตาม GR No.
    list.sort((a, b) => {
      const da = new Date(a.gr_date || 0).getTime();
      const db = new Date(b.gr_date || 0).getTime();
      if (db !== da) return db - da;
      return String(a.gr_no || "").localeCompare(String(b.gr_no || ""));
    });

    return list;
  }, [grList, filterStatus, searchTerm]);

  /* ── คุมหน้า ─────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(filteredGrList.length / ITEMS_PER_PAGE));

  // รีเซ็ตหน้าเมื่อกรองเปลี่ยน
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm]);

  // กันหน้าเกินเมื่อจำนวนหน้าลดลง
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filteredGrList.slice(start, start + ITEMS_PER_PAGE);
  const fillersCount = Math.max(0, ITEMS_PER_PAGE - pageItems.length);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredGrList.length && setCurrentPage((c) => c + 1);

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

  const startDisplay = filteredGrList.length ? start + 1 : 0;
  const endDisplay = Math.min(start + ITEMS_PER_PAGE, filteredGrList.length);

  /* ── UI ───────────────────────────────────────────── */
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>รายการรับสินค้า</h1>
            <p className={styles.subtitle}>ดูและจัดการรายการรับสินค้าทั้งหมด</p>
          </div>
          <Link href="/purchasing/goodsReceipt/create" className={styles.noUnderline}>
            <button className={styles.primaryButton}>
              <FaPlusCircle size={18} /> เพิ่มการรับสินค้าใหม่
            </button>
          </Link>
        </div>

        {/* Toolbar */}
        <section className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label htmlFor="status-select" className={styles.label}>
                สถานะ
              </label>
              <select
                id="status-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.input}
                aria-label="เลือกสถานะการรับสินค้า"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="search-input" className={styles.label}>
                ค้นหา
              </label>
              <div className={styles.searchBar}>
                <FaSearch className={styles.searchIcon} />
                <input
                  id="search-input"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  placeholder="ค้นหา: เลขที่ GR, PO, ซัพพลายเออร์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="ค้นหาการรับสินค้า"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className={styles.tableSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : filteredGrList.length === 0 ? (
            <div className={styles.noDataMessage}>ไม่พบรายการรับสินค้าที่ตรงกับเงื่อนไข</div>
          ) : (
            <>
              {/* Header (sticky) */}
              <div
                className={`${styles.tableGrid} ${styles.tableHeader}`}
                role="region"
                aria-label="ตารางรายการรับสินค้า"
              >
                <div className={styles.headerItem}>เลขที่ GR</div>
                <div className={styles.headerItem}>เลขที่ PO</div>
                <div className={`${styles.headerItem} ${styles.centerCell}`}>วันที่รับ</div>
                <div className={styles.headerItem}>ซัพพลายเออร์</div>
                <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
                <div className={`${styles.headerItem} ${styles.centerCell}`}>การจัดการ</div>
              </div>

              {/* Body (fixed 12 rows) */}
              <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
                {pageItems.map((gr) => (
                  <div key={gr.gr_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.mono}`} title={gr.gr_no || "-"}>
                      {gr.gr_no || "-"}
                    </div>
                    <div className={`${styles.tableCell} ${styles.mono}`} title={gr.po_no || "-"}>
                      {gr.po_no || "-"}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {gr.gr_date
                        ? new Date(gr.gr_date).toLocaleDateString("th-TH", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "-"}
                    </div>
                    <div className={`${styles.tableCell} ${styles.textTruncate}`} title={gr.supplier_name || "-"}>
                      {gr.supplier_name || "-"}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <StatusBadge status={gr.status} />
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <Link href={`/purchasing/goodsReceipt/${gr.gr_id}`} className={styles.noUnderline}>
                        <button
                          className={styles.secondaryButton}
                          aria-label={`ดูรายละเอียดการรับสินค้า ${gr.gr_no}`}
                          title="ดูรายละเอียด"
                        >
                          <FaEye size={18} />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}

                {/* เติมแถวว่างให้ครบ 12 แถว */}
                {Array.from({ length: fillersCount }).map((_, i) => (
                  <div
                    key={`filler-${i}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                    aria-hidden="true"
                  >
                    <div className={styles.tableCell} />
                    <div className={styles.tableCell} />
                    <div className={styles.tableCell} />
                    <div className={styles.tableCell} />
                    <div className={styles.tableCell} />
                    <div className={styles.tableCell} />
                  </div>
                ))}
              </div>

              {/* Pagination bar */}
              <div className={styles.paginationBar} aria-live="polite">
                <div className={styles.paginationInfo}>
                  กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredGrList.length} รายการ
                </div>
                <ul className={styles.paginationControls}>
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={goToPreviousPage}
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
                      onClick={goToNextPage}
                      disabled={currentPage >= totalPages}
                      aria-label="หน้าถัดไป"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
