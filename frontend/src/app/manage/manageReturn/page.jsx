'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import dynamic from 'next/dynamic';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

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

// helper: format date TH → ใช้เลขอารบิกทั้งหมด
const fdate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return '-';
  return new Intl.DateTimeFormat("th-TH-u-nu-latn", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

export default function ManageReturnPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const limit = 12;
  const abortRef = useRef(null);

  const menuPortalTarget = useMemo(
    () => (typeof window !== 'undefined' ? document.body : null),
    []
  );

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
      const res = await axiosInstance.get('/manage/returns/queue', {
        params: { q: debouncedQ, status, page, limit },
        signal: controller.signal,
      });
      setRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
      setTotalPages(Number(res?.data?.totalPages) || 1);
    } catch (e) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error(e);
      setErr('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, status, page]);

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
    else if (currentPage <= 4)
      pages.push(1, 2, 3, 4, 5, '...', total);
    else if (currentPage >= total - 3)
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    else
      pages.push(
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        total
      );
    return pages;
  };

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
                isClearable={false} // ❌ ปิด clear ได้ เพื่อไม่ให้ค่ากลับไปเป็น null
                isSearchable={false}
                placeholder="เลือกสถานะ"
                options={STATUS_OPTS} // ✅ ไม่ต้อง filter ออก
                value={STATUS_OPTS.find((o) => o.value === status) || STATUS_OPTS[0]}
                onChange={(opt) => {
                  setStatus(opt?.value || 'all');
                  setPage(1);
                }}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget || undefined}
              />

            </div>
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="q">ค้นหา</label>
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
          <div className={styles.loadingContainer}>กำลังโหลด...</div>
        ) : err ? (
          <div className={styles.errorBox}>{err}</div>
        ) : (
          <div className={styles.tableFrame}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>รหัสคำขอ</div>
              <div className={styles.headerItem}>ผู้ขอ</div>
              <div className={styles.headerItem}>แผนก</div>
              <div className={styles.headerItem}>ครบกำหนด (เร็วที่สุด)</div>
              <div className={styles.headerItem}>สถานะกำหนดคืน</div>
              <div className={styles.headerItem}>คืนแล้ว</div>
              <div className={styles.headerItem}>การดำเนินการ</div>
            </div>

            <div className={styles.inventory} style={{ '--rows-per-page': 12 }}>
              {rows.length ? (
                rows.map((r) => {
                  return (
                    <div
                      key={r.request_id}
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                    >
                      <div className={styles.tableCell}>{r.request_code}</div>
                      <div className={styles.tableCell}>{r.requester_name}</div>
                      <div className={styles.tableCell}>{r.department}</div>
                      <div className={styles.tableCell}>
                        {fdate(r.earliest_due_date)}
                      </div>
                      <div className={styles.tableCell}>
                        {r.items_overdue > 0 ? (
                          <span className={`${styles.badge} ${styles.badgeOverdue}`}>
                            เกินกำหนด {r.items_overdue} รายการ
                          </span>
                        ) : r.items_due_soon > 0 ? (
                          <span className={`${styles.badge} ${styles.badgeDueSoon}`}>
                            ใกล้ครบ {r.items_due_soon} รายการ
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeNormal}`}>
                            ปกติ 0 รายการ
                          </span>
                        )}
                      </div>
                      <div className={styles.tableCell}>
                        {r.returned_items ?? 0}/{r.total_items ?? 0}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <Link
                          href={`/manage/manageReturn/${r.request_id}`}
                          className={styles.actionBtnLink}
                        >
                          จัดการ
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.noDataMessage}>ไม่พบรายการ</div>
              )}
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
                    <li key={idx} className={styles.ellipsis}>
                      …
                    </li>
                  ) : (
                    <li key={idx}>
                      <button
                        className={`${styles.pageButton} ${p === page ? styles.activePage : ''
                          }`}
                        onClick={() => setPage(p)}
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
        )}
      </div>
    </div>
  );
}
