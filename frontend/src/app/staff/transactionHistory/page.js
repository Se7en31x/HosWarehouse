"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function TransactionHistory() {
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [storage, setStorage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleFilterChange = (event) => setFilter(event.target.value);
  const handleCategoryChange = (event) => setCategory(event.target.value);
  const handleUnitChange = (event) => setUnit(event.target.value);
  const handleStorageChange = (event) => setStorage(event.target.value);

  // ตัวอย่างข้อมูล
  const inventoryData = Array.from({ length: 12 }, (_, index) => ({
    id: (index + 1).toString(),
    date: "30-02-2025",
    time: "10:30 AM",
    list: "ผ้าพันแผล",
    quantity: "1",
    unit: "กล่อง",
    type: "เวชภัณฑ์",
    storage: "ห้องเวชภัณฑ์",
    operation: "รอดำเนินการ",
    processing: "30-02-2025 10:30 AM",
  }));

  // ฟิลเตอร์ข้อมูล
  const filteredItems = inventoryData.filter((item) => {
    const matchesFilter =
      filter === "" ||
      item.list.includes(filter) ||
      item.operation.includes(filter) ||
      item.processing.includes(filter);
    const matchesCategory = category === "" || item.type === category;
    const matchesUnit = unit === "" || item.unit === unit;
    const matchesStorage = storage === "" || item.storage === storage;
    return matchesFilter && matchesCategory && matchesUnit && matchesStorage;
  });

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.cardHeader}>
          <h1>ประวัติการเบิก-ยืม</h1>
        </div>

        {/* ฟิลเตอร์ */}
        <div className={styles.filterContainer}>
          <div className={styles.filterGroup}>
            <label htmlFor="category" className={styles.filterLabel}>
              หมวดหมู่:
            </label>
            <select
              id="category"
              className={styles.filterSelect}
              value={category}
              onChange={handleCategoryChange}
            >
              <option value="">เลือกหมวดหมู่</option>
              <option value="ยา">ยา</option>
              <option value="เวชภัณฑ์">เวชภัณฑ์</option>
              <option value="ครุภัณฑ์">ครุภัณฑ์</option>
              <option value="อุปกรณ์ทางการแพทย์">อุปกรณ์ทางการแพทย์</option>
              <option value="ของใช้ทั่วไป">ของใช้ทั่วไป</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="unit" className={styles.filterLabel}>
              หน่วย:
            </label>
            <select
              id="unit"
              className={styles.filterSelect}
              value={unit}
              onChange={handleUnitChange}
            >
              <option value="">เลือกหน่วย</option>
              <option value="ขวด">ขวด</option>
              <option value="แผง">แผง</option>
              <option value="ชุด">ชุด</option>
              <option value="ชิ้น">ชิ้น</option>
              <option value="กล่อง">กล่อง</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="storage" className={styles.filterLabel}>
              สถานที่จัดเก็บ:
            </label>
            <select
              id="storage"
              className={styles.filterSelect}
              value={storage}
              onChange={handleStorageChange}
            >
              <option value="">เลือกสถานที่จัดเก็บ</option>
              <option value="ห้องเก็บยา">ห้องเก็บยา</option>
              <option value="คลังสินค้า">คลังสินค้า</option>
              <option value="ห้องเวชภัณฑ์">ห้องเวชภัณฑ์</option>
            </select>
          </div>

          <div className={styles.filterGroupSearch}>
            <label htmlFor="filter" className={styles.filterLabel}>
              ค้นหาข้อมูล:
            </label>
            <input
              type="text"
              id="filter"
              className={styles.filterInput}
              value={filter}
              onChange={handleFilterChange}
              placeholder="กรอกเพื่อค้นหา..."
            />
          </div>
        </div>

        {/* หัวตาราง */}
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div className={styles.headerItem}>หมายเลขรายการ</div>
          <div className={styles.headerItem}>รายการ</div>
          <div className={styles.headerItem}>จำนวน</div>
          <div className={styles.headerItem}>หน่วย</div>
          <div className={styles.headerItem}>หมวดหมู่</div>
          <div className={styles.headerItem}>สถานะ</div>
          <div className={styles.headerItem}>วันที่ดำเนินการ</div>
        </div>

        {/* รายการข้อมูล */}
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
                <div className={styles.tableCell}>{item.operation}</div>
                <div className={styles.tableCell}>{item.processing}</div>
              </div>
            ))
          ) : (
            <div className={styles.tableRow}>ไม่พบข้อมูล</div>
          )}
        </div>

        {/* ปุ่มแบ่งหน้า */}
        <div className={styles.pagination}>
          <button
            className={styles.prevButton}
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            หน้าก่อนหน้า
          </button>
          <span>หน้า {currentPage} / {totalPages}</span>
          <button
            className={styles.nextButton}
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            หน้าถัดไป
          </button>
        </div>
      </div>
    </div>
  );
}
