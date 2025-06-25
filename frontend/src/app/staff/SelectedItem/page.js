"use client";
import { useState , useContext } from "react";
import { CartContext } from "../context/CartContext";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";



export default function SelectedItem() {

    const router = useRouter();

    const [filter, setFilter] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("");
    const [storage, setStorage] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5; // จำนวนรายการที่แสดงต่อหน้า

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
            id: "1",
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
        {
            id: "2",
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
        {
            id: "3",
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
        {
            id: "4",
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
        {
            id: "5",
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
        {
            id: "6",
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
        {
            id: "7",
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
        {
            id: "8",
            image: "", // ลิงก์ของรูปภาพ
            name: "ผ้าผันแผล",
            type: "เวชภัณฑ์",
            quantity: 100,
            unit: "กล่อง",
            status: "พร้อมใช้งาน",
            location: "คลังกลาง",
            dateexd: "30-02-2025",
            edited: "30-02-2025",

        },
        {
            id: "9",
            image: "", // ลิงก์ของรูปภาพ
            name: "ผ้าผันแผล",
            type: "เวชภัณฑ์",
            quantity: 100,
            unit: "กล่อง",
            status: "พร้อมใช้งาน",
            location: "คลังกลาง",
            dateexd: "30-02-2025",
            edited: "30-02-2025",

        },
        {
            id: "10",
            image: "", // ลิงก์ของรูปภาพ
            name: "ผ้าผันแผล",
            type: "เวชภัณฑ์",
            quantity: 100,
            unit: "กล่อง",
            status: "พร้อมใช้งาน",
            location: "คลังกลาง",
            dateexd: "30-02-2025",
            edited: "30-02-2025",

        },
        {
            id: "11",
            image: "", // ลิงก์ของรูปภาพ
            name: "ผ้าผันแผล",
            type: "เวชภัณฑ์",
            quantity: 100,
            unit: "กล่อง",
            status: "พร้อมใช้งาน",
            location: "คลังกลาง",
            dateexd: "30-02-2025",
            edited: "30-02-2025",

        },
        {
            id: "12",
            image: "", // ลิงก์ของรูปภาพ
            name: "ผ้าผันแผล",
            type: "เวชภัณฑ์",
            quantity: 100,
            unit: "กล่อง",
            status: "พร้อมใช้งาน",
            location: "คลังกลาง",
            dateexd: "30-02-2025",
            edited: "30-02-2025",

        },
        {
            id: "123",
            image: "", // ลิงก์ของรูปภาพ
            name: "ผ้าผันแผล",
            type: "เวชภัณฑ์",
            quantity: 100,
            unit: "กล่อง",
            status: "พร้อมใช้งาน",
            location: "คลังกลาง",
            dateexd: "30-02-2025",
            edited: "30-02-2025",

        },
    ]

    const currentItems = manageData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage * itemsPerPage < manageData.length) {
            setCurrentPage(currentPage + 1);
        }
    };


    const translateAction = (action) => {
        switch (action) {
            case "เบิก":
                return "Withdraw";
            case "ยืม":
                return "Borrow";
            case "คืน":
                return "Return";
            default:
                return action;
        }
    };

    return (
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <div className={styles.cardHeader}><h1>รายการที่เลือก</h1></div>

                {/* แถบหัวข้อคล้าย Excel */}
                <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                    <div className={styles.headerItem}>หมายเลข</div>
                    <div className={styles.headerItem}>รูปภาพ</div>
                    <div className={styles.headerItem}>ชื่อ</div>
                    <div className={styles.headerItem}>หมวดหมู่</div>
                    <div className={styles.headerItem}>หน่วย</div>
                    <div className={styles.headerItem}>สถานที่จัดเก็บ</div>
                    <div className={styles.headerItem}>แก้ไขล่าสุด</div>
                    <div className={styles.headerItem}>จำนวน</div>
                    <div className={styles.headerItem}>การจัดการ</div>
                </div>

                {/* แสดงข้อมูลในตาราง */}
                <div className={styles.inventory}>
                    {currentItems.map((item) => (
                        <div className={`${styles.tableGrid} ${styles.tableRow}`} key={item.id}>
                            <div className={styles.tableCell}>{item.id}</div>
                            <div className={`${styles.tableCell} ${styles.centerCell}`}>
                                <img src="https://medthai.com/wp-content/uploads/2016/11/%E0%B8%8B%E0%B8%B5%E0%B8%A1%E0%B8%AD%E0%B8%A5.jpg"
                                    alt={item.category}
                                    className={styles.imageCell}
                                    style={{ width: '70px', height: '70px', objectFit: 'cover' }} // กำหนดขนาดที่นี่} 
                                />
                            </div>
                            <div className={styles.tableCell}>{item.name}</div>
                            <div className={styles.tableCell}>{item.type}</div>
                            <div className={styles.tableCell}>{item.unit}</div>
                            <div className={styles.tableCell}>{item.location}</div>
                            <div className={styles.tableCell}>{item.edited}</div>
                            <div className={styles.tableCell}>{item.quantity}</div>
                            <div className={`${styles.tableCell} ${styles.centerCell}`}>
                                <Link href="/manage/editItem" className={`${styles.actionButton} ${styles.editButton}`}>แก้ไข</Link>
                                <button className={`${styles.actionButton} ${styles.deleteButton}`}>ลบ</button>
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
                        disabled={currentPage * itemsPerPage >= manageData.length}>
                        หน้าถัดไป
                    </button>
                </div>
            </div>

            <div className={styles.formSection}>
                <div className={styles.checkboxGroup}>
                    <label>
                        <input type="checkbox" />
                        ต้องการเร่งด่วน
                    </label>
                    <label style={{ marginLeft: '1rem' }}>
                        <input type="checkbox" />
                        จัดส่งตามปกติ
                    </label>
                </div>

                <div className={styles.dateAndNote}>
                    <input type="date" className={styles.datePicker} />
                    <textarea
                        className={styles.textArea}
                        placeholder="หมายเหตุ"
                        rows={3}
                    ></textarea>
                </div>

                <div className={styles.buttonGroup}>
                    <button className={`${styles.cancelButton}`}>ยกเลิก</button>
                    <button className={`${styles.draftButton}`}>ฉบับร่าง</button>
                    <button className={`${styles.submitButton}`}>ยืนยัน</button>
                </div>
            </div>

        </div>


    );
}