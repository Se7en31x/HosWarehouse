"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function inventoryCheck() {
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [storage, setStorage] = useState("");

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
      image: "https://example.com/bandage.jpg", // ลิงก์ของรูปภาพ
      category: "ผ้าพันแผล",
      type: "เวชภัณฑ์",
      quantity: 100,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-31",
      action: "ตรวจสอบ",
    },
    // คุณสามารถเพิ่มข้อมูลตัวอย่างเพิ่มได้ที่นี่
    {
      id: 2,
      image: "https://example.com/medical_supplies.jpg", // ตัวอย่างอีกภาพ
      category: "เวชภัณฑ์",
      quantity: 50,
      unit: "ชุด",
      status: "พร้อมใช้งาน",
      storage: "คลังกลาง",
      lastUpdated: "2025-12-25",
      action: "ตรวจสอบ",
    },
  ];

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
            <label htmlFor="filter" className={styles.filterLabel}>ค้นหาข้อมูล:</label>
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
      <div className={styles.tableHeader}>
        <div className={styles.headerItem}>หมายเลข</div>
        <div className={styles.headerItem}>รูปภาพ</div>
        <div className={styles.headerItem}>ชื่อ</div>
        <div className={styles.headerItem}>หมวดหมู่</div>
        <div className={styles.headerItem}>จำนวน</div>
        <div className={styles.headerItem}>หน่วย</div>
        <div className={styles.headerItem}>สถานะ</div>
        <div className={styles.headerItem}>สถานที่จัดเก็บ</div>
        <div className={styles.headerItem}>วันที่อัปเดตล่าสุด</div>
        <div className={styles.headerItem}>ดำเนินการ</div>
      </div>
      {/* แสดงข้อมูลในตาราง */}
      <div className={styles.inventory}>
        {inventoryData.map((item) => (
          <div className={styles.tableRow} key={item.id}>
            <div className={styles.tableCell}>{item.id}</div>
            <div className={styles.tableCell}>
              <img src={item.image} alt={item.category} className={styles.imageCell} />
            </div>
            <div className={styles.tableCell}>{item.category}</div>
            <div className={styles.tableCell}>{item.type}</div>
            <div className={styles.tableCell}>{item.quantity}</div>
            <div className={styles.tableCell}>{item.unit}</div>
            <div className={styles.tableCell}>{item.status}</div>
            <div className={styles.tableCell}>{item.storage}</div>
            <div className={styles.tableCell}>{item.lastUpdated}</div>
            <div className={styles.tableCell}>
              <button className={styles.actionButton}>{item.action}</button>
            </div>
          </div>
        ))}
        </div>
      </div>


    </div>
  );
}
