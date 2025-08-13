'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

export default function RequestStatusManagerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 9;

  // แผนที่สถานะ -> label ภาษาไทย
  const statusMap = {
    waiting_approval: 'รอการอนุมัติ',
    approved_all: 'อนุมัติทั้งหมด',
    rejected_all: 'ปฏิเสธทั้งหมด',
    approved_partial: 'อนุมัติบางส่วน',
    rejected_partial: 'ปฏิเสธบางส่วน',
    approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน',
    pending: 'อยู่ระหว่างการดำเนินการ',
    preparing: 'กำลังจัดเตรียม',
    delivering: 'นำส่งแล้ว',
    completed: 'เสร็จสิ้น',
    canceled: 'ยกเลิกคำขอ',
    stock_deducted: 'ตัดสต็อกแล้ว',
  };

  // สถานะ -> ชื่อคลาส (ให้มี default เสมอ)
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
    stock_deducted: 'stock_deducted',
    __default: 'defaultStatus',
  };

  // แสดงเฉพาะคำขอที่จบการอนุมัติแล้วหรือกำลังดำเนินการ
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

  // สถานะที่เป็น view-only (ไม่มีปุ่ม "จัดการสถานะ")
  const viewOnlyStatuses = ['rejected_all', 'completed', 'canceled'];

  // จัดเรียงล่าสุดก่อน
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const da = new Date(a.request_date).getTime();
      const db = new Date(b.request_date).getTime();
      return db - da; // ใหม่ก่อน
    });
  }, [requests]);

  const totalPages = Math.ceil(sortedRequests.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedRequests.slice(start, end);
  }, [sortedRequests, currentPage]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      // ส่งเป็น comma-separated ตามที่ backend คาดหวัง
      const statusQuery = allowedStatuses.join(',');
      const res = await axiosInstance.get('/requestStatus', {
        params: { status: statusQuery },
      });

      if (!Array.isArray(res.data)) {
        throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');
      }

      setRequests(res.data);
      setCurrentPage(1); // รีเซ็ตกลับหน้าแรกเผื่อจำนวนหน้าเปลี่ยน
    } catch (err) {
      console.error('โหลดคำขอล้มเหลว', err);
      Swal.fire('ผิดพลาด', 'โหลดคำขอไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setLoading(false);
    }
  }

  // เลือกปฏิทิน/ภาษาและ timezone ชัดเจน
  // ถ้าอยากได้ปี ค.ศ. ใช้ 'en-GB' แทน 'th-TH' (เพราะ th-TH จะเป็น พ.ศ. ตามดีไซน์)
  const LOCALE_DATE = 'th-TH'; // หรือ 'en-GB' ถ้าต้องการ ค.ศ.
  const TIMEZONE = 'Asia/Bangkok';

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return new Intl.DateTimeFormat(LOCALE_DATE, {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  }

  function formatTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d)) return '-';
    return new Intl.DateTimeFormat(LOCALE_DATE, {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  function handlePageChange(page) {
    if (page < 1) return;
    if (totalPages === 0 && page !== 1) return;
    if (totalPages > 0 && page > totalPages) return;
    setCurrentPage(page);
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
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
              currentItems.map((r) => {
                const statusKey = r.request_status;
                const label = statusMap[statusKey] || statusKey || 'ไม่ทราบสถานะ';
                const badgeClass =
                  styles[statusToClass[statusKey]] || styles[statusToClass.__default];

                return (
                  <tr key={r.request_id}>
                    <td>{r.request_code}</td>
                    <td>{r.user_name}</td>
                    <td>{r.department}</td>
                    <td>{formatDate(r.request_date)}</td>
                    <td>{formatTime(r.request_date)}</td>
                    <td>{r.request_due_date ? formatDate(r.request_due_date) : '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${badgeClass}`}>{label}</span>
                    </td>
                    <td>
                      <Link href={`/manage/request-status-manager/${r.request_id}`}>
                        <button
                          className={`${styles.manageBtn} ${
                            viewOnlyStatuses.includes(statusKey) ? styles.viewOnlyBtn : ''
                          }`}
                          title={
                            viewOnlyStatuses.includes(statusKey)
                              ? 'ดูรายละเอียดคำขอนี้'
                              : 'จัดการสถานะคำขอนี้'
                          }
                        >
                          {viewOnlyStatuses.includes(statusKey) ? 'ดูรายละเอียด' : 'จัดการสถานะ'}
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className={styles.emptyRow}>
                  {requests.length === 0
                    ? 'ยังไม่มีคำขอในระบบสำหรับสถานะที่แสดง'
                    : 'ไม่พบคำขอในหน้าปัจจุบัน'}
                </td>
              </tr>
            )}

            {/* เติมแถวว่างให้เต็มตาราง (เพื่อ UI ไม่กระดก) */}
            {currentItems.length < itemsPerPage &&
              Array.from({ length: itemsPerPage - currentItems.length }).map((_, idx) => (
                <tr key={`empty-${idx}`} className={styles.emptyFillerRow}>
                  <td colSpan={8}>&nbsp;</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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

        {totalPages > 0
          ? Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`${styles.pageBtn} ${currentPage === i + 1 ? styles.activePage : ''}`}
                title={`หน้า ${i + 1}`}
              >
                {i + 1}
              </button>
            ))
          : (
            <button className={`${styles.pageBtn} ${styles.activePage}`} disabled>
              1
            </button>
          )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`${styles.pageBtn} ${
            currentPage === totalPages || totalPages === 0 ? styles.disabledBtn : ''
          }`}
          title="ถัดไป"
        >
          ถัดไป ▶
        </button>

        <button
          onClick={() => handlePageChange(totalPages || 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`${styles.pageBtn} ${
            currentPage === totalPages || totalPages === 0 ? styles.disabledBtn : ''
          }`}
          title="หน้าสุดท้าย"
        >
          หน้าสุดท้าย ⏭
        </button>
      </div>
    </div>
  );
}
