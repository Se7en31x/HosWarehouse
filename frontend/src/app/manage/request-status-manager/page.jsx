'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axiosInstance from '../../utils/axiosInstance';
import styles from './page.module.css';

export default function RequestStatusManagerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 10;

  const statusMap = {
    pending: 'รอดำเนินการ',
    preparing: 'กำลังจัดเตรียม',
    delivering: 'นำส่งแล้ว',
    completed: 'เสร็จสิ้น',
    approved_all: 'อนุมัติทั้งหมด',
    approved_partial: 'อนุมัติบางส่วน',
    rejected_all: 'ปฏิเสธทั้งหมด',
    waiting_approval: 'รอการอนุมัติ',
  };

  const statusToClass = {
    pending: 'pending',
    preparing: 'preparing',
    delivering: 'delivering',
    completed: 'completed',
    approved_all: 'approved_all',
    approved_partial: 'approved_partial',
    rejected_all: 'rejected_all',
    waiting_approval: 'waiting_approval',
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get('/requestStatus');
      setRequests(res.data);
    } catch (err) {
      console.error('โหลดคำขอล้มเหลว', err);
      alert('โหลดคำขอไม่สำเร็จ กรุณาลองใหม่');
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
    if (page < 1 || page > totalPages) return; // ป้องกันเลขหน้าที่ไม่ถูกต้อง
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
                  <td>{new Date(r.request_date).toLocaleTimeString('th-TH')}</td>
                  <td>{new Date(r.request_due_date).toLocaleDateString('th-TH')}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[statusToClass[r.request_status]] || ''}`}
                    >
                      {statusMap[r.request_status] || r.request_status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/manage/request-status-manager/${r.request_id}`}>
                      <button className={styles.manageBtn} title="จัดการสถานะคำขอนี้">
                        จัดการสถานะ
                      </button>
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#64748b' }}>
                  ยังไม่มีคำขอในระบบ
                </td>
              </tr>
            )}

            {Array.from({ length: itemsPerPage - currentItems.length }).map((_, idx) => (
              <tr key={`empty-${idx}`}>
                <td colSpan={8}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* แสดง pagination เสมอแม้ totalPages = 0 */}
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

        {Array.from({ length: totalPages || 1 }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => handlePageChange(i + 1)}
            className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.activePage : ''}`}
            title={`หน้า ${i + 1}`}
          >
            {i + 1}
          </button>
        ))}

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
