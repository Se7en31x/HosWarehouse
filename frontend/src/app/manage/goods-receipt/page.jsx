"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

const statusOptions = [
  { value: "all", label: "สถานะทั้งหมด" },
  { value: "posted", label: "Posted" },
  { value: "draft", label: "Draft" },
];

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "40px",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    border: "1px solid #e5e7eb",
    zIndex: 9999,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "8px 12px",
  }),
};

async function getGoodsReceipts() {
  try {
    const res = await axiosInstance.get("/goods-receipts", {
      headers: { "Cache-Control": "no-store" },
    });
    return res.data;
  } catch (error) {
    console.error("❌ โหลดข้อมูลไม่สำเร็จ:", error);
    return [];
  }
}

export default function GoodsReceiptListPage() {
  const [goodsReceipts, setGoodsReceipts] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(statusOptions[0]);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    getGoodsReceipts().then((data) => setGoodsReceipts(data));
  }, []);

  const clearFilters = () => {
    setSelectedStatus(statusOptions[0]);
    setSearchText("");
    setCurrentPage(1);
  };

  const filteredReceipts = useMemo(() => {
    return goodsReceipts.filter((gr) => {
      const matchStatus =
        selectedStatus.value === "all"
          ? true
          : (gr.import_status || "").toLowerCase() ===
          selectedStatus.value.toLowerCase();

      const matchSearch = searchText
        ? (gr.gr_no || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (gr.supplier_name || "")
          .toLowerCase()
          .includes(searchText.toLowerCase())
        : true;

      return matchStatus && matchSearch;
    });
  }, [goodsReceipts, selectedStatus, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE));
  const paginatedReceipts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReceipts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredReceipts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedStatus]);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredReceipts.length &&
    setCurrentPage((c) => c + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>รายการนำเข้าสินค้า</h1>
          <Link href="/manage/goods-receipt/create" className={styles.createButton}>
            สร้างรายการใหม่
          </Link>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          {/* สถานะ (ฝั่งซ้าย) */}
          <div className={styles.filterLeft}>
            <label className={styles.label}>สถานะ</label>
            <Select
              options={statusOptions}
              value={selectedStatus}
              onChange={(opt) => setSelectedStatus(opt)}
              isSearchable={false}
              styles={customSelectStyles}
              placeholder="เลือกสถานะ..."
            />
          </div>

          {/* ค้นหา + ปุ่มล้าง (ฝั่งขวา) */}
          <div className={styles.filterRight}>
            <label className={styles.label}>ค้นหา</label>
            <div className={styles.searchRow}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ค้นหาด้วยเลขที่ GR หรือซัพพลายเออร์..."
                className={styles.input}
              />
              <button
                onClick={clearFilters}
                className={`${styles.ghostBtn} ${styles.clearButton}`}
              >
                <Trash2 size={18} /> ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>เลขที่ GR</div>
            <div className={styles.headerItem}>วันที่นำเข้า</div>
            <div className={styles.headerItem}>ซัพพลายเออร์</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={styles.headerItem}>ผู้รับสินค้า</div>
            <div className={styles.headerItem}>ดูรายละเอียด</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
            {paginatedReceipts.length > 0 ? (
              paginatedReceipts.map((gr) => (
                <div key={gr.import_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div className={styles.tableCell}>{gr.gr_no}</div>
                  <div className={styles.tableCell}>{gr.import_date}</div>
                  <div className={styles.tableCell}>{gr.supplier_name}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <span
                      className={`${styles.stBadge} ${gr.import_status?.toLowerCase() === "posted"
                          ? styles.stAvailable
                          : styles.stLow
                        }`}
                    >
                      {gr.import_status}
                    </span>
                  </div>
                  <div className={styles.tableCell}>{gr.user_name}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <Link
                      href={`/manage/goods-receipt/${gr.import_id}`}
                      className={styles.actionButton}
                    >
                      <Search size={18} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
            )}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
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
                    className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""
                      }`}
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
                onClick={goToNextPage}
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
