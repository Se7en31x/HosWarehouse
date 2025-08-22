'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import {
  FaSearch, FaSync, FaChevronLeft, FaChevronRight,
  FaPlus, FaEye
} from 'react-icons/fa';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// Config
const PAGE_SIZE = 12;

const statusMap = {
  issued: { text: 'บันทึกแล้ว', cls: 'badgeBlue' },
  draft: { text: 'ฉบับร่าง', cls: 'badgeGray' },
  waiting_approval: { text: 'รออนุมัติ', cls: 'badgeYellow' },
  approved: { text: 'อนุมัติแล้ว', cls: 'badgeGreen' },
  rejected: { text: 'ไม่อนุมัติ', cls: 'badgeRed' },
  canceled: { text: 'ยกเลิก', cls: 'badgeRed' },
};

const thb = (v) =>
  (Number(v) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = statusMap[status] || { text: status || '-', cls: 'badgeGray' };
  return <span className={`${styles.statusBadge} ${styles[map.cls]}`}>{map.text}</span>;
}

export default function POListPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // ── filters/state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState(sp.get('q') || '');
  const [status, setStatus] = useState(sp.get('status') || 'all');
  const [startDate, setStartDate] = useState(sp.get('start') || '');
  const [endDate, setEndDate] = useState(sp.get('end') || '');
  const [page, setPage] = useState(Number(sp.get('page') || 1));

  // ── fetch list
  const fetchList = async (silent = false) => {
    !silent ? setLoading(true) : setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status && status !== 'all') params.set('status', status);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));

      const res = await axiosInstance.get(`/po?${params.toString()}`);

      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'โหลดรายการ PO ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    params.set('page', String(page));
    router.replace(`/purchasing/po?${params.toString()}`);

    fetchList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, startDate, endDate, page]);

  // ── derived
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // เติมแถวว่างให้ครบ 12
  const displayRows = [...rows];
  while (displayRows.length < PAGE_SIZE) displayRows.push({ _placeholder: true });

  // หมายเลขหน้าแบบมี …
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
    }
    return pages;
  };

  // ── handlers
  const onResetFilters = () => {
    setQ('');
    setStatus('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const onCreatePO = () => router.push('/purchasing/po/create');

  // ── UI
  return (
    <div className={styles.pageBackground}>
      <div className={styles.frame}>
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header}>
            <h1 className={styles.title}>รายการใบสั่งซื้อ (PO)</h1>
            <div className={styles.headerActions}>
              <button className={styles.btnPrimary} onClick={onCreatePO}>
                <FaPlus /> สร้าง PO ใหม่
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filterCard}>
            <h2 className={styles.subTitle}>ตัวกรอง</h2>
            <div className={styles.filters}>
              <div className={styles.filterRow}>
                <div className={styles.filterItem}>
                  <label className={styles.label}>ค้นหา</label>
                  <div className={styles.inputWithIcon}>
                    <FaSearch />
                    <input
                      className={styles.input}
                      value={q}
                      onChange={(e) => {
                        setPage(1);
                        setQ(e.target.value);
                      }}
                      placeholder="เลขที่ PO / ชื่อผู้ขาย"
                    />
                  </div>
                </div>

                <div className={styles.filterItem}>
                  <label className={styles.label}>สถานะ</label>
                  <select
                    className={styles.input}
                    value={status}
                    onChange={(e) => {
                      setPage(1);
                      setStatus(e.target.value);
                    }}
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="issued">บันทึกแล้ว</option>
                    <option value="draft">ฉบับร่าง</option>
                    <option value="waiting_approval">รออนุมัติ</option>
                    <option value="approved">อนุมัติแล้ว</option>
                    <option value="rejected">ไม่อนุมัติ</option>
                    <option value="canceled">ยกเลิก</option>
                  </select>
                </div>

                <div className={styles.filterItem}>
                  <label className={styles.label}>ตั้งแต่วันที่</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={startDate}
                    onChange={(e) => {
                      setPage(1);
                      setStartDate(e.target.value);
                    }}
                  />
                </div>

                <div className={styles.filterItem}>
                  <label className={styles.label}>ถึงวันที่</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={endDate}
                    onChange={(e) => {
                      setPage(1);
                      setEndDate(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className={styles.filterActions}>
                <button className={styles.btnGhost} onClick={() => fetchList(true)} disabled={refreshing}>
                  <FaSync /> รีเฟรช
                </button>
                <button className={styles.btnSecondary} onClick={onResetFilters}>
                  ล้างตัวกรอง
                </button>
              </div>
            </div>
          </div>

          {/* Result Head */}
          <div className={styles.cardHead}>
            <h2 className={styles.subTitle}>ผลการค้นหา</h2>
            <div className={styles.resultInfo}>
              {loading ? 'กำลังโหลด...' : `ทั้งหมด ${total.toLocaleString('th-TH')} รายการ`}
            </div>
          </div>

          {/* Table (Grid style) */}
          <div className={styles.tableFrame}>
            {(refreshing || loading) && (
              <div className={styles.tableLoadingOverlay}>
                <div className={styles.spinner} />
              </div>
            )}

            {/* Header */}
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>เลขที่ PO</div>
              <div className={styles.headerItem}>วันที่</div>
              <div className={styles.headerItem}>ผู้ขาย</div>
              <div className={styles.headerItem}>PR No.</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.right}`}>ยอดรวม (฿)</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>การทำงาน</div>
            </div>

            {/* Body */}
            <div className={styles.inventory} style={{ '--rows-per-page': PAGE_SIZE }}>
              {(!loading && rows.length === 0) ? (
                <div className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div className={styles.tableCell} style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                    ไม่พบรายการ
                  </div>
                </div>
              ) : (
                displayRows.map((r, idx) => {
                  const placeholder = !!r._placeholder;
                  return (
                    <div
                      key={placeholder ? `p-${page}-${idx}` : r.po_id}
                      className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ''}`}
                    >
                      <div className={styles.tableCell}>{placeholder ? '' : (r.po_no || '-')}</div>
                      <div className={styles.tableCell}>
                        {placeholder ? '' : (r.po_date ? new Date(r.po_date).toLocaleDateString('th-TH') : '-')}
                      </div>
                      <div className={styles.tableCell}>{placeholder ? '' : (r.vendor_name || '-')}</div>
                      <div className={styles.tableCell}>{placeholder ? '' : (r.pr_no || '-')}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {placeholder ? '' : <StatusBadge status={r.status} />}
                      </div>
                      <div className={`${styles.tableCell} ${styles.right}`}>
                        {placeholder ? '' : thb(r.total_amount)}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {!placeholder && (
                          <Link href={`/purchasing/po/${r.po_id}`} className={styles.detailButton} title="ดูรายละเอียด">
                            <FaEye /> <span>ดูรายละเอียด</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <FaChevronLeft />
                </button>
              </li>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <li key={`e-${i}`} className={styles.ellipsis}>…</li>
                ) : (
                  <li key={`p-${p}`}>
                    <button
                      className={`${styles.pageButton} ${p === page ? styles.activePage : ''}`}
                      onClick={() => setPage(p)}
                      disabled={loading}
                    >
                      {p}
                    </button>
                  </li>
                )
              )}
              <li>
                <button
                  className={styles.pageButton}
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <FaChevronRight />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
