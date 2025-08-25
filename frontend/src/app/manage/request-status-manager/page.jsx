'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './page.module.css';

const Select = dynamic(() => import('react-select'), { ssr: false });

/* react-select styles */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    minHeight: '2.5rem',
    borderColor: state.isFocused ? '#2563eb' : '#e5e7eb',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2563eb' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    marginTop: 6,
    border: '1px solid #e5e7eb',
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f1f5ff' : '#fff',
    color: '#111827',
    padding: '8px 12px',
  }),
};

export default function RequestStatusManagerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // ฟิลเตอร์
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const itemsPerPage = 9;

  // แผนที่สถานะ
  const statusMap = {
    waiting_approval: 'รอการอนุมัติ',
    approved_all: 'อนุมัติทั้งหมด',
    rejected_all: 'ปฏิเสธทั้งหมด',
    approved_partial: 'อนุมัติบางส่วน',
    rejected_partial: 'ปฏิเสธบางส่วน',
    approved_partial_and_rejected_partial: 'อนุมัติบางส่วน',
    pending: 'อยู่ระหว่างการดำเนินการ',
    preparing: 'กำลังจัดเตรียม',
    delivering: 'นำส่งแล้ว',
    completed: 'เสร็จสิ้น',
    canceled: 'ยกเลิกคำขอ',
    stock_deducted: 'ตัดสต็อกแล้ว',
  };

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

  const viewOnlyStatuses = ['rejected_all', 'completed', 'canceled', 'stock_deducted'];

  const STATUS_OPTIONS = useMemo(
    () => allowedStatuses.map(v => ({ value: v, label: statusMap[v] || v })),
    []
  );

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const da = new Date(a.request_date).getTime();
      const db = new Date(b.request_date).getTime();
      return db - da;
    });
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedRequests.filter(r => {
      const okStatus = statusFilter === 'all' || r.request_status === statusFilter;
      const okSearch =
        q === '' ||
        r.request_code?.toLowerCase().includes(q) ||
        r.user_name?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q);
      return okStatus && okSearch;
    });
  }, [sortedRequests, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage]);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const statusQuery = allowedStatuses.join(',');
      const res = await axiosInstance.get('/requestStatus', { params: { status: statusQuery } });

      if (!Array.isArray(res.data)) throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');

      // ✅ Normalize ข้อมูล (รองรับทั้ง camelCase / snake_case)
      const normalized = res.data.map(r => ({
        ...r,
        request_type: r.request_type ?? r.requestType ?? '',
        processing_summary: r.processing_summary ?? r.processingSummary ?? '-',
      }));

      setRequests(normalized);
      setCurrentPage(1);
    } catch (err) {
      console.error('โหลดคำขอล้มเหลว', err);
      Swal.fire('ผิดพลาด', 'โหลดคำขอไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setLoading(false);
    }
  }

  const LOCALE_DATE = 'th-TH';
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
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return new Intl.DateTimeFormat(LOCALE_DATE, {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, '...', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '...',totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loading}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>จัดการสถานะคำขอทั้งหมด</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={`${styles.filterGrid} ${styles.filterGridCompact}`}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="status">สถานะ</label>
              <Select
                inputId="status"
                isClearable
                isSearchable={false}
                placeholder="ทุกสถานะ"
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find(o => o.value === statusFilter) || null}
                onChange={(opt) => setStatusFilter(opt?.value || 'all')}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              />
            </div>
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="search">ค้นหา</label>
              <input
                id="search"
                className={styles.input}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="รหัสคำขอ, ชื่อผู้ขอ, แผนก…"
              />
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
              title="ล้างตัวกรอง"
              aria-label="ล้างตัวกรอง"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>รหัสคำขอ</div>
            <div className={styles.headerItem}>ผู้ขอ</div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={styles.headerItem}>วันที่/เวลา</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={styles.headerItem}>สำเร็จ</div>
            <div className={styles.headerItem}>วันที่นำส่ง</div>
            <div className={styles.headerItem}>สถานะปัจจุบัน</div>
            <div className={styles.headerItem}>จัดการ</div>
          </div>

          <div className={styles.inventory} style={{ '--rows-per-page': itemsPerPage }}>
            {currentItems.length > 0 ? (
              currentItems.map((r) => {
                const statusKey = r.request_status;
                const label = statusMap[statusKey] || statusKey || 'ไม่ทราบสถานะ';
                const badgeClass = styles[statusToClass[statusKey]] || styles[statusToClass.__default];

                const typeLabel = String(r.request_type).toLowerCase() === 'borrow' ? 'ยืม' : 'เบิก';

                return (
                  <div key={r.request_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{r.request_code}</div>
                    <div className={styles.tableCell}>{r.user_name}</div>
                    <div className={styles.tableCell}>{r.department}</div>
                    <div className={styles.tableCell}>
                      {formatDate(r.request_date)} {formatTime(r.request_date)}
                    </div>
                    <div className={styles.tableCell}>
                      <span className={styles.badgeGray}>{typeLabel}</span>
                    </div>
                    <div className={styles.tableCell}>
                      {r.processing_summary}
                    </div>
                    <div className={styles.tableCell}>
                      {r.request_due_date ? formatDate(r.request_due_date) : '-'}
                    </div>
                    <div className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${badgeClass}`}>{label}</span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <Link href={`/manage/request-status-manager/${r.request_id}`}>
                        <button
                          className={`${styles.manageBtn} ${viewOnlyStatuses.includes(statusKey) ? styles.viewOnlyBtn : ''}`}
                          title={viewOnlyStatuses.includes(statusKey) ? 'ดูรายละเอียดคำขอนี้' : 'จัดการสถานะคำขอนี้'}
                        >
                          {viewOnlyStatuses.includes(statusKey) ? 'ดูรายละเอียด' : 'จัดการสถานะ'}
                        </button>
                      </Link>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.noDataMessage}>
                {requests.length === 0 ? 'ยังไม่มีคำขอในระบบสำหรับสถานะที่แสดง' : 'ไม่พบคำขอในหน้าปัจจุบัน'}
              </div>
            )}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="หน้าก่อนหน้า"
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                aria-label="หน้าถัดไป"
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
