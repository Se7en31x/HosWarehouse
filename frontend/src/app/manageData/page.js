"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";


export default function manageData(){
    const router = useRouter();

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
    const manageData = [
    {
      id: "12345",
      image: "", // ลิงก์ของรูปภาพ
      name: "ผ้าผันแผล",
      type: "เวชภัณฑ์",
      quantity: 100,
      unit: "กล่อง",
      status: "พร้อมใช้งาน",
      location: "คลังกลาง",
      dateexd: "30-02-2025",
      edited: "30-02-2025",
      action: "แก้ไข",
      action2: "ลบ",
    },
    ]
    return(
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <div className={styles.cardHeader}><h1>การจัดการข้อมูล</h1></div>
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

                     {/* ปุ่ม + สำหรับเพิ่มข้อมูล */}
                    <div className={styles.filterAddData}>
                        <button onClick={styles.handleAddClick} className={styles.addButton}    // คุณอาจเพิ่มสไตล์ใน CSS ให้สวยงาม 
                        >
                        +
                        </button>
                        <span className={styles.addLabel}>เพิ่มข้อมูล</span>
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
                    <div className={styles.headerItem}>วันหมดอายุ</div>
                    <div className={styles.headerItem}>แก้ไขล่าสุด</div>
                    <div className={styles.headerItem}>การจัดการ</div>
                </div>
              
                {/* แสดงข้อมูลในตาราง */}
                <div className={styles.inventory}>
                    {manageData.map((item) => (
                    <div className={styles.tableRow} key={item.id}>
                        <div className={styles.tableCell}>{item.id}</div>
                        <div className={styles.tableCell}>{item.image}</div>
                        <div className={styles.tableCell}>{item.name}</div>
                        <div className={styles.tableCell}>{item.type}</div>
                        <div className={styles.tableCell}>{item.quantity}</div>
                        <div className={styles.tableCell}>{item.unit}</div>
                        <div className={styles.tableCell}>{item.status}</div>
                        <div className={styles.tableCell}>{item.location}</div>
                        <div className={styles.tableCell}>{item.dateexd}</div>
                        <div className={styles.tableCell}>{item.edited}</div>
                        <div className={styles.tableCell}>
                            <button className={`${styles.actionButton} ${styles.editButton}`}>{item.action}</button>
                            <button className={`${styles.actionButton} ${styles.deleteButton}`}>{item.action2}</button>
                        </div>
                    </div>
                    ))}
                    </div>
                </div>
            </div>
    );
}