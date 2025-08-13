'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import axiosInstance from '@/app/utils/axiosInstance';
import styles from './page.module.css';

// Map สถานะของ "ใบคำขอ"
const statusMap = {
  approved_all: { text: 'อนุมัติทั้งหมด', class: styles.statusApproved },
  approved_partial: { text: 'อนุมัติบางส่วน', class: styles.statusPartial },
  approved_partial_and_rejected_partial: { text: 'อนุมัติ/ปฏิเสธบางส่วน', class: styles.statusPartial },
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: styles.statusDeducted },
  completed: { text: 'เสร็จสิ้น', class: styles.statusCompleted },
  pending_deduction: { text: 'รอเบิก-จ่าย', class: styles.statusPendingDeduction },
};
const typeMap = { borrow: 'ยืม', withdraw: 'เบิก', transfer: 'โอน' };

const getStatusTranslation = (status) =>
  statusMap[status] || {
    text: (status || '').toString().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()),
    class: styles.statusDefault || styles.statusPendingDeduction,
  };

const getTypeTranslation = (type) => typeMap[type] || type || '-';

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('th-TH');
};

// ✅ ดึงจำนวนแบบยืดหยุ่น: รองรับทั้งคอลัมน์แยก และ status_counts JSON
function getBreakdown(row) {
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const sc = (row?.status_counts && typeof row.status_counts === 'object') ? row.status_counts : null;

  const pending = toNum(row?.pending_count) || toNum(row?.pending_items_count) || toNum(sc?.pending);
  const preparing = toNum(row?.preparing_count) || toNum(sc?.preparing);
  const delivering = toNum(row?.delivering_count) || toNum(sc?.delivering);
  const completed = toNum(row?.completed_count) || toNum(sc?.completed);

  const total =
    toNum(row?.total_approved_count) ||
    toNum(row?.total_items_count) ||
    (pending + preparing + delivering + completed);

  // ตัดสต็อกแล้ว = preparing + delivering + completed
  const deductedSoFar = preparing + delivering + completed;

  return { pending, preparing, delivering, completed, total, deductedSoFar };
}

export default function StockDeductionPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await axiosInstance.get('/stockDeduction/ready');
        const data = Array.isArray(res.data) ? res.data : [];

        // เรียงล่าสุดก่อน
        data.sort((a, b) => {
          const da = new Date(a?.request_date).getTime();
          const db = new Date(b?.request_date).getTime();
          return (Number.isNaN(db) ? 0 : db) - (Number.isNaN(da) ? 0 : da);
        });

        setRequests(data);
        setCurrentPage(1);
      } catch (err) {
        const msg = err?.response?.data?.message || 'ไม่สามารถโหลดรายการคำขอที่พร้อมเบิก-จ่ายได้ กรุณาลองใหม่อีกครั้ง';
        console.error('Error fetching requests:', err);
        setError(msg);
        Swal.fire('ผิดพลาด', msg, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalPages = Math.max(1, Math.ceil((requests?.length || 0) / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return (requests || []).slice(start, end);
  }, [requests, currentPage]);

  const handleDeductStockClick = (requestId) => {
    if (!requestId) return;
    router.push(`/manage/stockDeduction/${requestId}`);
  };

  const colSpan = 10; // เพิ่มคอลัมน์ "ตัดสต็อกแล้ว" เป็น 10 คอลัมน์

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.title}>รายการคำขอที่รอเบิก-จ่ายสต็อก</h1>

        {isLoading && <p className={styles.infoMessage}>กำลังโหลดข้อมูลรายการคำขอ...</p>}
        {error && !isLoading && <p className={styles.errorMessage}>{error}</p>}

        {!isLoading && !error && (
          <>
            <div className={styles.card}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ลำดับ</th>
                      <th>รหัสคำขอ</th>
                      <th>วันที่ขอ</th>
                      <th>พร้อมตัด / ทั้งหมด</th>
                      <th>ตัดสต็อกแล้ว</th>
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
                        const st = getStatusTranslation(item?.status);
                        const ty = getTypeTranslation(item?.type);
                        const { pending, preparing, delivering, completed, total, deductedSoFar } = getBreakdown(item);
                        const partsSum = pending + preparing + delivering + completed;
                        const consistent = partsSum === total;

                        return (
                          <tr key={item?.request_id ?? item?.request_code ?? `${index}`}>
                            <td className="nowrap">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                            <td className="nowrap">{item?.request_code || '-'}</td>
                            <td className="nowrap">{fmtDate(item?.request_date)}</td>

                            {/* พร้อมตัด / ทั้งหมด = pending / total */}
                            <td className="nowrap">
                              <span className={styles.countPill} title="พร้อมตัด (pending)"> {pending} รายการ</span>
                            </td>
                            {/* ตัดสต็อกแล้ว = preparing + delivering + completed */}
                            <td className="nowrap">
                              <span className={styles.countPill} title="ตัดสต็อกแล้ว (preparing + delivering + completed)">
                                {deductedSoFar} /&nbsp;
                              </span>
                              <span className={styles.countPill} title="ทั้งหมด (อนุมัติแล้ว)"> {total} รายการ</span>
                            </td>

                            <td>{item?.requester || item?.user_name || '-'}</td>
                            <td>{item?.department || item?.department_name || '-'}</td>
                            <td className="nowrap">{ty}</td>
                            <td className="nowrap">
                              <span className={`${styles.statusBadge} ${st.class}`}>{st.text}</span>
                            </td>
                            <td className="nowrap">
                              <button
                                className={`${styles.button} ${styles.primaryButton}`}
                                onClick={() => handleDeductStockClick(item?.request_id)}
                                disabled={!item?.request_id}
                                title={pending > 0 ? 'ดำเนินการเบิก-จ่าย' : 'ดูรายละเอียด'}
                              >
                                {pending > 0 ? '📦 ดำเนินการเบิก-จ่าย' : '🔎 ดูรายละเอียด'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={colSpan} className={styles.emptyRow}>
                          ไม่พบรายการคำขอที่รอการเบิก-จ่ายสต็อกในขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                title="ก่อนหน้า"
              >
                ⬅️ ก่อนหน้า
              </button>

              <span>หน้า {currentPage} / {totalPages}</span>

              <button
                className={styles.pageButton}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                title="ถัดไป"
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
