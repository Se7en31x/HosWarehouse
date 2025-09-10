"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaSearch, FaEye } from "react-icons/fa";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { exportHistoryPurchasingCSV } from "@/app/components/Csv/templates/historyPurchasingCSV";

// ── Badge ─────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const t = String(status || "pending").toLowerCase();
  let badgeStyle = styles.pending;
  if (t === "approved") badgeStyle = styles.approved;
  else if (t === "completed") badgeStyle = styles.completed;
  else if (t === "canceled" || t === "cancelled") badgeStyle = styles.canceled;

  const labelMap = {
    approved: "อนุมัติ",
    completed: "เสร็จสิ้น",
    canceled: "ยกเลิก",
    cancelled: "ยกเลิก",
    pending: "รอดำเนินการ",
  };
  const label = labelMap[t] || (status || "รอดำเนินการ");
  return <span className={`${styles.stBadge} ${badgeStyle}`}>{label}</span>;
};

// ── Helpers ───────────────────────────────────────
const fmtDateTH = (d) =>
  new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });

const nf0 = new Intl.NumberFormat("th-TH");
const nf2 = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const endOfDay = (isoDate) => {
  const dt = new Date(isoDate);
  dt.setHours(23, 59, 59, 999);
  return dt;
};
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** 🔧 ลำดับคอลัมน์ CSV ให้ตรงกับตารางบน UI (ปรับได้ง่าย ๆ ตรงนี้) */
const CSV_ORDER = [
  "po_no",
  "date",
  "supplier",
  "status",
  "creator",
  "subtotal",
  "vat",
  "grand_total",
];

export default function PurchaseHistory() {
  const [history, setHistory] = useState([]);
  const [searchRaw, setSearchRaw] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // debounced
  const [loading, setLoading] = useState(true);

  // วันที่
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Quick range state
  const [activeRange, setActiveRange] = useState(""); // '', 'today', '7d', 'thismonth'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/po");
        const list = Array.isArray(res.data) ? res.data : [];
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setHistory(list);
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Debounce search 300ms
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchRaw), 300);
    return () => clearTimeout(t);
  }, [searchRaw]);

  // ถ้าเลือกวันที่สลับกัน ให้ auto-fix ให้ถูกต้อง
  useEffect(() => {
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (s > e) setEndDate(startDate);
    }
  }, [startDate, endDate]);

  // ฟิลเตอร์ (memo) — endDate inclusive
  const filteredHistory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const s = startDate ? new Date(startDate) : null;
    const e = endDate ? endOfDay(endDate) : null;

    return history.filter((po) => {
      const matchSearch =
        !term ||
        po.po_no?.toLowerCase().includes(term) ||
        po.supplier_name?.toLowerCase().includes(term);

      const poDate = new Date(po.created_at);
      const matchDate = (!s || poDate >= s) && (!e || poDate <= e);

      return matchSearch && matchDate;
    });
  }, [history, searchTerm, startDate, endDate]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / itemsPerPage));
  const indexOfLast = Math.min(currentPage * itemsPerPage, filteredHistory.length);
  const indexOfFirst = Math.max(0, indexOfLast - itemsPerPage);
  const currentItems = filteredHistory.slice(indexOfFirst, indexOfLast);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 6) {
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

  // Export CSV (ใช้แทน Excel แต่คงชื่อปุ่ม Excel)
  const exportToCSV = () => {
    exportHistoryPurchasingCSV({
      data: filteredHistory,
      filename: "purchase-history.csv",
      order: CSV_ORDER, // ← ส่งลำดับคอลัมน์ที่ต้องการ
    });
  };

  // Export PDF
  const exportToPDF = async () => {
    const { exportHistoryPurchasingPDF } = await import(
      "@/app/components/pdf/templates/historyPurchasingTemplate"
    );

    const quick = activeRange || ((startDate || endDate) ? "custom" : ""); // '', 'today', '7d', 'thismonth', 'custom'
    await exportHistoryPurchasingPDF({
      data: filteredHistory,
      filters: {
        quick,
        startDate,
        endDate,
        searchTerm,
      },
      user: null,
    });
  };

  const rangeStart = filteredHistory.length ? indexOfFirst + 1 : 0;
  const rangeEnd = indexOfLast;

  const clearDates = () => {
    setStartDate("");
    setEndDate("");
    setActiveRange("");
  };

  const applyToday = () => {
    const s = startOfToday();
    const e = endOfToday();
    setStartDate(toISODate(s));
    setEndDate(toISODate(e));
    setActiveRange("today");
  };
  const apply7Days = () => {
    const e = endOfToday();
    const s = addDays(startOfToday(), -6);
    setStartDate(toISODate(s));
    setEndDate(toISODate(e));
    setActiveRange("7d");
  };
  const applyThisMonth = () => {
    const now = new Date();
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(toISODate(s));
    setEndDate(toISODate(e));
    setActiveRange("thismonth");
  };

  const pageTotals = useMemo(() => {
    return currentItems.reduce(
      (acc, po) => {
        acc.sub += Number(po.subtotal || 0);
        acc.vat += Number(po.vat_amount || 0);
        acc.grand += Number(po.grand_total || 0);
        return acc;
      },
      { sub: 0, vat: 0, grand: 0 }
    );
  }, [currentItems]);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header & Filters */}
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}> ประวัติการสั่งซื้อ</h1>

          <div className={styles.filters}>
            <div className={styles.searchBar}>
              <FaSearch className={styles.searchIcon} aria-hidden />
              <input
                type="text"
                placeholder="ค้นหา: PO No หรือ ซัพพลายเออร์..."
                value={searchRaw}
                onChange={(e) => setSearchRaw(e.target.value)}
                className={styles.input}
                aria-label="ค้นหาใบสั่งซื้อ"
              />
            </div>

            {/* Date filter */}
            <div className={styles.dateFilter} role="group" aria-label="กรองตามวันที่">
              <div
                className={`${styles.dateInputWrap} ${startDate ? styles.filled : ""}`}
                data-placeholder="วว/ดด/ปปปป"
              >
                <input
                  type="date"
                  required
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => { setStartDate(e.target.value); setActiveRange(""); }}
                  className={styles.dateInput}
                  aria-label="วันที่เริ่มต้น"
                />
              </div>

              <span className={styles.dateSeparator}>ถึง</span>

              <div
                className={`${styles.dateInputWrap} ${endDate ? styles.filled : ""}`}
                data-placeholder="วว/ดด/ปปปป"
              >
                <input
                  type="date"
                  required
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => { setEndDate(e.target.value); setActiveRange(""); }}
                  className={styles.dateInput}
                  aria-label="วันที่สิ้นสุด"
                />
              </div>

              <div className={styles.quickChips}>
                <button
                  className={`${styles.chip} ${activeRange === "today" ? styles.chipActive : ""}`}
                  onClick={applyToday}
                  type="button"
                >
                  วันนี้
                </button>
                <button
                  className={`${styles.chip} ${activeRange === "7d" ? styles.chipActive : ""}`}
                  onClick={apply7Days}
                  type="button"
                >
                  7 วันล่าสุด
                </button>
                <button
                  className={`${styles.chip} ${activeRange === "thismonth" ? styles.chipActive : ""}`}
                  onClick={applyThisMonth}
                  type="button"
                >
                  เดือนนี้
                </button>
                <button className={styles.ghostBtn} onClick={clearDates} aria-label="ล้างวันที่" type="button">
                  ล้างวันที่
                </button>
              </div>
            </div>

            <div className={styles.exportButtons}>
              {/* ใช้ CSV แทน Excel แต่คงชื่อปุ่มว่า Excel */}
              <button className={styles.primaryButton} onClick={exportToCSV} aria-label="ส่งออก Excel" type="button">
                📊 Excel
              </button>
              <button className={styles.primaryButton} onClick={exportToPDF} aria-label="ส่งออก PDF" type="button">
                📄 PDF
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} aria-label="กำลังโหลด" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className={styles.noDataMessage}>ยังไม่มีประวัติการสั่งซื้อ</div>
        ) : (
          <>
            <div className={styles.tableSection}>
              <div className={`${styles.tableGrid} ${styles.tableHeader}`} role="row">
                <div className={styles.headerItem} style={{ justifyContent: "flex-start" }}>เลขที่ PO</div>
                <div className={styles.headerItem} style={{ justifyContent: "center" }}>วันที่</div>
                <div className={styles.headerItem} style={{ justifyContent: "flex-start" }}>ซัพพลายเออร์</div>
                <div className={styles.headerItem} style={{ justifyContent: "center" }}>สถานะ</div>
                <div className={styles.headerItem} style={{ justifyContent: "flex-start" }}>ผู้ใช้ที่ออก</div>
                <div className={styles.headerItem} style={{ justifyContent: "flex-end" }}>รวม (ก่อน VAT)</div>
                <div className={styles.headerItem} style={{ justifyContent: "flex-end" }}>VAT</div>
                <div className={styles.headerItem} style={{ justifyContent: "flex-end" }}>ยอดสุทธิ</div>
                <div className={styles.headerItem} style={{ justifyContent: "center" }}>การจัดการ</div>
              </div>

              <div className={styles.inventory} role="rowgroup">
                {currentItems.map((po) => (
                  <div key={po.po_id} className={`${styles.tableGrid} ${styles.tableRow}`} role="row">
                    <div className={styles.cellLeft}>{po.po_no}</div>
                    <div className={styles.centerCell}>{fmtDateTH(po.created_at)}</div>
                    <div className={styles.cellLeft}>{po.supplier_name || "-"}</div>
                    <div className={styles.centerCell}>
                      <StatusBadge status={po.po_status || po.status} />
                    </div>
                    <div className={styles.cellLeft}>{po.creator_name || "ไม่ทราบ"}</div>
                    <div className={styles.rightCell}>{nf2.format(Number(po.subtotal || 0))} บาท</div>
                    <div className={styles.rightCell}>{nf2.format(Number(po.vat_amount || 0))} บาท</div>
                    <div className={styles.rightCell}>{nf2.format(Number(po.grand_total || 0))} บาท</div>
                    <div className={styles.centerCell}>
                      <Link
                        href={`/purchasing/historyPurchasing/${po.po_id}`}
                        className={styles.viewBtn}
                        aria-label={`ดูรายละเอียด ${po.po_no}`}
                      >
                        <FaEye aria-hidden /> ดูรายละเอียด
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary of current page */}
            <div className={styles.summaryBar}>
              <div>รวมหน้านี้ (ก่อน VAT): <strong>{nf2.format(pageTotals.sub)}</strong> บาท</div>
              <div>VAT หน้านี้: <strong>{nf2.format(pageTotals.vat)}</strong> บาท</div>
              <div>ยอดสุทธิหน้านี้: <strong>{nf2.format(pageTotals.grand)}</strong> บาท</div>
            </div>

            {/* Footer bar with range & pagination */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {rangeStart}-{rangeEnd} จาก {nf0.format(filteredHistory.length)} รายการ
              </div>

              <ul className={styles.paginationControls} aria-label="เปลี่ยนหน้า">
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="หน้าก่อนหน้า"
                    type="button"
                  >
                    <ChevronLeft size={16} aria-hidden />
                  </button>
                </li>
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <li key={`ellipsis-${idx}`} className={styles.ellipsis} aria-hidden>
                      …
                    </li>
                  ) : (
                    <li key={`page-${p}`}>
                      <button
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                        onClick={() => handlePageChange(p)}
                        aria-current={p === currentPage ? "page" : undefined}
                        aria-label={`หน้า ${p}`}
                        type="button"
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
                    disabled={currentPage === totalPages}
                    aria-label="หน้าถัดไป"
                    type="button"
                  >
                    <ChevronRight size={16} aria-hidden />
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
