'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // สถานะ “รายการย่อย” ตอนอนุมัติ
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

  // อื่น ๆ
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

// แปลงโหมดคำขอ → ไทย (fallback ใช้เมื่อ backend ไม่ได้ส่ง *_thai มา)
const toThaiRequestMode = (v) => {
  if (!v) return 'เบิก';
  const s = String(v).toLowerCase();
  return s === 'borrow' || s === 'ยืม' ? 'ยืม' : 'เบิก';
};

// Pill สถานะ
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

  // โหมด STOCK_MOVEMENT: หากมี ?move_code=...
  const moveCode = (searchParams?.get('move_code') || '').trim();
  const isStockMode = Boolean(moveCode);

  // รองรับ ?view=create | approval | processing (เฉพาะโหมดคำขอ)
  const viewParam = (searchParams?.get('view') || '').toLowerCase();
  const validViews = new Set(['create', 'approval', 'processing']);
  const activeView = isStockMode ? 'stock' : (validViews.has(viewParam) ? viewParam : 'create');

  // ========== State ==========
  // โหมดคำขอ
  const [requestData, setRequestData] = useState(null);
  // โหมดสต็อก
  const [stockRows, setStockRows] = useState([]);
  // common
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // ========== Derived data ==========
  const summary = requestData?.summary || {};
  const history = requestData?.history || { approvalHistory: [], processingHistory: [] };
  const lineItems = requestData?.lineItems || [];
  const requestTypeThai = summary.request_type_thai || toThaiRequestMode(summary.request_type);
  const showReturnCol = requestTypeThai === 'ยืม';

  const createColsCount = showReturnCol ? 8 : 7;
  const approvalColsCount = 6;
  const processingColsCount = 5;

  // สำหรับโหมด STOCK: คำนวณสรุปเบื้องต้น
  const stockMeta = useMemo(() => {
    if (!isStockMode) return null;
    if (!Array.isArray(stockRows) || stockRows.length === 0) {
      return { totalItems: 0, totalQty: 0, firstAt: null, lastAt: null, actor: null };
    }
    const totalItems = stockRows.length;
    const totalQty = stockRows.reduce((s, r) => s + (Number(r?.move_qty) || 0), 0);
    const sorted = [...stockRows].sort(
      (a, b) => new Date(a.move_date).getTime() - new Date(b.move_date).getTime()
    );
    const firstAt = sorted[0]?.move_date || null;
    const lastAt = sorted[sorted.length - 1]?.move_date || null;
    // ผู้ทำรายการ: ถ้าหลายคนให้แสดง "หลายคน"
    const uniqueUsers = Array.from(new Set(stockRows.map(r => (r?.user_name || '').trim()).filter(Boolean)));
    const actor = uniqueUsers.length <= 1 ? (uniqueUsers[0] || '-') : 'หลายคน';
    return { totalItems, totalQty, firstAt, lastAt, actor };
  }, [isStockMode, stockRows]);

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
            {/* Summary */}
            <h2 className={styles.subHeading}>ภาพรวมการจัดการสต็อก</h2>
            <div className={styles.detailGrid}>
              <div className={styles.detailItem}>
                <strong>รหัสก้อน:</strong>
                <span>{moveCode}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>จำนวนรายการ:</strong>
                <span>{stockMeta?.totalItems ?? 0} รายการ</span>
              </div>
              <div className={styles.detailItem}>
                <strong>จำนวนรวม:</strong>
                <span>{stockMeta?.totalQty ?? 0}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>เวลาเริ่ม:</strong>
                <span>{formatDate(stockMeta?.firstAt)}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>เวลาสิ้นสุด:</strong>
                <span>{formatDate(stockMeta?.lastAt)}</span>
              </div>
              <div className={styles.detailItem}>
                <strong>ผู้ทำรายการ:</strong>
                <span>{stockMeta?.actor ?? '-'}</span>
              </div>
            </div>

            {/* Table */}
            <h2 className={styles.subHeading}>รายละเอียดรายการ</h2>
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
          /* ===== REQUEST MODE (เดิม) ===== */
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
                <span className={`${styles.badge} ${styles.badgeGray}`}>{summary.request_type_thai || toThaiRequestMode(summary.request_type)}</span>
              </div>
            </div>

            {/* CREATE view */}
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
                        {requestTypeThai === 'ยืม' && <th>กำหนดคืน</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.length ? (
                        lineItems.map((it, idx) => (
                          <tr key={it.request_detail_id || idx}>
                            <td>{idx + 1}</td>
                            <td>{it.item_name || '-'}</td>
                            <td>{it.item_unit || '-'}</td>
                            <td>{it.requested_qty ?? '-'}</td>
                            <td>{it.approved_qty ?? '-'}</td>
                            <td><StatusPill value={it.approval_status ?? 'unknown_status'} /></td>
                            <td><StatusPill value={it.processing_status ?? 'unknown_processing_state'} /></td>
                            {requestTypeThai === 'ยืม' && <td>{formatDate(it.expected_return_date)}</td>}
                          </tr>
                        ))
                      ) : (
                        <tr className={styles.noDataRow}>
                          <td colSpan={requestTypeThai === 'ยืม' ? 8 : 7}>ไม่มีรายการในคำขอนี้</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* APPROVAL view */}
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

            {/* PROCESSING view */}
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
          </>
        )}
      </div>
    </div>
  );
}
