'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { manageAxios } from '@/app/utils/axiosInstance';
import dynamic from 'next/dynamic';
import { Trash2, ChevronLeft, ChevronRight, Settings, Search } from 'lucide-react';

const Select = dynamic(() => import('react-select'), { ssr: false });

const STATUS_OPTS = [
  { value: 'all', label: 'ทั้งหมดที่ค้างคืน' },
  { value: 'due_soon', label: 'ใกล้ครบกำหนด' },
  { value: 'overdue', label: 'เกินกำหนด' },
  { value: 'borrowed', label: 'รอการคืน' },
];

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
    border: '1px solid #e5e7eb',
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

// helper: format date TH → ใช้เลขอารบิกทั้งหมด
const fdate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return '-';
  return new Intl.DateTimeFormat('th-TH-u-nu-latn', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dt);
};

const statusMap = {
  borrowed: 'รอการคืน',
  due_soon: 'ใกล้ครบกำหนด',
  overdue: 'เกินกำหนด',
  returned_all: 'คืนครบแล้ว',
  returned_partial: 'คืนบางส่วน',
  waiting_return: 'รอการคืน',
  canceled: 'ยกเลิก',
  all: 'ทั้งหมดที่ค้างคืน',
};

const statusClass = (status) => {
  switch (status) {
    case 'overdue': return 'stOverdue';
    case 'due_soon': return 'stDueSoon';
    case 'borrowed': return 'stBorrowed';
    case 'waiting_return': return 'stWaiting';
    case 'returned_all': return 'stReturnedAll';
    case 'returned_partial': return 'stReturnedPartial';
    case 'canceled': return 'stCanceled';
    default: return 'stNormal';
  }
};

export default function ManageReturnPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(null); // ถ้า API ส่งมาจะโชว์ “จาก N”
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const limit = 12; // แถวต่อหน้า (ล็อคให้คงที่)
  const abortRef = useRef(null);

  const menuPortalTarget = useMemo(
    () => (typeof window !== 'undefined' ? document.body : null),
    []
  );

  // auto-focus ช่องค้นหา
  useEffect(() => {
    const el = document.getElementById('q');
    el?.focus();
  }, []);

  // debounce 400ms
  const dq = useMemo(() => q.trim().toLowerCase(), [q]);
  const [debouncedQ, setDebouncedQ] = useState(dq);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(dq), 400);
    return () => clearTimeout(t);
  }, [dq]);

  const fetchData = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErr('');
    try {
      const res = await manageAxios.get('/manage/returns/queue', {
        params: { q: debouncedQ, status, page, limit },
        signal: controller.signal,
      });
      const payload = res?.data || {};
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
      setTotalPages(Number(payload.totalPages) || 1);
      setTotalItems(
        Number.isFinite(Number(payload.totalItems)) ? Number(payload.totalItems) : null
      );
    } catch (e) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error(e);
      setErr('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [debouncedQ, status, page]);

  // clamp หน้าเมื่อจำนวนหน้าลดลง (ป้องกันหลุดหน้า)
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages || 1));
  }, [totalPages]);

  const clearFilters = () => {
    setQ('');
    setStatus('all');
    setPage(1);
    setDebouncedQ('');
  };

  const getPageNumbers = () => {
    const total = totalPages;
    const currentPage = page;
    const pages = [];
    if (total <= 7) for (let i = 1; i <= total; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', total);
    else if (currentPage >= total - 3)
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', total);
    return pages;
  };

  // เติมแถวว่างให้ครบ 12 เสมอ
  const fillersCount = Math.max(0, limit - (rows?.length || 0));
  const FillerRow = ({ i }) => (
    <div className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`} aria-hidden="true" key={`filler-${i}`}>
      {Array.from({ length: 7 }).map((_, j) => (
        <div className={styles.tableCell} key={j}>&nbsp;</div>
      ))}
    </div>
  );

  // ช่วงข้อมูลที่แสดง
  const startDisplay = rows.length ? (page - 1) * limit + 1 : 0;
  const endDisplay = (page - 1) * limit + rows.length;

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>คำขอที่มีการยืม (สำหรับตรวจรับคืน)</h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={`${styles.filterGrid} ${styles.filterGridCompact}`}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="status">สถานะ</label>
              <Select
                inputId="status"
                isClearable={false}
                isSearchable={false}
                placeholder="เลือกสถานะ"
                options={STATUS_OPTS}
                value={STATUS_OPTS.find((o) => o.value === status) || STATUS_OPTS[0]}
                onChange={(opt) => {
                  setStatus(opt?.value || 'all');
                  setPage(1);
                }}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget || undefined}
                aria-label="เลือกสถานะการคืน"
              />
            </div>
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.inputIcon} />
              <input
                id="q"
                className={styles.input}
                type="text"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="รหัสคำขอ, ชื่อผู้ขอ, แผนก, รายการพัสดุ…"
                aria-label="ค้นหาด้วยรหัสคำขอ, ชื่อผู้ขอ, แผนก, หรือรายการพัสดุ"
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
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.infoMessage}>กำลังโหลด...</p>
          </div>
        ) : err ? (
          <div className={styles.noDataMessage} style={{ color: 'var(--danger)' }}>
            {err}
          </div>
        ) : (
          <div className={styles.tableFrame}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>รหัสคำขอ</div>
              <div className={styles.headerItem}>ผู้ขอ</div>
              <div className={styles.headerItem}>แผนก</div>
              <div className={styles.headerItem}>ครบกำหนด (เร็วที่สุด)</div>
              <div className={`${styles.headerItem} ${styles.centerHeader}`}>สถานะกำหนดคืน</div>
              <div className={styles.headerItem}>คืนแล้ว</div>
              <div className={`${styles.headerItem} ${styles.centerHeader}`}>การดำเนินการ</div>
            </div>

            <div className={styles.inventory} style={{ '--rows-per-page': limit }}>
              {rows.length ? (
                <>
                  {rows.map((r) => {
                    const statusKey =
                      r.items_overdue > 0 ? 'overdue' :
                      r.items_due_soon > 0 ? 'due_soon' : 'borrowed';
                    const label =
                      r.items_overdue > 0 ? `เกินกำหนด ${r.items_overdue} รายการ` :
                      r.items_due_soon > 0 ? `ใกล้ครบ ${r.items_due_soon} รายการ` : 'ปกติ';
                    return (
                      <div key={r.request_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                        <div className={styles.tableCell}>{r.request_code}</div>
                        <div className={styles.tableCell}>{r.requester_name}</div>
                        <div className={styles.tableCell}>{r.department}</div>
                        <div className={styles.tableCell}>{fdate(r.earliest_due_date)}</div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          <span className={`${styles.stBadge} ${styles[statusClass(statusKey)]}`}>{label}</span>
                        </div>
                        <div className={styles.tableCell}>
                          {r.returned_items ?? 0}/{r.total_items ?? 0}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          <Link href={`/manage/manageReturn/${r.request_id}`}>
                            <button className={styles.actionButton} title="จัดการการคืน" aria-label="จัดการการคืน">
                              <Settings size={16} /> จัดการ
                            </button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {Array.from({ length: fillersCount }).map((_, i) => <FillerRow i={i} key={i} />)}
                </>
              ) : (
                <div className={styles.noDataMessage}>ไม่พบรายการ</div>
              )}
            </div>

            {/* แถบสรุป + ตัวควบคุมหน้า */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                {totalItems != null
                  ? <>กำลังแสดง {startDisplay}-{endDisplay} จาก {totalItems} รายการ</>
                  : <>กำลังแสดง {startDisplay}-{endDisplay} (หน้า {page}/{totalPages})</>}
              </div>
              {totalPages > 1 && (
                <ul className={styles.paginationControls}>
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
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
                          className={`${styles.pageButton} ${p === page ? styles.activePage : ''}`}
                          onClick={() => setPage(p)}
                          aria-label={`ไปยังหน้า ${p}`}
                          aria-current={p === page ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      </li>
                    )
                  )}
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label="หน้าถัดไป"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
