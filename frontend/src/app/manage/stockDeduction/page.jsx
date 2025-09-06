'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';
import { manageAxios } from '@/app/utils/axiosInstance';
import styles from './page.module.css';
import { Trash2, ChevronLeft, ChevronRight, Package, Eye, Search } from 'lucide-react';

const Select = dynamic(() => import('react-select'), { ssr: false });

// react-select styles
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

const statusMap = {
  approved_all: { text: 'อนุมัติทั้งหมด', class: styles.statusApproved },
  approved_partial: { text: 'อนุมัติบางส่วน', class: styles.statusPartial },
  approved_partial_and_rejected_partial: { text: 'อนุมัติบางส่วน', class: styles.statusPartial },
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: styles.statusDeducted },
  completed: { text: 'เสร็จสิ้น', class: styles.statusCompleted },
  pending_deduction: { text: 'รอเบิก-จ่าย', class: styles.statusPendingDeduction },
  rejected_all: { text: 'ปฏิเสธทั้งหมด', class: styles.statusRejected },
  canceled: { text: 'ยกเลิก', class: styles.statusCanceled },
};

const typeMap = { borrow: 'ยืม', withdraw: 'เบิก', transfer: 'โอน' };

const getStatusTranslation = (status) =>
  statusMap[status] || {
    text: (status || '').toString().replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
    class: styles.statusDefault || styles.statusPendingDeduction,
  };

const getTypeTranslation = (type) => typeMap[type] || type || '-';

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('th-TH');
};

/* ===== helpers for dedupe & keys ===== */
const getStamp = (r) => {
  const cands = [r?.updated_at, r?.request_date, r?.created_at];
  for (const c of cands) {
    const t = new Date(c || 0).getTime();
    if (!Number.isNaN(t) && t > 0) return t;
  }
  return 0;
};

const stableKey = (row, idx = 0) => {
  const id = row?.request_id ?? row?.request_code ?? `row-${idx}`;
  return `req-${String(id)}-${getStamp(row)}`;
};

/** ตัดซ้ำทั้งก้อนด้วย request_id/request_code เก็บชิ้นที่ timestamp ใหม่สุด */
const dedupeByIdLatest = (list) => {
  const m = new Map(); // id -> latest item
  for (const it of list) {
    const id = it?.request_id ?? it?.request_code;
    const key = id ?? `fallback-${it?.user_name || 'user'}-${it?.request_date || 'time'}`;
    const t = getStamp(it);
    const prev = m.get(key);
    if (!prev || t >= getStamp(prev)) m.set(key, it);
  }
  return Array.from(m.values());
};

function getBreakdown(row) {
  const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const sc = row?.status_counts && typeof row.status_counts === 'object' ? row.status_counts : null;

  const pending = toNum(row?.pending_count) || toNum(row?.pending_items_count) || toNum(sc?.pending);
  const preparing = toNum(row?.preparing_count) || toNum(sc?.preparing);
  const delivering = toNum(row?.delivering_count) || toNum(sc?.delivering);
  const completed = toNum(row?.completed_count) || toNum(sc?.completed);

  const total =
    toNum(row?.total_approved_count) ||
    toNum(row?.total_items_count) ||
    (pending + preparing + delivering + completed);

  const deductedSoFar = preparing + delivering + completed;

  return { pending, preparing, delivering, completed, total, deductedSoFar };
}

export default function StockDeductionPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 12; // ⬅️ ล็อค 12 แถวเสมอ
  const COLS = 9;          // ⬅️ จำนวนคอลัมน์ในตารางนี้

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await manageAxios.get('/stockDeduction/ready');
        const data = Array.isArray(res.data) ? res.data : [];
        data.sort((a, b) => {
          const da = getStamp(a);
          const db = getStamp(b);
          return db - da;
        });
        setRequests(data);
        setCurrentPage(1);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          'ไม่สามารถโหลดรายการคำขอที่พร้อมเบิก-จ่ายได้ กรุณาลองใหม่อีกครั้ง';
        console.error('Error fetching requests:', err);
        setError(msg);
        Swal.fire('ผิดพลาด', msg, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // โฟกัสช่องค้นหาอัตโนมัติ (ฝั่ง client เท่านั้น)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = document.getElementById('q');
    el?.focus();
  }, []);

  const statusOptions = useMemo(() => {
    const set = new Set(requests.map((r) => (r?.status ?? '').toString().trim()).filter(Boolean));
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map((s) => ({ value: s, label: statusMap[s]?.text || s }));
  }, [requests]);

  const typeOptions = useMemo(() => {
    const set = new Set(requests.map((r) => (r?.type ?? '').toString().trim()).filter(Boolean));
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map((t) => ({ value: t, label: getTypeTranslation(t) }));
  }, [requests]);

  /* ===== pipeline: sort (ตอน fetch) → filter → dedupe(global) → paginate → pad ===== */
  const filteredRequests = useMemo(() => {
    const f = q.trim().toLowerCase();
    return requests.filter((item) => {
      const st = (item?.status ?? '').toLowerCase();
      const ty = (item?.type ?? '').toLowerCase();
      const matchesQ =
        !f ||
        (item?.request_code ?? '').toLowerCase().includes(f) ||
        (item?.requester ?? item?.user_name ?? '').toLowerCase().includes(f) ||
        (item?.department ?? item?.department_name ?? '').toLowerCase().includes(f);
      const matchesStatus = !statusFilter || st === statusFilter.toLowerCase();
      const matchesType = !typeFilter || ty === typeFilter.toLowerCase();
      return matchesQ && matchesStatus && matchesType;
    });
  }, [requests, q, statusFilter, typeFilter]);

  // ✅ ตัดซ้ำทั้งก้อนก่อนนับหน้า
  const uniqueRequests = useMemo(() => dedupeByIdLatest(filteredRequests), [filteredRequests]);

  // รีเซ็ตหน้าเมื่อมีการกรอง/ค้นหา
  useEffect(() => {
    setCurrentPage(1);
  }, [q, statusFilter, typeFilter]);

  // จำนวนหน้า & รายการในหน้า
  const totalPages = Math.max(1, Math.ceil(uniqueRequests.length / itemsPerPage));

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return uniqueRequests.slice(start, start + itemsPerPage);
  }, [uniqueRequests, currentPage]);

  // เติมแถวว่างให้ครบ 12 แถวเสมอ
  const fillersCount = Math.max(0, itemsPerPage - (currentItems?.length || 0));

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3)
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  };

  const pageNumbers = useMemo(getPageNumbers, [currentPage, totalPages]);

  // clamp หน้าเมื่อจำนวนหน้าลดลง
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const clearFilters = () => {
    setQ('');
    setTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const menuPortalTarget = typeof window !== 'undefined' ? document.body : undefined;

  // ช่วงข้อมูลที่แสดงสำหรับ info bar (หลัง dedupe)
  const startIndex = (currentPage - 1) * itemsPerPage;
  const startDisplay = uniqueRequests.length ? startIndex + 1 : 0;
  const endDisplay = Math.min(startIndex + currentItems.length, uniqueRequests.length);

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>รายการคำขอที่รอเบิก-จ่ายสต็อก</h1>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={`${styles.filterGrid} ${styles.filterGrid3}`}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="type">ประเภท</label>
              <Select
                inputId="type"
                styles={customSelectStyles}
                options={typeOptions}
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                value={typeFilter ? { value: typeFilter, label: getTypeTranslation(typeFilter) } : null}
                onChange={(opt) => setTypeFilter(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
                menuPosition="fixed"
              />
            </div>
            <div className={`${styles.filterGroup} ${styles.statusGroup}`}>
              <label className={styles.label} htmlFor="status">สถานะ</label>
              <Select
                inputId="status"
                styles={customSelectStyles}
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                value={
                  statusFilter
                    ? { value: statusFilter, label: statusMap[statusFilter]?.text || statusFilter }
                    : null
                }
                onChange={(opt) => setStatusFilter(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
                menuPosition="fixed"
              />
            </div>
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.inputIcon} />
              <input
                id="q"
                className={styles.input}
                placeholder="รหัสคำขอ / ผู้ขอ / แผนก…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="ค้นหาด้วยรหัสคำขอ, ผู้ขอ, หรือแผนก"
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

        {isLoading && (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.infoMessage}>กำลังโหลดข้อมูลรายการคำขอ...</p>
          </div>
        )}
        {error && !isLoading && <p className={styles.errorMessage}>{error}</p>}

        {!isLoading && !error && (
          <>
            <div className={styles.tableFrame}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>รหัสคำขอ</th>
                      <th>วันที่ขอ</th>
                      <th>พร้อมตัด</th>
                      <th>ตัดสต็อก / ทั้งหมด</th>
                      <th>ผู้ขอ</th>
                      <th>แผนก</th>
                      <th>ประเภท</th>
                      <th>สถานะ</th>
                      <th>การดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentItems.length > 0 ? (
                      currentItems.map((item, index) => {
                        const st = getStatusTranslation(item?.status);
                        const ty = getTypeTranslation(item?.type);
                        const { pending, total, deductedSoFar } = getBreakdown(item);

                        return (
                          <tr key={stableKey(item, index)}>
                            <td className="nowrap">{item?.request_code || '-'}</td>
                            <td className="nowrap">{fmtDate(item?.request_date)}</td>
                            <td className="nowrap">
                              <span className={`${styles.badge} ${styles.badgeInfo}`} title="พร้อมตัด (pending)">
                                {pending} รายการ
                              </span>
                            </td>
                            <td className="nowrap">
                              <span className={`${styles.badge} ${styles.badgeNeutral}`}>{deductedSoFar}</span>
                              <span> / </span>
                              <span className={`${styles.badge} ${styles.badgeSoft}`}>{total}</span>
                            </td>
                            <td>{item?.requester || item?.user_name || '-'}</td>
                            <td>{item?.department || item?.department_name || '-'}</td>
                            <td className="nowrap">{ty}</td>
                            <td className="nowrap">
                              <span className={`${styles.statusBadge} ${st.class}`}>{st.text}</span>
                            </td>
                            <td className="nowrap">
                              <button
                                className={`${styles.button} ${pending > 0 ? styles.actionButton : styles.detailButton}`}
                                onClick={() =>
                                  router.push(
                                    `/manage/stockDeduction/${item?.request_id}?mode=${
                                      pending > 0 ? 'process' : 'view'
                                    }`
                                  )
                                }
                                disabled={!item?.request_id}
                                title={pending > 0 ? 'ดำเนินการเบิก-จ่าย' : 'ดูรายละเอียด'}
                                aria-label={pending > 0 ? 'ดำเนินการเบิก-จ่าย' : 'ดูรายละเอียด'}
                              >
                                {pending > 0 ? (
                                  <>
                                    <Package size={16} /> ดำเนินการ
                                  </>
                                ) : (
                                  <>
                                    <Eye size={16} /> รายละเอียด
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={COLS} className={styles.emptyRow}>
                          ไม่พบรายการคำขอที่รอการเบิก-จ่ายสต็อกในขณะนี้
                        </td>
                      </tr>
                    )}

                    {/* เติมแถวว่างให้ครบ 12 แถวเสมอ */}
                    {Array.from({ length: fillersCount }).map((_, i) => (
                      <tr key={`filler-${currentPage}-${i}`} className={styles.fillerRow} aria-hidden="true">
                        {Array.from({ length: COLS }).map((__, j) => (
                          <td key={`filler-cell-${j}`}>&nbsp;</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* แถบสรุป + ตัวควบคุมหน้า */}
              <div className={styles.paginationBar}>
                <div className={styles.paginationInfo}>
                  กำลังแสดง {startDisplay}-{endDisplay} จาก {uniqueRequests.length} รายการ
                  {uniqueRequests.length !== filteredRequests.length && (
                    <> (ก่อนตัดซ้ำ {filteredRequests.length})</>
                  )}
                </div>
                {totalPages > 1 && (
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
                    {pageNumbers.map((p, idx) =>
                      p === '...' ? (
                        <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
                      ) : (
                        <li key={`page-${p}-${idx}`}>
                          <button
                            className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                            onClick={() => setCurrentPage(p)}
                            aria-label={`ไปยังหน้า ${p}`}
                            aria-current={p === currentPage ? 'page' : undefined}
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
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
