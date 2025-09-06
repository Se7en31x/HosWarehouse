'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { manageAxios } from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';
import { Trash2, ChevronLeft, ChevronRight, Settings, Eye, Search } from 'lucide-react';
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
    zIndex: 20,
    width: '100%',
    maxWidth: '250px',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    marginTop: 6,
    boxShadow: 'none',
    border: '1px solid #e5e7eb',   // ✅ รวมเป็นสตริงเดียว
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f1f5ff' : '#fff',
    color: '#111827',
    padding: '8px 12px',
    textAlign: 'left',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af' }),
  singleValue: (base) => ({ ...base, textAlign: 'left' }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

/* ===== helpers ===== */
const stableKey = (r) => {
  const base =
    r?.request_id ??
    r?.request_code ??
    `${r?.user_name || 'user'}-${r?.request_date || 'time'}`;
  return `req-${String(base)}`;
};

const getStamp = (r) => {
  const cands = [r?.updated_at, r?.request_date, r?.created_at];
  for (const c of cands) {
    const t = new Date(c || 0).getTime();
    if (!Number.isNaN(t) && t > 0) return t;
  }
  return 0;
};

/** ตัดซ้ำทั้งก้อนด้วย id/รหัสคำขอ เลือกตัวที่ timestamp ใหม่สุด */
const dedupeByIdLatest = (list) => {
  const m = new Map(); // id -> latest item
  for (const it of list) {
    const id =
      it?.request_id ??
      it?.request_code ??
      `${it?.user_name || 'user'}-${it?.request_date || 'time'}`;
    const t = getStamp(it);
    const prev = m.get(id);
    if (!prev || t >= getStamp(prev)) m.set(id, it);
  }
  return Array.from(m.values());
};

export default function RequestStatusManagerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ตารางต้องสูงเท่ากับจำนวนนี้เสมอ
  const itemsPerPage = 12;

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
    () => allowedStatuses.map((v) => ({ value: v, label: statusMap[v] || v })),
    [] // ค่าคงที่
  );

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    try {
      const statusQuery = allowedStatuses.join(',');
      const res = await manageAxios.get('/requestStatus', { params: { status: statusQuery } });
      if (!Array.isArray(res.data)) throw new Error('รูปแบบข้อมูลไม่ถูกต้อง');

      const normalized = res.data.map((r) => ({
        ...r,
        request_type: r.request_type ?? r.requestType ?? '',
        processing_summary: r.processing_summary ?? r.processingSummary ?? '-',
      }));

      setRequests(normalized);
      setCurrentPage(1);
      setDataError(null);
    } catch (err) {
      console.error('โหลดคำขอล้มเหลว', err);
      setDataError('โหลดคำขอไม่สำเร็จ กรุณาลองใหม่');
      Swal.fire('ผิดพลาด', 'โหลดคำขอไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setLoading(false);
    }
  }

  /* ===== pipeline: sort → filter → dedupe(global) → paginate → pad to 12 ===== */

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      const da = getStamp(a);
      const db = getStamp(b);
      return db - da;
    });
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedRequests.filter((r) => {
      const okStatus = statusFilter === 'all' || r.request_status === statusFilter;
      const okSearch =
        q === '' ||
        r.request_code?.toLowerCase().includes(q) ||
        r.user_name?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q);
      return okStatus && okSearch;
    });
  }, [sortedRequests, search, statusFilter]);

  const uniqueRequests = useMemo(() => dedupeByIdLatest(filteredRequests), [filteredRequests]);

  const totalPages = Math.max(1, Math.ceil(uniqueRequests.length / itemsPerPage));

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return uniqueRequests.slice(start, start + itemsPerPage);
  }, [uniqueRequests, currentPage]);

  // เติมแถวว่างให้ครบ itemsPerPage เสมอ (ตารางสูงคงที่)
  const fillersCount = Math.max(0, itemsPerPage - (currentItems?.length || 0));

  /* ===== utils ===== */
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
    else if (currentPage >= totalPages - 3)
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loading}>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // ช่วงข้อมูลที่แสดง (info bar) — อิงชุดหลัง dedupe
  const startIndex = (currentPage - 1) * itemsPerPage;
  const startDisplay = uniqueRequests.length ? startIndex + 1 : 0;
  const endDisplay = Math.min(startIndex + currentItems.length, uniqueRequests.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>จัดการสถานะคำขอทั้งหมด</h1>
          </div>
        </div>

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
                value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
                onChange={(opt) => setStatusFilter(opt?.value || 'all')}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              />
            </div>
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.inputIcon} />
              <input
                id="search"
                className={styles.input}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="รหัสคำขอ, ชื่อผู้ขอ, แผนก…"
                aria-label="ค้นหาด้วยรหัสคำขอ, ชื่อผู้ขอ, หรือแผนก"
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

        <div className={styles.tableFrame}>
          {dataError ? (
            <div className={styles.noDataMessage}>{dataError}</div>
          ) : (
            <>
              <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                <div className={styles.headerItem}>รหัสคำขอ</div>
                <div className={styles.headerItem}>ผู้ขอ</div>
                <div className={styles.headerItem}>แผนก</div>
                <div className={styles.headerItem}>วันที่/เวลา</div>
                <div className={styles.headerItem}>ประเภท</div>
                <div className={styles.headerItem}>สำเร็จ</div>
                <div className={styles.headerItem}>วันที่นำส่ง</div>
                <div className={`${styles.headerItem} ${styles.centerHeader}`}>สถานะ</div>
                <div className={`${styles.headerItem} ${styles.centerHeader}`}>การดำเนินการ</div>
              </div>

              {/* คุมความสูงด้วย --rows-per-page และเติม filler ให้ครบ 12 */}
              <div className={styles.inventory} style={{ '--rows-per-page': `${itemsPerPage}` }}>
                {currentItems.length > 0 ? (
                  <>
                    {currentItems.map((r) => {
                      const statusKey = r.request_status;
                      const label = statusMap[statusKey] || statusKey || 'ไม่ทราบสถานะ';
                      const badgeClass =
                        styles[statusToClass[statusKey]] || styles[statusToClass.__default];
                      const typeLabel =
                        String(r.request_type).toLowerCase() === 'borrow' ? 'ยืม' : 'เบิก';
                      return (
                        <div key={stableKey(r)} className={`${styles.tableGrid} ${styles.tableRow}`}>
                          <div className={styles.tableCell}>{r.request_code}</div>
                          <div className={styles.tableCell}>{r.user_name}</div>
                          <div className={styles.tableCell}>{r.department}</div>
                          <div className={styles.tableCell}>
                            {formatDate(r.request_date)} {formatTime(r.request_date)}
                          </div>
                          <div className={styles.tableCell}>{typeLabel}</div>
                          <div className={styles.tableCell}>{r.processing_summary}</div>
                          <div className={styles.tableCell}>
                            {r.request_due_date ? formatDate(r.request_due_date) : '-'}
                          </div>
                          <div className={`${styles.tableCell} ${styles.centerCell}`}>
                            <span className={`${styles.statusBadge} ${badgeClass}`}>{label}</span>
                          </div>
                          <div className={`${styles.tableCell} ${styles.centerCell}`}>
                            <Link href={`/manage/request-status-manager/${r.request_id}`}>
                              <button
                                className={`${styles.manageBtn} ${viewOnlyStatuses.includes(statusKey) ? styles.viewOnlyBtn : ''
                                  }`}
                                title={
                                  viewOnlyStatuses.includes(statusKey)
                                    ? 'ดูรายละเอียดคำขอนี้'
                                    : 'จัดการสถานะคำขอนี้'
                                }
                              >
                                {viewOnlyStatuses.includes(statusKey) ? (
                                  <>
                                    <Eye size={16} /> ดู
                                  </>
                                ) : (
                                  <>
                                    <Settings size={16} /> จัดการ
                                  </>
                                )}
                              </button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}

                    {/* filler rows: ทำให้ครบ 12 เสมอ และ key ไม่ชน */}
                    {Array.from({ length: fillersCount }).map((_, i) => (
                      <div
                        key={`filler-${currentPage}-${i}`}
                        className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                        aria-hidden="true"
                      >
                        <div className={styles.tableCell}>&nbsp;</div>
                        <div className={styles.tableCell}>&nbsp;</div>
                        <div className={styles.tableCell}>&nbsp;</div>
                        <div className={styles.tableCell}>&nbsp;</div>
                        <div className={styles.tableCell}>&nbsp;</div>
                        <div className={styles.tableCell}>&nbsp;</div>
                        <div className={styles.tableCell}>&nbsp;</div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className={styles.noDataMessage}>
                    {requests.length === 0
                      ? 'ยังไม่มีคำขอในระบบสำหรับสถานะที่แสดง'
                      : 'ไม่พบคำขอในหน้าปัจจุบัน'}
                  </div>
                )}
              </div>

              {/* แถบสรุป + ตัวควบคุมหน้า (แสดงเสมอ; disabled เมื่อกดไม่ได้) */}
              <div className={styles.paginationBar}>
                <div className={styles.paginationInfo}>
                  กำลังแสดง {startDisplay}-{endDisplay} จาก {uniqueRequests.length} รายการ
                </div>
                <ul className={styles.paginationControls}>
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="หน้าก่อนหน้า"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </li>
                  {getPageNumbers().map((p, idx) =>
                    p === '...' ? (
                      <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
                    ) : (
                      <li key={`page-${p}-${idx}`}>
                        <button
                          className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                          onClick={() => setCurrentPage(p)}
                          aria-label={`ไปยังหน้า ${p}`}
                          aria-current={p === currentPage ? 'page' : undefined}
                          disabled={totalPages === 1 && p === 1}
                        >
                          {p}
                        </button>
                      </li>
                    )
                  )}
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      aria-label="หน้าถัดไป"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
