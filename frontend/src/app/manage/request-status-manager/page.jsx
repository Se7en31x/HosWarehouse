// RequestStatusManagerPage.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axiosInstance from '../../utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

export default function RequestStatusManagerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  // 1. statusMap: ควรมีคำแปลสำหรับทุกสถานะที่เป็นไปได้ในระบบ
  // แม้บางสถานะจะไม่แสดงในหน้านี้โดยตรง (ถูกกรองด้วย allowedStatuses)
  // แต่การมีไว้จะช่วยให้การแสดงผลสถานะที่มาจาก Backend ถูกต้องเสมอ
  const statusMap = {
    waiting_approval: 'รอการอนุมัติ', // สถานะเริ่มต้นของคำขอ (ผู้อนุมัติจัดการ)
    approved_all: 'อนุมัติทั้งหมด',
    rejected_all: 'ปฏิเสธทั้งหมด',
    approved_partial: 'อนุมัติบางส่วน', // มีรายการที่อนุมัติและรายการที่รอตัดสินใจ
    rejected_partial: 'ปฏิเสธบางส่วน', // มีรายการที่ปฏิเสธและรายการที่รอตัดสินใจ
    approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน', // ✅ สถานะนี้บอกว่าทุกรายการย่อยได้รับการตัดสินใจแล้ว
    pending: 'รอดำเนินการจัดเตรียม', // คำขอพร้อมให้เริ่มจัดเตรียม
    preparing: 'กำลังจัดเตรียม',
    delivering: 'นำส่งแล้ว',
    completed: 'เสร็จสิ้น',
    canceled: 'ยกเลิกคำขอ', // อาจจะรวมคำขอที่ยกเลิกด้วยในหน้าผู้จัดการ
  };

  // 2. statusToClass: กำหนดคลาส CSS สำหรับแต่ละสถานะเพื่อการแสดงผล
  const statusToClass = {
    waiting_approval: 'waiting_approval',
    approved_all: 'approved_all',
    rejected_all: 'rejected_all',
    approved_partial: 'approved_partial',
    rejected_partial: 'rejected_partial',
    approved_partial_and_rejected_partial: 'approved_partial_and_rejected_partial', // ✅ เพิ่มเข้ามา
    pending: 'pending',
    preparing: 'preparing',
    delivering: 'delivering',
    completed: 'completed',
    canceled: 'canceled',
  };

  // 3. allowedStatuses: นี่คือหัวใจสำคัญของการกรองข้อมูลในหน้านี้
  // หน้านี้ควรแสดงเฉพาะคำขอที่ "จบกระบวนการอนุมัติแล้ว"
  // หรืออยู่ในขั้นตอนการดำเนินการจัดส่งพัสดุ
  const allowedStatuses = [
    'approved_all', // อนุมัติทุกรายการย่อย (จบการอนุมัติ)
    'rejected_all', // ปฏิเสธทุกรายการย่อย (จบการอนุมัติ)
    'approved_partial_and_rejected_partial', // ✅ สำคัญ: ทุกรายการย่อยได้รับการตัดสินใจแล้ว (จบการอนุมัติ)
    'pending', // คำขอที่อนุมัติแล้วและรอการจัดเตรียม
    'preparing', // กำลังจัดเตรียม
    'delivering', // กำลังนำส่ง
    'completed', // เสร็จสิ้นกระบวนการทั้งหมด
    'canceled', // อาจจะรวมคำขอที่ยกเลิกไว้ในมุมมองของผู้จัดการ
    // ❌ ไม่รวม 'waiting_approval' เพราะคำขอเหล่านี้ยังอยู่ที่หน้าอนุมัติ
    // ❌ ไม่รวม 'approved_partial' เพราะยังมีรายการที่รอตัดสินใจในหน้าอนุมัติ
    // ❌ ไม่รวม 'rejected_partial' เพราะยังมีรายการที่รอตัดสินใจในหน้าอนุมัติ
  ];

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // ✅ สร้าง query string จาก allowedStatuses เพื่อให้ Backend กรองข้อมูล
      // การกรองที่ Backend มีประสิทธิภาพดีกว่าการกรองที่ Frontend
      const statusQuery = allowedStatuses.join(',');
      const res = await axiosInstance.get(`/requestStatus?status=${statusQuery}`);
      setRequests(res.data); // Backend ควรส่งเฉพาะข้อมูลที่กรองแล้วมาให้
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
  const viewOnlyStatuses = ['rejected_all', 'completed', 'canceled']; // เพิ่ม 'canceled' ถ้าต้องการให้ดูได้อย่างเดียว

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
                        // ใช้ viewOnlyStatuses เพื่อตรวจสอบสถานะ
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
                  {/* ข้อความแสดงผลเมื่อไม่มีข้อมูลในหน้าปัจจุบัน หรือไม่มีคำขอเลย */}
                  {requests.length === 0 ? "ยังไม่มีคำขอในระบบสำหรับสถานะที่แสดง" : "ไม่พบคำขอในสถานะที่แสดงในหน้าปัจจุบัน"}
                </td>
              </tr>
            )}

            {/* แถวว่างสำหรับเติมเต็มตารางให้ครบ 10 รายการ เพื่อความสวยงาม */}
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
          ⏮ หน้าแรก
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