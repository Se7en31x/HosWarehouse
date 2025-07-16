'use client'; // จำเป็นต้องใช้เพื่อเปิดใช้งาน Client Components ใน Next.js

import { useState, useEffect } from 'react'; // import hooks ที่จำเป็น
import { useRouter } from 'next/navigation'; // สำหรับการนำทางใน Next.js App Router
import Swal from 'sweetalert2'; // เพิ่ม: Import SweetAlert2 (สำหรับใช้ในอนาคต)

import axiosInstance from '@/app/utils/axiosInstance'; // ตรวจสอบ Path ให้ถูกต้อง
import styles from './page.module.css'; // ตรวจสอบให้แน่ใจว่าชื่อไฟล์และ path ถูกต้อง

// Map สถานะเพื่อให้แสดงผลเป็นภาษาไทยและมี class สำหรับ styling
const statusMap = {
  approved_all: { text: 'อนุมัติทั้งหมด', class: styles.statusApproved }, // ใช้ styles.statusApproved
  approved_partial: { text: 'อนุมัติบางส่วน', class: styles.statusPartial }, // ใช้ styles.statusPartial
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: styles.statusDeducted }, // เพิ่มสถานะใหม่
  completed: { text: 'เสร็จสิ้น', class: styles.statusCompleted }, // เพิ่มสถานะใหม่
};

// Map ประเภทคำขอ (request_type) เป็นภาษาไทย
const typeMap = {
  'Borrow': 'ยืม',
  'Withdraw': 'เบิก',
  'Transfer': 'โอน',
  // เพิ่มประเภทอื่นๆ ที่คุณมีในฐานข้อมูลได้ที่นี่
};

export default function StockDeductionPage() {
  const router = useRouter(); // Initialize router hook
  
  // States สำหรับเก็บข้อมูลและสถานะต่างๆ
  const [requests, setRequests] = useState([]); // เก็บรายการคำขอที่อนุมัติแล้ว
  const [isLoading, setIsLoading] = useState(true); // บอกว่ากำลังโหลดข้อมูลหรือไม่
  const [error, setError] = useState(null); // เก็บข้อความ error หากมีปัญหา
  const [currentPage, setCurrentPage] = useState(1); // หน้าปัจจุบันสำหรับการแบ่งหน้า
  const itemsPerPage =10; // จำนวนรายการต่อหน้า

  // Effect Hook สำหรับดึงข้อมูลจาก Backend API เมื่อ Component ถูก Mount
  useEffect(() => {
    const fetchApprovedRequests = async () => {
      try {
        setIsLoading(true); // เริ่มโหลด: ตั้งสถานะเป็นกำลังโหลด
        setError(null); // ล้างข้อผิดพลาดเก่า
        
        const response = await axiosInstance.get('/stockDeduction/approved'); 
        const data = response.data;
        
        const filteredData = data.filter(item => 
          item.status === 'approved_all' || item.status === 'approved_partial'
        );
        
        setRequests(filteredData); // อัปเดต state ด้วยข้อมูลที่ได้มา
      } catch (err) {
        console.error("Error fetching approved requests for stock deduction:", err);
        setError(err.response?.data?.message || "ไม่สามารถโหลดรายการคำขอที่อนุมัติได้ กรุณาลองใหม่อีกครั้ง"); // แสดงข้อความ error ให้ผู้ใช้
      } finally {
        setIsLoading(false); // จบการโหลด ไม่ว่าสำเร็จหรือล้มเหลว
      }
    };

    fetchApprovedRequests(); // เรียกฟังก์ชันดึงข้อมูลเมื่อ Component ถูกโหลดครั้งแรก
  }, []); // Dependency array ว่างเปล่า [] หมายหมายถึง effect นี้จะทำงานเพียงครั้งเดียวหลังการ render ครั้งแรก

  // คำนวณข้อมูลสำหรับการแบ่งหน้า (Pagination)
  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const currentItems = requests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ฟังก์ชันสำหรับจัดการเมื่อปุ่ม "ดำเนินการเบิก-จ่าย" ถูกคลิก
  const handleDeductStockClick = (requestId) => {
    router.push(`/manage/stockDeduction/${requestId}`);
  };

  // จำนวนคอลัมน์ในตาราง (สำหรับ colspan ของข้อความ "ไม่พบข้อมูล")
  const tableColSpan = 8; // ลำดับ, รหัสคำขอ, วันที่ขอ, ผู้ขอ, แผนก, ประเภท, สถานะ, การจัดการ

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.title}>รายการคำขอที่รอเบิก-จ่ายสต็อก</h1>

        {/* แสดงสถานะการโหลด */}
        {isLoading && <p className={styles.infoMessage}>กำลังโหลดข้อมูลรายการคำขอ...</p>} 

        {/* แสดงข้อความ error หากมี */}
        {error && <p className={styles.errorMessage}>{error}</p>} 

        {/* ตารางจะแสดงเสมอ ไม่ว่าจะโหลดอยู่ มี error หรือไม่มีข้อมูล */}
        {!isLoading && !error && (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>รหัสคำขอ</th>
                  <th>วันที่ขอ</th>
                  <th>ผู้ขอ</th>
                  <th>แผนก</th>
                  <th>ประเภท</th>
                  <th>สถานะ</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length > 0 ? (
                  currentItems.map((item, index) => (
                    <tr key={item.request_id || item.request_code}> 
                      <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td>{item.request_code}</td>
                      <td>{new Date(item.request_date).toLocaleDateString('th-TH')}</td>
                      <td>{item.requester}</td>
                      <td>{item.department}</td>
                      <td>
                        {typeMap[item.type] || item.type}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${statusMap[item.status]?.class}`}>
                          {statusMap[item.status]?.text || 'ไม่ระบุ'}
                        </span>
                      </td>
                      <td>
                        <button 
                          className={`${styles.button} ${styles.primaryButton}`}
                          onClick={() => handleDeductStockClick(item.request_id)} 
                        >
                          📦 ดำเนินการเบิก-จ่าย
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  // แสดงข้อความเมื่อไม่พบข้อมูล
                  <tr>
                    <td colSpan={tableColSpan} className={styles.infoMessage}>ไม่พบรายการคำขอที่รอการเบิก-จ่ายสต็อกในขณะนี้</td>
                  </tr>
                )}
                {/* เพิ่มแถวว่างเพื่อกันพื้นที่ให้ตารางมีขนาดคงที่ */}
                {Array.from({ length: itemsPerPage - currentItems.length }).map((_, index) => (
                  <tr key={`placeholder-${index}`}>
                    <td colSpan={tableColSpan} className={styles.placeholderRow}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ส่วนควบคุมการแบ่งหน้า (Pagination) */}
            <div className={styles.pagination}>
              <button
                className={styles.pageButton} 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                ⬅️ ก่อนหน้า
              </button>
              <span>หน้า {currentPage} / {totalPages}</span>
              <button
                className={styles.pageButton} 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                ถัดไป ➡️
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
