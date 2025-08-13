'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import styles from './page.module.css';
import Link from 'next/link';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const userId = 1; // จำลองผู้ใช้ก่อน

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get(`/my-requests?user_id=${userId}`);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดคำขอได้', 'error');
    }
  };

  const handleCancel = async (requestId) => {
    const confirm = await Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'ต้องการยกเลิกคำขอนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกเลิกเลย',
      cancelButtonText: 'ไม่',
    });
    if (!confirm.isConfirmed) return;

    try {
      await axiosInstance.put(`/my-requests/${requestId}/cancel`, { user_id: userId });
      Swal.fire('สำเร็จ', 'ยกเลิกคำขอเรียบร้อยแล้ว', 'success');
      fetchRequests();
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'ไม่สามารถยกเลิกคำขอได้', 'error');
    }
  };

  const translateRequestTypes = (types) => {
    if (!types) return '-';
    const mapType = { withdraw: 'การเบิก', borrow: 'การยืม', return: 'คืน' };
    return [...new Set(types.split(',').map(t => mapType[t?.toLowerCase()] || t))].join(' และ ');
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(requests.length / ITEMS_PER_PAGE));
  const paginatedRequests = requests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.contentWrapper}>
        {/* หัวเรื่อง */}
        <h1 className={styles.pageTitle}>รายการคำขอของฉัน</h1>

        {/* โซนตาราง (กินพื้นที่ที่เหลือ) */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>ลำดับ</div>
            <div className={styles.headerItem}>รหัสคำขอ</div>
            <div className={styles.headerItem}>วันที่/เวลา</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={styles.headerItem}>จัดการ</div>
          </div>

          {paginatedRequests.length > 0 ? (
            paginatedRequests.map((req, index) => (
              <div key={req.request_id || index} className={`${styles.tableGrid} ${styles.tableRow}`}>
                <div className={styles.tableCell}>
                  {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </div>
                <div className={styles.tableCell}>{req.request_code || '-'}</div>
                <div className={styles.tableCell}>{formatDate(req.request_date)}</div>
                <div className={styles.tableCell}>{translateRequestTypes(req.request_types)}</div>
                <div className={styles.tableCell}>{req.request_status || '-'}</div>
                <div className={styles.tableCell}>{req.item_count ?? '-'}</div>
                <div className={`${styles.tableCell} ${styles.actionCell}`}>
                  <Link href={`/staff/my-request-detail/${req.request_id}`}>
                    <button className={`${styles.actionButton} ${styles.view}`}>ดู</button>
                  </Link>
                  {req.request_status === 'รอดำเนินการ' && (
                    <>
                      <Link href={`/staff/my-request-detail/${req.request_id}/edit`}>
                        <button className={`${styles.actionButton} ${styles.edit}`}>แก้ไข</button>
                      </Link>
                      <button
                        className={`${styles.actionButton} ${styles.cancel}`}
                        onClick={() => handleCancel(req.request_id)}
                      >
                        ยกเลิก
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noDataRow}>ไม่มีคำขอในระบบ</div>
          )}
        </div>

        {/* เพจจิเนชัน (ถูกดันไปล่างสุด) */}
        <div className={styles.paginationWrapper}>
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={handlePrev}
                disabled={currentPage === 1}
                aria-label="หน้าก่อนหน้า"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft size={16} />
              </button>
            </li>

            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <li key={idx} className={styles.ellipsis}>…</li>
              ) : (
                <li key={idx}>
                  <button
                    className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                </li>
              )
            )}

            <li>
              <button
                className={styles.pageButton}
                onClick={handleNext}
                disabled={currentPage >= totalPages}
                aria-label="หน้าถัดไป"
                title="หน้าถัดไป"
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}