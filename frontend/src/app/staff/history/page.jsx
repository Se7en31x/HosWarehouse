"use client";

import { useState, useMemo } from "react";
import styles from "./page.module.css";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import Select from "react-select";

// ► Options สำหรับ dropdown
const categoryOptions = [
  { value: "ยา", label: "ยา" },
  { value: "เวชภัณฑ์", label: "เวชภัณฑ์" },
  { value: "ครุภัณฑ์", label: "ครุภัณฑ์" },
  { value: "อุปกรณ์ทางการแพทย์", label: "อุปกรณ์ทางการแพทย์" },
  { value: "ของใช้ทั่วไป", label: "ของใช้ทั่วไป" },
];
const unitOptions = [
  { value: "ขวด", label: "ขวด" },
  { value: "แผง", label: "แผง" },
  { value: "ชุด", label: "ชุด" },
  { value: "ชิ้น", label: "ชิ้น" },
  { value: "กล่อง", label: "กล่อง" },
  { value: "ห่อ", label: "ห่อ" },
];

// ► custom styles for react-select
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.4rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px #3b82f6" : "none",
    "&:hover": { borderColor: "#3b82f6" },
  }),
  menu: (base) => ({ ...base, borderRadius: "0.4rem", marginTop: 4 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f3f4f6" : "#fff",
    color: "#374151",
    padding: "8px 12px",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  clearIndicator: (base) => ({ ...base, padding: 4 }),
  dropdownIndicator: (base) => ({ ...base, padding: 4 }),
};

export default function TransactionHistory() {
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [storage, setStorage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const clearFilters = () => {
    setFilter("");
    setCategory("");
    setUnit("");
    setStorage("");
    setCurrentPage(1);
  };

  // Mock data (เดิม)
  const inventoryData = Array.from({ length: 25 }, (_, index) => {
    let operationStatus;
    if (index % 3 === 0) operationStatus = "สำเร็จ";
    else if (index % 5 === 0) operationStatus = "ยกเลิก";
    else operationStatus = "รอดำเนินการ";
    return {
      id: (index + 1).toString(),
      date: "30-02-2025",
      time: "10:30 AM",
      list: index % 2 === 0 ? "ผ้าพันแผล" : "สำลี",
      quantity: "1",
      unit: index % 2 === 0 ? "กล่อง" : "ห่อ",
      type: index % 2 === 0 ? "เวชภัณฑ์" : "ของใช้ทั่วไป",
      storage: index % 2 === 0 ? "ห้องเวชภัณฑ์" : "คลังสินค้า",
      operation: operationStatus,
      processing: "30-02-2025 10:30 AM",
    };
  });

  // กรองข้อมูล (เดิม)
  const filteredItems = useMemo(() => {
    const f = filter.toLowerCase();
    return inventoryData.filter((item) => {
      const matchesFilter =
        filter === "" ||
        item.list.toLowerCase().includes(f) ||
        item.operation.toLowerCase().includes(f) ||
        item.processing.toLowerCase().includes(f);
      const matchesCategory = category === "" || item.type === category;
      const matchesUnit = unit === "" || item.unit === unit;
      const matchesStorage = storage === "" || item.storage === storage;
      return matchesFilter && matchesCategory && matchesUnit && matchesStorage;
    });
  }, [inventoryData, filter, category, unit, storage]);

  // แบ่งหน้า (เหมือนหน้า InventoryWithdraw)
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handlePrev = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const handleNext = () =>
    currentPage * itemsPerPage < filteredItems.length &&
    setCurrentPage((c) => c + 1);

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

  // Badge สถานะ (เดิม)
  const getStatusBadge = (status) => {
    let statusClass = styles.statusBadge;
    if (status === "สำเร็จ") statusClass += ` ${styles.statusSuccess}`;
    else if (status === "ยกเลิก") statusClass += ` ${styles.statusCancelled}`;
    else if (status === "รอดำเนินการ") statusClass += ` ${styles.statusPending}`;
    return <span className={statusClass}>{status}</span>;
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h1>ประวัติการเบิก-ยืม</h1>
        </div>

        {/* Filters */}
        <div className={styles.filterControls}>
          <div className={styles.filterGrid}>
            {/* หมวดหมู่: react-select */}
            <div className={styles.filterGroup}>
              <label htmlFor="category" className={styles.filterLabel}>
                หมวดหมู่:
              </label>
              <Select
                inputId="category"
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={categoryOptions.find((o) => o.value === category) || null}
                onChange={(opt) => {
                  setCategory(opt?.value || "");
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* หน่วย: react-select */}
            <div className={styles.filterGroup}>
              <label htmlFor="unit" className={styles.filterLabel}>
                หน่วย:
              </label>
              <Select
                inputId="unit"
                options={unitOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหน่วย..."
                styles={customSelectStyles}
                value={unitOptions.find((o) => o.value === unit) || null}
                onChange={(opt) => {
                  setUnit(opt?.value || "");
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Search Controls — ใช้แบบเดียวกับ InventoryWithdraw พร้อมไอคอน Trash2 */}
          <div className={styles.searchControls}>
            <div className={styles.searchGroup}>
              <label className={styles.filterLabel} htmlFor="filter">
                ค้นหา:
              </label>
              <input
                id="filter"
                className={styles.searchInput}
                type="text"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="รายการ, สถานะ..."
              />
            </div>
            <button
              className={styles.clearButton}
              onClick={clearFilters}
              aria-label="ล้างตัวกรอง"
              title="ล้างตัวกรอง"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrapper}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>หมายเลขรายการ</div>
            <div className={styles.headerItem}>รายการ</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={styles.headerItem}>หน่วย</div>
            <div className={styles.headerItem}>หมวดหมู่</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={styles.headerItem}>วันที่ดำเนินการ</div>
          </div>

          <div className={styles.inventory}>
            {currentItems.length > 0 ? (
              currentItems.map((item) => (
                <div
                  className={`${styles.tableGrid} ${styles.tableRow}`}
                  key={item.id}
                >
                  <div className={styles.tableCell}>{item.id}</div>
                  <div className={styles.tableCell}>{item.list}</div>
                  <div className={styles.tableCell}>{item.quantity}</div>
                  <div className={styles.tableCell}>{item.unit}</div>
                  <div className={styles.tableCell}>{item.type}</div>
                  <div className={styles.tableCell}>
                    {getStatusBadge(item.operation)}
                  </div>
                  <div className={styles.tableCell}>{item.processing}</div>
                </div>
              ))
            ) : (
              <div className={`${styles.tableRow} ${styles.noDataCell}`}>
                ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหาของคุณ
              </div>
            )}
          </div>
        </div>

        {/* Pagination — เหมือนหน้า InventoryWithdraw */}
        <ul className={styles.paginationControls}>
          <li>
            <button
              className={styles.pageButton}
              onClick={handlePrev}
              disabled={currentPage === 1}
              aria-label="หน้าก่อนหน้า"
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft size={16} />
            </button>
          </li>

          {getPageNumbers().map((p, idx) =>
            p === "..." ? (
              <li key={idx} className={styles.ellipsis}>
                …
              </li>
            ) : (
              <li key={idx}>
                <button
                  className={`${styles.pageButton} ${
                    p === currentPage ? styles.activePage : ""
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
              onClick={handleNext}
              disabled={currentPage >= totalPages}
              aria-label="หน้าถัดไป"
              title="หน้าถัดไป"
            >
              <ChevronRight size={16} />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}