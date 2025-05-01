"use client";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import axiosInstance from '../utils/axiosInstance';
import Link from "next/link";
import { connectSocket, disconnectSocket, sendMessage, joinRoom } from '../utils/socket';
export default function InventoryCheck() {

  const [filter, setFilter] = useState();
  const [category, setCategory] = useState();
  const [unit, setUnit] = useState();
  const [storage, setStorage] = useState();
  //API//
  const [inventoryData, setInventoryData] = useState([]);
  //API//
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
  // const inventoryData = [
  //   {
  //     id: 1,
  //     image: "https://example.com/bandage.jpg",
  //     category: "ผ้าพันแผล",
  //     type: "อุปกรณ์ทางการแพทย์",
  //     quantity: 100,
  //     unit: "กล่อง",
  //     status: "พร้อมใช้งาน",
  //     storage: "คลังกลาง",
  //     lastUpdated: "2025-12-31",
  //     action: "ตรวจสอบ",
  //   },

  // ];


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


  ///////////////////// API///////////////////////////
  useEffect(() => {
    const socket = connectSocket(); // ได้ socket กลับมา

    socket.emit('requestInventoryData'); // 👈 ขอข้อมูลจาก backend

    socket.on('itemsData', (items) => {
      console.log('📦 Received inventory:', items);
      setInventoryData(items); // แสดงผลใน UI
    });

    return () => {
      disconnectSocket();
    };
  }, []);

  console.log(inventoryData.map(item => item.id));
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
          {inventoryData.map((item) => (
            <div className={`${styles.tableGrid} ${styles.tableRow}`} key={item.item_id}>
              <div className={styles.tableCell}>{item.item_id}</div>
              <div className={styles.tableCell}>
                <img
                  src={item.item_img}
                  alt={item.item_category}
                  className={styles.imageCell}
                  style={{ width: '70px', height: '70px', objectFit: 'cover' }} // กำหนดขนาดที่นี่
                />
              </div>
              <div className={styles.tableCell}>{item.item_name}</div>
              <div className={styles.tableCell}>{item.item_category}</div>
              <div className={styles.tableCell}>{item.item_qty}</div>
              <div className={styles.tableCell}>{item.item_unit}</div>
              <div className={styles.tableCell}>พร้อมใช้งาน</div>
              <div className={styles.tableCell}>{item.item_location}</div>
              <div className={styles.tableCell}>
                {new Date(item.item_update).toLocaleString('th-TH', {
                  timeZone: 'Asia/Bangkok',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              <div className={styles.tableCell}>
                <Link href={`/inventoryDetail/${item.item_id}`} className={styles.actionButton}>
                  ตรวจสอบ
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
