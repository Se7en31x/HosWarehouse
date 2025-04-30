"use client";
import { useState } from "react";
import styles from "./page.module.css";
import Link from "next/link";

export default function ApprovalRequest(){
    const [filter, setFilter] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("");
    const [storage, setStorage] = useState("");
  
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10; // จำนวนรายการที่แสดงต่อหน้า
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
      id: "1",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "2",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "3",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "4",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },
    {
      id: "5",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "6",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "7",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "8",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "9",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "10",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "11",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย ตัวน้อยตัวนิด",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },

    {
      id: "12",
      date: "30-02-2025", 
      time: "10:30 AM",
      name: "มดตะนอย",
      department: "ฉุกเฉิน",
      list: "2 รายการ",
      type: "เบิก",
      status: "รอดำเนินการ",
      action: "รายละเอียด",
    },
]
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
                <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                    <div className={styles.headerItem}>No.</div>
                    <div className={styles.headerItem}>วันที่</div>
                    <div className={styles.headerItem}>เวลา</div>
                    <div className={styles.headerItem}>ผู้ขอเบิก</div>
                    <div className={styles.headerItem}>แผนก</div>
                    <div className={styles.headerItem}>จำนวนรายการ</div>
                    <div className={styles.headerItem}>ประเภท</div>
                    <div className={styles.headerItem}>สถานะ</div>
                    <div className={styles.headerItem}>ตรวจสอบ</div>
                </div>
              
                {/* แสดงข้อมูลในตาราง */}
                <div className={styles.inventory}>
                    {currentItems.map((item) => (
                    <div className={`${styles.tableGrid} ${styles.tableRow}`} key={item.id}>
                        <div className={styles.tableCell}>{item.id}</div>
                        <div className={styles.tableCell}>{item.date}</div>
                        <div className={styles.tableCell}>{item.time}</div>
                        <div className={styles.tableCell}>{item.name}</div>
                        <div className={styles.tableCell}>{item.department}</div>
                        <div className={styles.tableCell}>{item.list}</div>
                        <div className={styles.tableCell}>{item.type}</div>
                        <div className={styles.tableCell}>{item.status}</div>
                        <div className={styles.tableCell}>
                          <Link href= "/approvalDetail">
                          <button className={styles.actionButton}>{item.action}</button>
                          </Link>
                        </div>
                    </div>
                    ))}
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

        </div>
    );
}