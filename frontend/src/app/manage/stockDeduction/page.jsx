'use client'; // จำเป็นต้องใช้เพื่อเปิดใช้งาน Client Components ใน Next.js

import { useState, useEffect } from 'react'; // import hooks ที่จำเป็น
import { useRouter } from 'next/navigation'; // สำหรับการนำทางใน Next.js App Router
import Swal from 'sweetalert2'; 

import axiosInstance from '@/app/utils/axiosInstance'; 
import styles from './page.module.css'; 

// Map สถานะเพื่อให้แสดงผลเป็นภาษาไทยและมี class สำหรับ styling
const statusMap = {
  approved_all: { text: 'อนุมัติทั้งหมด', class: styles.statusApproved },
  approved_partial: { text: 'อนุมัติบางส่วน', class: styles.statusPartial },
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: styles.statusDeducted },
  completed: { text: 'เสร็จสิ้น', class: styles.statusCompleted },
  pending_deduction: { text: 'รอเบิก-จ่าย', class: styles.statusPendingDeduction },
};

// Map ประเภทคำขอ (request_type) เป็นภาษาไทย
const typeMap = {
  'borrow': 'ยืม',
  'withdraw': 'เบิก',
  'transfer': 'โอน',
};

// **ฟังก์ชันใหม่สำหรับแปลสถานะ**
const getStatusTranslation = (status) => {
  if (statusMap[status]) {
    return statusMap[status];
  }
  return {
    text: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    class: styles.statusDefault || styles.statusPending,
  };
};

// **ฟังก์ชันใหม่สำหรับแปลประเภทคำขอ**
const getTypeTranslation = (type) => {
  // ตรวจสอบว่าประเภทมีอยู่ใน typeMap หรือไม่
  if (typeMap[type]) {
    // ถ้ามี ให้คืนค่าภาษาไทย
    return typeMap[type];
  }
  // ถ้าไม่มี ให้คืนค่าเดิม (เช่นถ้า Backend ส่งค่าที่ไม่คาดคิดมา)
  return type;
};

export default function StockDeductionPage() {
  const router = useRouter(); 

  const [requests, setRequests] = useState([]); 
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState(null); 
  const [currentPage, setCurrentPage] = useState(1); 
  const itemsPerPage = 12; 

  useEffect(() => {
    const fetchRequestsForStockDeduction = async () => {
      try {
        setIsLoading(true); 
        setError(null); 

        const response = await axiosInstance.get('/stockDeduction/ready');
        const data = response.data;

        setRequests(data); 
      } catch (err) {
        console.error("Error fetching requests ready for stock deduction:", err);
        setError(err.response?.data?.message || "ไม่สามารถโหลดรายการคำขอที่พร้อมเบิก-จ่ายได้ กรุณาลองใหม่อีกครั้ง"); 
      } finally {
        setIsLoading(false); 
      }
    };

    fetchRequestsForStockDeduction(); 
  }, []); 

  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const currentItems = requests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDeductStockClick = (requestId) => {
    router.push(`/manage/stockDeduction/${requestId}`);
  };

  const tableColSpan = 8; 

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.title}>รายการคำขอที่รอเบิก-จ่ายสต็อก</h1>

        {isLoading && <p className={styles.infoMessage}>กำลังโหลดข้อมูลรายการคำขอ...</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}

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
                  currentItems.map((item, index) => {
                    const translatedStatus = getStatusTranslation(item.status);
                    const translatedType = getTypeTranslation(item.type); // **เรียกใช้ฟังก์ชันแปลประเภท**
                    return (
                      <tr key={item.request_id || item.request_code}>
                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td>{item.request_code}</td>
                        <td>{new Date(item.request_date).toLocaleDateString('th-TH')}</td>
                        <td>{item.requester}</td>
                        <td>{item.department}</td>
                        <td>
                          {/* **แสดงประเภทที่ถูกแปลแล้ว** */}
                          {translatedType}
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${translatedStatus.class}`}>
                            {translatedStatus.text}
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
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={tableColSpan} className={styles.infoMessage}>ไม่พบรายการคำขอที่รอการเบิก-จ่ายสต็อกในขณะนี้</td>
                  </tr>
                )}
                {Array.from({ length: itemsPerPage - currentItems.length }).map((_, index) => (
                  <tr key={`placeholder-${index}`}>
                    <td colSpan={tableColSpan} className={styles.placeholderRow}>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

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