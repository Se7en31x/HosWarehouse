'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

/* ---------- Utilities ---------- */
const statusMap = {
  // รวม/คำขอ
  approved_all: 'อนุมัติทั้งหมด',
  approved_partial: 'อนุมัติบางส่วน',
  waiting_approval: 'รอการอนุมัติ',
  rejected_all: 'ปฏิเสธทั้งหมด',
  canceled: 'ยกเลิกคำขอ',

  // รายการย่อยตอนอนุมัติ
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',
  waiting_approval_detail: 'รออนุมัติ (รายการ)',

  // ดำเนินการ (processing)
  approved_in_queue: 'รอดำเนินการ',
  pending: 'กำลังดำเนินการ',
  preparing: 'กำลังจัดเตรียมพัสดุ',
  delivering: 'อยู่ระหว่างการนำส่ง',
  completed: 'เสร็จสิ้น',
  partially_processed: 'ดำเนินการบางส่วน',
  no_approved_for_processing: 'ยังไม่มีรายการอนุมัติให้ดำเนินการ',
  unknown_processing_state: 'สถานะดำเนินการไม่ทราบ',

  // อื่น ๆ / คืน
  imported: 'นำเข้าแล้ว',
  returned_complete: 'คืนครบ',
  returned_partially: 'คืนบางส่วน',
  moved: 'โอนย้ายสำเร็จ',
  adjusted: 'ปรับปรุงสำเร็จ',
  scrapped: 'ยกเลิก/ชำรุด',

  // ทั่วไป
  'N/A': 'N/A',
  null: 'ยังไม่ระบุ',
  unknown_status: 'สถานะไม่ทราบ',

  returned: 'คืนสำเร็จ',
  returned_complete: 'คืนครบ',
  returned_partially: 'คืนบางส่วน',
  damaged: 'คืน/ชำรุด',
  lost: 'สูญหาย',
  overdue_return: 'คืนล่าช้า',
};

const getTranslatedStatus = (status) => {
  if (status == null || status === '') return 'ยังไม่ระบุ';
  return statusMap[status] || status;
};

const getStatusTone = (key) => {
  switch (key) {
    case 'approved_all':
    case 'approved_partial':
    case 'approved':
    case 'adjusted':
      return 'Green';
    case 'waiting_approval':
    case 'waiting_approval_detail':
    case 'approved_in_queue':
    case 'returned_partially':   // 🆕 ครอบไว้ในโทนเหลือง
      return 'Yellow';
    case 'completed':
    case 'imported':
    case 'returned_complete':
    case 'moved':
      return 'Blue';
    case 'rejected_all':
    case 'rejected':
    case 'canceled':
    case 'scrapped':
      return 'Red';
    default:
      return 'Gray';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return (
      date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Bangkok',
      }) +
      `, ${date.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Bangkok',
      })}`
    );
  } catch {
    return '-';
  }
};

const toThaiRequestMode = (v) => {
  if (!v) return 'เบิก';
  const s = String(v).toLowerCase();
  return s === 'borrow' || s === 'ยืม' ? 'ยืม' : 'เบิก';
};

const StatusPill = ({ value }) => {
  const key = value ?? 'unknown_status';
  const tone = getStatusTone(key);
  return (
    <span className={`${styles.badge} ${styles[`badge${tone}`]}`}>
      {getTranslatedStatus(key)}
    </span>
  );
};
/* ---------- End Utilities ---------- */

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = params?.transactionId;

  const searchParams = useSearchParams();
  const router = useRouter();

  // โหมด STOCK_MOVEMENT: ?move_code=...
  const moveCode = (searchParams?.get('move_code') || '').trim();
  const isStockMode = Boolean(moveCode);

  // รองรับแท็บมุมมอง
  // 🆕 เพิ่ม 'return' สำหรับโหมดคำขอแบบยืม
  const viewParam = (searchParams?.get('view') || '').toLowerCase();
  const validViews = new Set(['create', 'approval', 'processing', 'return']);
  const activeView = isStockMode ? 'stock' : (validViews.has(viewParam) ? viewParam : 'create');

  // 🆕 รับโค้ดการคืนเพื่อตั้งโฟกัส
  const retFocus = (searchParams?.get('ret') || '').trim(); // ตัวอย่าง: RET-123

  // ========== State ==========
  const [requestData, setRequestData] = useState(null);
  const [stockRows, setStockRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // refs สำหรับเลื่อนไปยังแถวคืนที่โฟกัส
  const returnRowRefs = useRef({});

  // ========== Fetchers ==========
  const fetchRequestDetails = useCallback(async () => {
    if (!requestId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get(`/transaction-history/request/${requestId}`);
      setRequestData(response?.data?.data ?? null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ไม่สามารถโหลดรายละเอียดคำขอเบิกได้');
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายละเอียดคำขอเบิกได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  const fetchStockMovementByCode = useCallback(async () => {
    if (!moveCode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/transaction-history/stock-movement', {
        params: { move_code: moveCode },
      });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      setStockRows(rows);
    } catch (err) {
      console.error('Fetch stock error:', err);
      setError('ไม่สามารถโหลดรายละเอียดการจัดการสต็อกได้');
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดรายละเอียดการจัดการสต็อกได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [moveCode]);

  useEffect(() => {
    if (isStockMode) {
      fetchStockMovementByCode();
    } else {
      fetchRequestDetails();
    }
  }, [isStockMode, fetchRequestDetails, fetchStockMovementByCode]);

  // ========== Derived ==========
  const summary = requestData?.summary || {};
  const history = requestData?.history || { approvalHistory: [], processingHistory: [] };
  const lineItems = requestData?.lineItems || [];
  const returnHistory = requestData?.returnHistory || []; // 🆕 จาก backend

  const requestTypeThai = summary.request_type_thai || toThaiRequestMode(summary.request_type);
  const isBorrow = requestTypeThai === 'ยืม';

  // ========== Focus ไปยังแถวคืนที่ต้องการ ==========
  useEffect(() => {
    if (!isBorrow || !Array.isArray(returnHistory) || returnHistory.length === 0) return;
    if (!retFocus) return;
    // รอให้ DOM วาดตารางก่อนนิดนึง
    const t = setTimeout(() => {
      const el = returnRowRefs.current?.[retFocus];
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add(styles.focusRow);
        setTimeout(() => el.classList.remove(styles.focusRow), 2000);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [isBorrow, returnHistory, retFocus]);

  // ========== Rendering ==========
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
        <p className={styles.loading}>
          {isStockMode ? 'กำลังโหลดรายละเอียดการจัดการสต็อก...' : 'กำลังโหลดรายละเอียดคำขอ...'}
        </p>
      </div>
    );
  }

  if (error || (!isStockMode && !requestData)) {
    return (
      <div className={`${styles.container} ${styles.errorContainer}`}>
        <p>{error || (isStockMode ? 'ไม่พบข้อมูลการจัดการสต็อก' : 'ไม่พบข้อมูลคำขอเบิกที่ระบุ')}</p>
        <button onClick={isStockMode ? fetchStockMovementByCode : fetchRequestDetails} className={styles.retryBtn}>
          ลองโหลดใหม่
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          {isStockMode ? (
            <h1 className={styles.heading}>รายละเอียดการจัดการสต็อก: {moveCode}</h1>
          ) : (
            <h1 className={styles.heading}>รายละเอียดคำขอเบิก: {summary.request_code}</h1>
          )}
          <Link href="/manage/transactionHistory" passHref>
            <button className={styles.backButton}>&larr; กลับ</button>
          </Link>
        </div>

        {/* ===== STOCK MOVEMENT MODE ===== */}
        {isStockMode ? (
          <>
            <h2 className={styles.subHeading}>ภาพรวมการจัดการสต็อก</h2>
            {/* ... (ส่วน stock เดิมของคุณ ไม่เปลี่ยน) ... */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>รหัสพัสดุ</th>
                    <th>ชื่อพัสดุ</th>
                    <th>จำนวน</th>
                    <th>วันเวลา</th>
                    <th>ผู้ทำรายการ</th>
                    <th>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(stockRows) && stockRows.length > 0 ? (
                    stockRows.map((r, idx) => (
                      <tr key={`mv-${idx}`}>
                        <td>{idx + 1}</td>
                        <td>{r.item_id ?? '-'}</td>
                        <td>{r.item_name ?? '-'}</td>
                        <td>{r.move_qty ?? '-'}</td>
                        <td>{formatDate(r.move_date)}</td>
                        <td>{r.user_name ?? '-'}</td>
                        <td>{r.note ?? ''}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className={styles.noDataRow}>
                      <td colSpan={7}>ไม่มีรายการในก้อนนี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* ===== REQUEST MODE ===== */
          <>
            {/* Tabs */}
            <div className={styles.tabBar}>
              <button
                className={`${styles.tabBtn} ${activeView === 'create' ? styles.tabActive : ''}`}
                onClick={() => router.replace(`/manage/transactionHistory/${requestId}?view=create`)}
              >
                สร้างคำขอ
              </button>
              <button
                className={`${styles.tabBtn} ${activeView === 'approval' ? styles.tabActive : ''}`}
                onClick={() => router.replace(`/manage/transactionHistory/${requestId}?view=approval`)}
              >
                การอนุมัติ
              </button>
              <button
                className={`${styles.tabBtn} ${activeView === 'processing' ? styles.tabActive : ''}`}
                onClick={() => router.replace(`/manage/transactionHistory/${requestId}?view=processing`)}
              >
                การดำเนินการ
              </button>
              {isBorrow && (
                <button
                  className={`${styles.tabBtn} ${activeView === 'return' ? styles.tabActive : ''}`}
                  onClick={() => router.replace(`/manage/transactionHistory/${requestId}?view=return`)}
                >
                  การคืน
                </button>
              )}
            </div>

            {/* Summary */}
            <h2 className={styles.subHeading}>ภาพรวมคำขอ</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <strong>รหัสคำขอ:</strong>
                <span>{summary.request_code || '-'}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>ผู้ขอ:</strong>
                <span>{summary.user_name || '-'}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>วันที่ขอ:</strong>
                <span>{formatDate(summary.request_date)}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>แผนก:</strong>
                <span>{summary.department || '-'}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>ประเภทคำขอ:</strong>
                <span className={`${styles.badge} ${styles.badgeGray}`}>
                  {summary.request_type_thai || toThaiRequestMode(summary.request_type)}
                </span>
              </div>
            </div>

            {/* CREATE */}
            {activeView === 'create' && (
              <>
                <h2 className={styles.subHeading}>รายการที่ขอ</h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>รายการพัสดุ</th>
                        <th>หน่วย</th>
                        <th>จำนวนที่ขอ</th>
                        <th>จำนวนที่อนุมัติ</th>
                        <th>สถานะอนุมัติ</th>
                        <th>สถานะดำเนินการ</th>
                        {isBorrow && <th>กำหนดคืน</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(lineItems) && lineItems.length ? (
                        lineItems.map((it, idx) => (
                          <tr key={it.request_detail_id || idx}>
                            <td>{idx + 1}</td>
                            <td>{it.item_name || '-'}</td>
                            <td>{it.item_unit || '-'}</td>
                            <td>{it.requested_qty ?? '-'}</td>
                            <td>{it.approved_qty ?? '-'}</td>
                            <td><StatusPill value={it.approval_status ?? 'unknown_status'} /></td>
                            <td><StatusPill value={it.processing_status ?? 'unknown_processing_state'} /></td>
                            {isBorrow && <td>{formatDate(it.expected_return_date)}</td>}
                          </tr>
                        ))
                      ) : (
                        <tr className={styles.noDataRow}>
                          <td colSpan={isBorrow ? 8 : 7}>ไม่มีรายการในคำขอนี้</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* APPROVAL */}
            {activeView === 'approval' && (
              <>
                <h2 className={styles.subHeading}>ประวัติการอนุมัติ</h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>เวลา/วันที่</th>
                        <th>ผู้อนุมัติ</th>
                        <th>รายการพัสดุ</th>
                        <th>จำนวนที่ขอ</th>
                        <th>จำนวนที่อนุมัติ</th>
                        <th>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(history.approvalHistory) && history.approvalHistory.length > 0 ? (
                        history.approvalHistory.map((item, index) => (
                          <tr key={`appr-${index}`}>
                            <td>{formatDate(item.changed_at)}</td>
                            <td>{item.changed_by_user || '-'}</td>
                            <td>{item.item_name || '-'}</td>
                            <td>{item.requested_qty ?? '-'}</td>
                            <td>{item.approved_qty ?? '-'}</td>
                            <td><StatusPill value={item.new_value} /></td>
                          </tr>
                        ))
                      ) : (
                        <tr className={styles.noDataRow}>
                          <td colSpan={6}>ยังไม่มีประวัติการอนุมัติ</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* PROCESSING */}
            {activeView === 'processing' && (
              <>
                <h2 className={styles.subHeading}>ประวัติการดำเนินการ</h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>เวลา/วันที่</th>
                        <th>ผู้ดำเนินการ</th>
                        <th>รายการพัสดุ</th>
                        <th>สถานะเดิม</th>
                        <th>สถานะใหม่</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(history.processingHistory) && history.processingHistory.length > 0 ? (
                        history.processingHistory.map((item, index) => (
                          <tr key={`proc-${index}`}>
                            <td>{formatDate(item.changed_at)}</td>
                            <td>{item.changed_by_user || '-'}</td>
                            <td>{item.item_name || '-'}</td>
                            <td><StatusPill value={item.old_value} /></td>
                            <td><StatusPill value={item.new_value} /></td>
                          </tr>
                        ))
                      ) : (
                        <tr className={styles.noDataRow}>
                          <td colSpan={5}>ยังไม่มีประวัติการดำเนินการ</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* 🆕 RETURN */}
            {isBorrow && activeView === 'return' && (
              <>
                <h2 className={styles.subHeading}>ประวัติการคืน</h2>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>รหัสคืน</th>
                        <th>วันเวลา</th>
                        <th>ผู้ตรวจรับ</th>
                        <th>พัสดุ</th>
                        <th>หน่วย</th>
                        <th>อนุมัติ</th>
                        <th>คืนครั้งนี้</th>
                        <th>คืนสะสม</th>
                        <th>คงเหลือ</th>
                        <th>สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(returnHistory) && returnHistory.length > 0 ? (
                        returnHistory.map((row, idx) => (
                          <tr
                            key={`ret-${idx}-${row.return_id}-${row.request_detail_id}`}
                            ref={(el) => {
                              // เก็บ ref ตามรหัสคืน (RET-xxx) เพื่อเลื่อนไปหาเมื่อมี ?ret=
                              if (el && row.return_code) {
                                returnRowRefs.current[row.return_code] = el;
                              }
                            }}
                          >
                            <td>{row.return_code}</td>
                            <td>{formatDate(row.return_date)}</td>
                            <td>{row.inspected_by_name || '-'}</td>
                            <td>{row.item_name || '-'}</td>
                            <td>{row.item_unit || '-'}</td>
                            <td>{row.approved_qty ?? 0}</td>
                            <td>{row.returned_this_time ?? 0}</td>
                            <td>{row.returned_total ?? 0}</td>
                            <td>{row.remaining_qty ?? 0}</td>
                            <td><StatusPill value={row.return_status_code} /></td>
                          </tr>
                        ))
                      ) : (
                        <tr className={styles.noDataRow}>
                          <td colSpan={10}>ยังไม่มีประวัติการคืน</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
