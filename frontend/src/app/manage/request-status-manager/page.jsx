'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axiosInstance from '@/app/utils/axiosInstance'; // ปรับ Path ให้ถูกต้อง
import Swal from 'sweetalert2';
import styles from './page.module.css';

export default function RequestStatusManagerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 9; // จำนวนรายการต่อหน้า

  // 1. statusMap: ควรมีคำแปลสำหรับทุกสถานะที่เป็นไปได้ในระบบ
  const statusMap = {
    waiting_approval: 'รอการอนุมัติ', // สถานะเริ่มต้นของคำขอ (ผู้อนุมัติจัดการ)
    approved_all: 'อนุมัติทั้งหมด',
    rejected_all: 'ปฏิเสธทั้งหมด',
    approved_partial: 'อนุมัติบางส่วน', // มีรายการที่อนุมัติและรายการที่รอตัดสินใจ
    rejected_partial: 'ปฏิเสธบางส่วน', // มีรายการที่ปฏิเสธและรายการที่รอตัดสินใจ
    approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน', // ทุกรายการย่อยได้รับการตัดสินใจแล้ว
    pending: 'อยู่ระหว่างการดำเนินการ',
    preparing: 'กำลังจัดเตรียม',
    delivering: 'นำส่งแล้ว',
    completed: 'เสร็จสิ้น',
    canceled: 'ยกเลิกคำขอ',
    stock_deducted: 'ตัดสต็อกแล้ว', // เปลี่ยนคำแปลตรงนี้
  };

  // 2. statusToClass: กำหนดคลาส CSS สำหรับแต่ละสถานะเพื่อการแสดงผล
  const statusToClass = {
    waiting_approval: 'waiting_approval',
    approved_all: 'approved_all',
    rejected_all: 'rejected_all',
    approved_partial: 'approved_partial',
    rejected_partial: 'rejected_partial',
    approved_partial_and_rejected_partial: 'approved_partial_and_rejected_partial',
    pending: 'pending',
    preparing: 'preparing',
    delivering: 'delivering',
    completed: 'completed',
    canceled: 'canceled',
    stock_deducted: 'stock_deducted', // คลาสสำหรับสถานะใหม่
  };

  // 3. allowedStatuses: หน้านี้ควรแสดงเฉพาะคำขอที่ "จบกระบวนการอนุมัติแล้ว"
  // หรืออยู่ในขั้นตอนการดำเนินการจัดส่งพัสดุ
  const allowedStatuses = [
    'approved_all',
    'rejected_all',
    'approved_partial_and_rejected_partial',
    'stock_deducted',
    'pending',
    'preparing',
    'delivering',
    'completed',
    'canceled',
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const statusQuery = allowedStatuses.join(',');
      const res = await axiosInstance.get(`/requestStatus?status=${statusQuery}`);
      setRequests(res.data);
    } catch (err) {
      console.error('โหลดคำขอล้มเหลว', err);
      Swal.fire('ผิดพลาด', 'โหลดคำขอไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(requests.length / itemsPerPage);
  const currentItems = requests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loading}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // กำหนดสถานะที่ไม่ต้องการให้ "จัดการ" (ปุ่มจะเปลี่ยนเป็น "ดูรายละเอียด" แทน)
  // ลบ 'stock_deducted' ออกจากรายการนี้ เพื่อให้สามารถ "จัดการสถานะ" ได้
  const viewOnlyStatuses = ['rejected_all', 'completed', 'canceled']; 

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>จัดการสถานะคำขอทั้งหมด</h1>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>รหัสคำขอ</th>
              <th>ผู้ขอ</th>
              <th>แผนก</th>
              <th>วันที่ขอ</th>
              <th>เวลา</th>
              <th>วันที่นำส่ง</th>
              <th>สถานะปัจจุบัน</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length > 0 ? (
              currentItems.map((r) => (
                <tr key={r.request_id}>
                  <td>{r.request_code}</td>
                  <td>{r.user_name}</td>
                  <td>{r.department}</td>
                  <td>{new Date(r.request_date).toLocaleDateString('th-TH')}</td>
                  <td>{new Date(r.request_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    {r.request_due_date
                      ? new Date(r.request_due_date).toLocaleDateString('th-TH')
                      : '-'}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[statusToClass[r.request_status]] || styles.defaultStatus}`}
                    >
                      {statusMap[r.request_status] || r.request_status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/manage/request-status-manager/${r.request_id}`}> 
                      <button
                        className={`${styles.manageBtn} ${viewOnlyStatuses.includes(r.request_status) ? styles.viewOnlyBtn : ''}`}
                        title={viewOnlyStatuses.includes(r.request_status) ? "ดูรายละเอียดคำขอนี้" : "จัดการสถานะคำขอนี้"}
                      >
                        {viewOnlyStatuses.includes(r.request_status) ? 'ดูรายละเอียด' : 'จัดการสถานะ'}
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className={styles.emptyRow}>
                  {requests.length === 0 ? "ยังไม่มีคำขอในระบบสำหรับสถานะที่แสดง" : "ไม่พบคำขอในสถานะที่แสดงในหน้าปัจจุบัน"}
                </td>
              </tr>
            )}

            {/* แถวว่างสำหรับเติมเต็มตารางให้ครบตาม itemsPerPage เพื่อความสวยงาม */}
            {Array.from({ length: itemsPerPage - currentItems.length }).map((_, idx) => (
              <tr key={`empty-${idx}`} className={styles.emptyFillerRow}>
                <td colSpan={8}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ส่วนควบคุม Pagination */}
      <div className={styles.pagination}>
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className={`${styles.pageBtn} ${currentPage === 1 ? styles.disabledBtn : ''}`}
          title="หน้าแรก"
        >
          หน้าแรก ⏮
        </button>

        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${styles.pageBtn} ${currentPage === 1 ? styles.disabledBtn : ''}`}
          title="ก่อนหน้า"
        >
          ◀ ก่อนหน้า
        </button>

        {totalPages > 0 ? (
          Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => handlePageChange(i + 1)}
              className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.activePage : ''}`}
              title={`หน้า ${i + 1}`}
            >
              {i + 1}
            </button>
          ))
        ) : (
          <button
            className={`${styles.pageBtn} ${styles.activePage}`}
            disabled
          >
            1
          </button>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`${styles.pageBtn} ${currentPage === totalPages || totalPages === 0 ? styles.disabledBtn : ''}`}
          title="ถัดไป"
        >
          ถัดไป ▶
        </button>

        <button
          onClick={() => handlePageChange(totalPages || 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`${styles.pageBtn} ${currentPage === totalPages || totalPages === 0 ? styles.disabledBtn : ''}`}
          title="หน้าสุดท้าย"
        >
          หน้าสุดท้าย ⏭
        </button>
      </div>
    </div>
  );
}
