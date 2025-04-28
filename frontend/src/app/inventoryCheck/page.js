"use client";
import { useState } from "react";
import styles from "./page.module.css";
import axiosInstance from '../utils/axiosInstance';
import Link from "next/link";

export default function InventoryCheck() {

  const [filter, setFilter] = useState();
  const [category, setCategory] = useState();
  const [unit, setUnit] = useState();
  const [storage, setStorage] = useState();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // จำนวนรายการที่แสดงต่อหน้า
  const handleFilterChange = (event) => {
    setFilter(event.target.value);
  };

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
  };

  const handleUnitChange = (event) => {
    setUnit(event.target.value);
  };

  const handleStorageChange = (event) => {
    setStorage(event.target.value);
  };

  // ตัวอย่าง
  const inventoryData = [
    {
      id: 1,
      image: "https://example.com/bandage.jpg",
      category: "ผ้าพันแผล",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 100,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-31",
      action: "ตรวจสอบ",
    },
    {
      id: 2,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 50,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-25",
      action: "ตรวจสอบ",
    },
    {
      id: 3,
      image: "https://example.com/bandage.jpg",
      category: "ผ้าพันแผล",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 120,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-29",
      action: "ตรวจสอบ",
    },
    {
      id: 4,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 75,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-22",
      action: "ตรวจสอบ",
    },
    {
      id: 5,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 60,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-24",
      action: "ตรวจสอบ",
    },
    {
      id: 6,
      image: "https://example.com/bandage.jpg",
      category: "ผ้าพันแผล",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 150,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-30",
      action: "ตรวจสอบ",
    },
    {
      id: 7,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 90,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-18",
      action: "ตรวจสอบ",
    },
    {
      id: 8,
      image: "https://example.com/bandage.jpg",
      category: "ผ้าพันแผล",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 110,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-20",
      action: "ตรวจสอบ",
    },
    {
      id: 9,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 80,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-23",
      action: "ตรวจสอบ",
    },
    {
      id: 10,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 70,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-27",
      action: "ตรวจสอบ",
    },
    {
      id: 11,
      image: "https://example.com/bandage.jpg",
      category: "ผ้าพันแผล",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 130,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-28",
      action: "ตรวจสอบ",
    },
    {
      id: 12,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 40,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-21",
      action: "ตรวจสอบ",
    },
    {
      id: 13,
      image: "https://example.com/bandage.jpg",
      category: "ผ้าพันแผล",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 100,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-19",
      action: "ตรวจสอบ",
    },
    {
      id: 14,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 50,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-15",
      action: "ตรวจสอบ",
    },
    {
      id: 15,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 65,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-10",
      action: "ตรวจสอบ",
    },
    {
      id: 16,
      image: "https://example.com/bandage.jpg",
      category: "ผ้าพันแผล",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 95,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-17",
      action: "ตรวจสอบ",
    },
    {
      id: 17,
      image: "https://example.com/medical_supplies.jpg",
      category: "เวชภัณฑ์",
      type: "อุปกรณ์ทางการแพทย์",
      quantity: 55,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-13",
      action: "ตรวจสอบ",
    },

  ];


  const currentItems = inventoryData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage * itemsPerPage < inventoryData.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className={styles.mainHome}>
      {/* แถบบน */}
      <div className={styles.bar}>
        <ul className={styles.navList}>
          <li className={styles.navItem}>ตรวจสอบยอดคงคลัง</li>
          <li className={styles.navItem}>ยา</li>
          <li className={styles.navItem}>เวชภัณฑ์</li>
          <li className={styles.navItem}>ครุภัณฑ์</li>
          <li className={styles.navItem}>อุปกรณ์ทางการแพทย์</li>
          <li className={styles.navItem}>ของใช้ทั่วไป</li>
        </ul>
      </div>

      {/* ส่วนของ infoContainer */}
      <div className={styles.infoContainer}>
        {/* ตัวกรอง */}
        <div className={styles.filterContainer}>
          <div className={styles.filterGroup}>
            <label htmlFor="category" className={styles.filterLabel}>หมวดหมู่:</label>
            <select
              id="category"
              className={styles.filterSelect}
              value={category}
              onChange={handleCategoryChange}>
              <option value="">เลือกหมวดหมู่</option>
              <option value="ยา">ยา</option>
              <option value="เวชภัณฑ์">เวชภัณฑ์</option>
              <option value="ครุภัณฑ์">ครุภัณฑ์</option>
              <option value="อุปกรณ์ทางการแพทย์">อุปกรณ์ทางการแพทย์</option>
              <option value="ของใช้ทั่วไป">ของใช้ทั่วไป</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="unit" className={styles.filterLabel}>หน่วย:</label>
            <select
              id="unit"
              className={styles.filterSelect}
              value={unit}
              onChange={handleUnitChange}>
              <option value="">เลือกหน่วย</option>
              <option value="ขวด">ขวด</option>
              <option value="แผง">แผง</option>
              <option value="ชุด">ชุด</option>
              <option value="ชิ้น">ชิ้น</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="storage" className={styles.filterLabel}>สถานที่จัดเก็บ:</label>
            <select
              id="storage"
              className={styles.filterSelect}
              value={storage}
              onChange={handleStorageChange}>
              <option value="">เลือกสถานที่จัดเก็บ</option>
              <option value="ห้องเก็บยา">ห้องเก็บยา</option>
              <option value="คลังสินค้า">คลังสินค้า</option>
              <option value="ห้องเวชภัณฑ์">ห้องเวชภัณฑ์</option>
            </select>
          </div>

          {/* ช่องค้นหา */}
          <div className={styles.filterGroupSearch}>
            <label htmlFor="filter" className={styles.filterLabel}></label>
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
        {/* แถบหัวข้อคล้าย Excel */}
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div className={styles.headerItem}>No.</div>
          <div className={styles.headerItem}>รูปภาพ</div>
          <div className={styles.headerItem}>รายการ</div>
          <div className={styles.headerItem}>หมวดหมู่</div>
          <div className={styles.headerItem}>คงเหลือ</div>
          <div className={styles.headerItem}>หน่วย</div>
          <div className={styles.headerItem}>สถานะ</div>
          <div className={styles.headerItem}>สถานที่จัดเก็บ</div>
          <div className={styles.headerItem}>อัปเดตล่าสุด</div>
          <div className={styles.headerItem}>ดำเนินการ</div>
        </div>
        {/* แสดงข้อมูลในตาราง */}
        <div className={styles.inventory}>
          {currentItems.map((item) => (
            <div className={`${styles.tableGrid} ${styles.tableRow}`} key={item.id}>
              <div className={styles.tableCell}>{item.id}</div>
              <div className={styles.tableCell}>
                <img
                  src="https://medthai.com/wp-content/uploads/2016/11/%E0%B8%8B%E0%B8%B5%E0%B8%A1%E0%B8%AD%E0%B8%A5.jpg"
                  alt={item.category}
                  className={styles.imageCell}
                  style={{ width: '70px', height: '70px', objectFit: 'cover' }} // กำหนดขนาดที่นี่
                />
              </div>
              <div className={styles.tableCell}>{item.category}</div>
              <div className={styles.tableCell}>{item.type}</div>
              <div className={styles.tableCell}>{item.quantity}</div>
              <div className={styles.tableCell}>{item.unit}</div>
              <div className={styles.tableCell}>{item.status}</div>
              <div className={styles.tableCell}>{item.storage}</div>
              <div className={styles.tableCell}>{item.lastUpdated}</div>
              <div className={styles.tableCell}>
                <Link href="/inventoryDetail">
                  <button className={styles.actionButton}>{item.action}</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.pagination}>
        {/* ปุ่มย้อนกลับ */}
        <button
          className={styles.prevButton}
          onClick={handlePrevPage}
          disabled={currentPage === 1}>
          หน้าก่อนหน้า
        </button>

        {/* ปุ่มหน้าถัดไป */}
        <button
          className={styles.nextButton}
          onClick={handleNextPage}
          disabled={currentPage * itemsPerPage >= inventoryData.length}>
          หน้าถัดไป
        </button>
      </div>

    </div>
  );
}
