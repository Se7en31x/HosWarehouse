"use client";

import { useState } from "react";
import styles from "./page.module.css";


export default function approvalRequest(){
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
      id: "12345",
      date: "30-02-2025", // ลิงก์ของรูปภาพ
      time: "10:30 AM",
      name: "มดตะนอย",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },
    ]
    return(
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <div className={styles.cardHeader}><h1>ตรวจสอบรายการเบิก ยืม</h1></div>
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
                    <div className={styles.headerItem}>หมายเลขคำขอ</div>
                    <div className={styles.headerItem}>วันที่เบิก</div>
                    <div className={styles.headerItem}>เวลาขอเบิก</div>
                    <div className={styles.headerItem}>ผู้ขอเบิก</div>
                    <div className={styles.headerItem}>แผนก</div>
                    <div className={styles.headerItem}>จำนวนรายการ</div>
                    <div className={styles.headerItem}>ประเภท</div>
                    <div className={styles.headerItem}>สถานะ</div>
                    <div className={styles.headerItem}>ตรวจสอบ</div>
                </div>
              
                {/* แสดงข้อมูลในตาราง */}
                <div className={styles.inventory}>
                    {inventoryData.map((item) => (
                    <div className={styles.tableRow} key={item.id}>
                        <div className={styles.tableCell}>{item.id}</div>
                        <div className={styles.tableCell}>{item.date}</div>
                        <div className={styles.tableCell}>{item.time}</div>
                        <div className={styles.tableCell}>{item.name}</div>
                        <div className={styles.tableCell}>{item.department}</div>
                        <div className={styles.tableCell}>{item.list}</div>
                        <div className={styles.tableCell}>{item.type}</div>
                        <div className={styles.tableCell}>{item.status}</div>
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