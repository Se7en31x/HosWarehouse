'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import dynamic from 'next/dynamic';
import axiosInstance from '@/app/utils/axiosInstance';
import styles from './page.module.css';
import { Trash2, ChevronLeft, ChevronRight, Package, Eye } from 'lucide-react';

const Select = dynamic(() => import('react-select'), { ssr: false });

// react-select styles, statusMap, typeMap, getStatusTranslation, getTypeTranslation, fmtDate, getBreakdown (เหมือนเดิม)
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    minHeight: '2.5rem',
    borderColor: state.isFocused ? '#2563eb' : '#e5e7eb',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2563eb' },
  }),
  menu: base => ({
    ...base,
    borderRadius: '0.5rem',
    marginTop: 6,
    border: '1px solid #e5e7eb',
    zIndex: 9000,
  }),
  menuPortal: base => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f1f5ff' : '#fff',
    color: '#111827',
    padding: '8px 12px',
  }),
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
    text: (status || '').toString().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()),
    class: styles.statusDefault || styles.statusPendingDeduction,
  };

const getTypeTranslation = (type) => typeMap[type] || type || '-';

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('th-TH');
};

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
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await axiosInstance.get('/stockDeduction/ready');
        const data = Array.isArray(res.data) ? res.data : [];
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

  const statusOptions = useMemo(() => {
    const set = new Set(
      requests.map(r => (r?.status ?? '').toString().trim()).filter(Boolean)
    );
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map(s => ({ value: s, label: statusMap[s]?.text || s }));
  }, [requests]);

  const typeOptions = useMemo(() => {
    const set = new Set(
      requests.map(r => (r?.type ?? '').toString().trim()).filter(Boolean)
    );
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map(t => ({ value: t, label: getTypeTranslation(t) }));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const f = q.trim().toLowerCase();
    return requests.filter(item => {
      const st = (item?.status ?? '').toLowerCase();
      const ty = (item?.type ?? '').toLowerCase();
      const matchesQ = !f ||
        (item?.request_code ?? '').toLowerCase().includes(f) ||
        (item?.requester ?? item?.user_name ?? '').toLowerCase().includes(f) ||
        (item?.department ?? item?.department_name ?? '').toLowerCase().includes(f);
      const matchesStatus = !statusFilter || st === statusFilter.toLowerCase();
      const matchesType = !typeFilter || ty === typeFilter.toLowerCase();
      return matchesQ && matchesStatus && matchesType;
    });
  }, [requests, q, statusFilter, typeFilter]);

  useEffect(() => { setCurrentPage(1); }, [q, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  };

  const pageNumbers = useMemo(getPageNumbers, [currentPage, totalPages]);

  const clearFilters = () => {
    setQ('');
    setTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
  };

  const handleDeductStockClick = (requestId) => {
    if (!requestId) return;
    router.push(`/manage/stockDeduction/${requestId}`);
  };

  const colSpan = 10;
  const menuPortalTarget = typeof window !== 'undefined' ? document.body : undefined;

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
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="q">ค้นหา</label>
              <input
                id="q"
                className={styles.input}
                placeholder="รหัสคำขอ / ผู้ขอ / แผนก…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {isLoading && <p className={styles.infoMessage}>กำลังโหลดข้อมูลรายการคำขอ...</p>}
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
                        const { pending, preparing, delivering, completed, total, deductedSoFar } = getBreakdown(item);

                        return (
                          <tr key={item?.request_id ?? item?.request_code ?? `${index}`}>
                            <td className="nowrap">{item?.request_code || '-'}</td>
                            <td className="nowrap">{fmtDate(item?.request_date)}</td>
                            <td className="nowrap">
                              <span className={`${styles.badge} ${styles.badgeInfo}`} title="พร้อมตัด (pending)">
                                {pending} รายการ
                              </span>
                            </td>
                            <td className="nowrap">
                              <span className={`${styles.badge} ${styles.badgeNeutral}`} title="ตัดสต็อกแล้ว">
                                {deductedSoFar}
                              </span>
                              <span> / </span>
                              <span className={`${styles.badge} ${styles.badgeSoft}`} title="ทั้งหมด (อนุมัติแล้ว)">
                                {total}
                              </span>
                            </td>
                            <td>{item?.requester || item?.user_name || '-'}</td>
                            <td>{item?.department || item?.department_name || '-'}</td>
                            <td className="nowrap">{ty}</td>
                            <td className="nowrap">
                              <span className={`${styles.statusBadge} ${st.class}`}>{st.text}</span>
                            </td>
                            <td className="nowrap">
                              <button
                                className={`${styles.button} ${
                                  pending > 0 ? styles.actionButton : styles.detailButton
                                }`}
                                onClick={() => handleDeductStockClick(item?.request_id)}
                                disabled={!item?.request_id}
                                title={pending > 0 ? 'ดำเนินการเบิก-จ่าย' : 'ดูรายละเอียด'}
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
                        <td colSpan={10} className={styles.emptyRow}>
                          ไม่พบรายการคำขอที่รอการเบิก-จ่ายสต็อกในขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

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
                {pageNumbers.map((p, idx) =>
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
          </>
        )}
      </div>
    </div>
  );
}