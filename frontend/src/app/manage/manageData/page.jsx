"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";
import axiosInstance from "../../utils/axiosInstance";
import Swal from "sweetalert2";

export default function ManageDataPage() {
  const [items, setItems] = useState([]);
  const router = useRouter();

  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [storage, setStorage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleFilterChange = (event) => setFilter(event.target.value);
  const handleCategoryChange = (event) => setCategory(event.target.value);
  const handleUnitChange = (event) => setUnit(event.target.value);
  const handleStorageChange = (event) => setStorage(event.target.value);

  const categoryLabels = {
    medicine: 'ยา',
    medsup: 'เวชภัณฑ์',
    equipment: 'ครุภัณฑ์',
    meddevice: 'อุปกรณ์ทางการแพทย์',
    general: 'ของใช้ทั่วไป',
  };

  const getItemCode = (item) => {
    switch (item.item_category?.toLowerCase()) {
      case 'medicine': return item.med_code || '-';
      case 'medsup': return item.medsup_code || '-';
      case 'equipment': return item.equip_code || '-';
      case 'meddevice': return item.meddevice_code || '-';
      case 'general': return item.gen_code || '-';
      default: return '-';
    }
  };
  
  // แปลงค่า category จากภาษาไทยเป็นภาษาอังกฤษก่อนนำไปกรองข้อมูล
  const categoryValues = {
    'ยา': 'medicine',
    'เวชภัณฑ์': 'medsup',
    'ครุภัณฑ์': 'equipment',
    'อุปกรณ์ทางการแพทย์': 'meddevice',
    'ของใช้ทั่วไป': 'general',
  };

  // กรองข้อมูลตาม filter และ dropdown
  const filteredItems = items.filter((item) => {
    const matchesFilter =
      filter === "" ||
      item.item_name?.toLowerCase().includes(filter.toLowerCase()) ||
      getItemCode(item)?.toLowerCase().includes(filter.toLowerCase());
    
    const matchesCategory =
      category === "" ||
      categoryValues[category]?.toLowerCase() === item.item_category?.toLowerCase();

    const matchesUnit =
      unit === "" || item.item_unit?.toLowerCase() === unit.toLowerCase();

    const matchesStorage =
      storage === "" || item.item_location?.toLowerCase() === storage.toLowerCase();

    return matchesFilter && matchesCategory && matchesUnit && matchesStorage;
  });
  
  // เปลี่ยนหน้าเมื่อ filter เปลี่ยน
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, category, unit, storage]);

  const currentItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage * itemsPerPage < filteredItems.length)
      setCurrentPage(currentPage + 1);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'ลบรายการนี้?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        const response = await axiosInstance.delete(`/deleteItem/${id}`);
        if (response.data.success) {
          setItems((prevItems) => prevItems.filter(item => item.item_id !== id));
          Swal.fire('ลบแล้ว!', 'รายการถูกลบเรียบร้อยแล้ว', 'success');
        } else {
          Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
      } catch (error) {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
      }
    }
  };

  function formatThaiDateTime(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = (date.getFullYear() + 543).toString().slice(-2);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} , ${hours}:${minutes}`;
  }

  useEffect(() => {
    axiosInstance.get("/manageData")
      .then((response) => {
        setItems(response.data);
      })
      .catch((error) => {
        console.error("Error fetching item data:", error);
      });
  }, []);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.cardHeader}><h1>การจัดการข้อมูล</h1></div>

        <div className={styles.filterContainer}>
          <div className={styles.filterGroup}>
            <label htmlFor="category" className={styles.filterLabel}>หมวดหมู่:</label>
            <select id="category" className={styles.filterSelect} value={category} onChange={handleCategoryChange}>
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
            <select id="unit" className={styles.filterSelect} value={unit} onChange={handleUnitChange}>
              <option value="">เลือกหน่วย</option>
              <option value="ขวด">ขวด</option>
              <option value="แผง">แผง</option>
              <option value="ชุด">ชุด</option>
              <option value="ชิ้น">ชิ้น</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="storage" className={styles.filterLabel}>สถานที่จัดเก็บ:</label>
            <select id="storage" className={styles.filterSelect} value={storage} onChange={handleStorageChange}>
              <option value="">เลือกสถานที่จัดเก็บ</option>
              <option value="ห้องเก็บยา">ห้องเก็บยา</option>
              <option value="คลังสินค้า">คลังสินค้า</option>
              <option value="ห้องเวชภัณฑ์">ห้องเวชภัณฑ์</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
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

          <div className={styles.filterAddData}>
            <Link href="/manage/addItem" className={styles.addButton} aria-label="เพิ่มข้อมูล">+</Link>
            <span className={styles.addLabel}>เพิ่มข้อมูล</span>
          </div>
        </div>

        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div className={`${styles.headerItem} ${styles.centerCell}`}>ลำดับ</div>
          <div className={styles.headerItem}>รหัสสินค้า</div>
          <div className={`${styles.headerItem} ${styles.centerCell}`}>รูปภาพ</div>
          <div className={styles.headerItem}>ชื่อ</div>
          <div className={styles.headerItem}>หมวดหมู่</div>
          <div className={styles.headerItem}>จำนวน</div>
          <div className={styles.headerItem}>หน่วย</div>
          <div className={styles.headerItem}>สถานะ</div>
          <div className={styles.headerItem}>สถานที่จัดเก็บ</div>
          <div className={styles.headerItem}>แก้ไขล่าสุด</div>
          <div className={`${styles.headerItem} ${styles.centerCell}`}>การจัดการ</div>
        </div>

        <div className={styles.inventory}>
          {currentItems.map((item, index) => (
            <div className={`${styles.tableGrid} ${styles.tableRow}`} key={item.item_id}>
              <div className={`${styles.tableCell} ${styles.centerCell}`} data-label="ลำดับ">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </div>
              <div className={styles.tableCell} data-label="รหัสสินค้า">
                {getItemCode(item)}
              </div>
              <div className={`${styles.tableCell} ${styles.centerCell}`} data-label="รูปภาพ">
                <img
                  src={item.item_img ? `http://localhost:5000/uploads/${item.item_img}` : "http://localhost:5000/public/defaults/landscape.png"}
                  alt={item.item_name}
                  className={styles.imageCell}
                />
              </div>
              <div className={styles.tableCell} data-label="ชื่อ">
                {item.item_name}
              </div>
              <div className={styles.tableCell} data-label="หมวดหมู่">
                {categoryLabels[item.item_category] || item.item_category}
              </div>
              <div className={styles.tableCell} data-label="จำนวน">
                {item.item_qty}
              </div>
              <div className={styles.tableCell} data-label="หน่วย">
                {item.item_unit}
              </div>
              <div className={styles.tableCell} data-label="สถานะ">
                {item.item_status}
              </div>
              <div className={styles.tableCell} data-label="สถานที่จัดเก็บ">
                {item.item_location}
              </div>
              <div className={styles.tableCell} data-label="แก้ไขล่าสุด">
                {formatThaiDateTime(item.item_update)}
              </div>
              <div className={`${styles.tableCell} ${styles.centerCell}`} data-label="การจัดการ">
                <Link href={`/manage/manageData/${item.item_id}/editItem`} className={`${styles.actionButton} ${styles.editButton}`}>แก้ไข</Link>
                <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(item.item_id)}>ลบ</button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.pagination}>
          <button className={styles.prevButton} onClick={handlePrevPage} disabled={currentPage === 1}>หน้าก่อนหน้า</button>
          <button className={styles.nextButton} onClick={handleNextPage} disabled={currentPage * itemsPerPage >= filteredItems.length}>หน้าถัดไป</button>
        </div>
      </div>
    </div>
  );
}