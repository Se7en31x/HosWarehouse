'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSortUp, faSortDown, faSearch, faFilter, faTimes,
  faChevronLeft, faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { Trash2 } from 'lucide-react';

// ===== Map & Utils =====
const statusMap = {
  returned: 'คืนปกติ',
  damaged: 'คืนชำรุด',
  lost: 'สูญหาย',
  return_in: 'รับคืนเข้าคลังแล้ว',
  RETURN: 'คืนพัสดุ',
  approved_all: 'อนุมัติทั้งหมด',
  approved_partial: 'อนุมัติบางส่วน',
  waiting_approval: 'รอการอนุมัติ',
  rejected_all: 'ปฏิเสธทั้งหมด',
  rejected_partial: 'ปฏิเสธบางส่วน',
  approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน',
  canceled: 'ยกเลิกคำขอ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',
  waiting_approval_detail: 'รออนุมัติ',
  approved_in_queue: 'รอดำเนินการ',
  pending: 'กำลังดำเนินการ',
  preparing: 'กำลังจัดเตรียมพัสดุ',
  delivering: 'อยู่ระหว่างการนำส่ง',
  completed: 'เสร็จสิ้น',
  partially_processed: 'ดำเนินการบางส่วน',
  no_approved_for_processing: 'ยังไม่มีรายการอนุมัติให้ดำเนินการ',
  unknown_processing_state: 'สถานะดำเนินการไม่ทราบ',
  imported: 'นำเข้าแล้ว',
  returned_complete: 'คืนครบ',
  returned_partially: 'คืนบางส่วน',
  moved: 'โอนย้ายสำเร็จ',
  adjusted: 'ปรับปรุงสำเร็จ',
  scrapped: 'ยกเลิก/ชำรุด',
  'N/A': 'N/A',
  null: 'ยังไม่ระบุ',
  unknown_status: 'สถานะไม่ทราบ',
};

const getTranslatedStatus = (status, eventType, groupType, moveType) => {
  if (groupType === 'RETURN') return 'คืนสินค้า';
  if (moveType === 'return_in' || status === 'return_in' || eventType === 'return_in') {
    return 'รับคืนเข้าคลังแล้ว';
  }
  if (status == null || status === '') return 'ยังไม่ระบุ';
  return statusMap[status] || statusMap[eventType] || status;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const d = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Bangkok' });
    const t = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' });
    return `${d}, ${t}`;
  } catch { return '-'; }
};

const toThaiMode = (v) => {
  if (!v) return 'เบิก';
  const s = String(v).toLowerCase();
  return s === 'borrow' || s === 'ยืม' ? 'ยืม' : 'เบิก';
};

const typeMap = {
  'คำขอเบิก (สร้างคำขอ)': 'CREATE_REQUEST',
  'คำขอเบิก (อนุมัติ)': 'APPROVAL',
  'คำขอเบิก (ดำเนินการ)': 'PROCESSING',
  นำเข้า: 'IMPORT',
  คืนสินค้า: 'RETURN',
  จัดการสต็อก: 'STOCK_MOVEMENT',
};

const TYPE_OPTIONS = [
  { value: '', label: 'แสดงทั้งหมด' },
  { value: 'คำขอเบิก (สร้างคำขอ)', label: 'คำขอเบิก (สร้างคำขอ)' },
  { value: 'คำขอเบิก (อนุมัติ)', label: 'คำขอเบิก (อนุมัติ)' },
  { value: 'คำขอเบิก (ดำเนินการ)', label: 'คำขอเบิก (ดำเนินการ)' },
  { value: 'นำเข้า', label: 'นำเข้า' },
  { value: 'คืนสินค้า', label: 'คืนสินค้า' },
  { value: 'จัดการสต็อก', label: 'จัดการสต็อก' },
];

const customSelectStyles = {
  container: (base) => ({ ...base, width: '100%' }),
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    height: 40,
    borderRadius: 8,
    borderColor: state.isFocused ? '#41c9e2' : '#e5e7eb',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(65,201,226,.25)' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#41c9e2' : '#d1d5db' },
    backgroundColor: '#fff',
    fontSize: '0.95rem',
  }),
  valueContainer: (b) => ({ ...b, padding: '0 8px' }),
  indicatorsContainer: (b) => ({ ...b, height: 40 }),
  menuPortal: (base) => ({ ...base, zIndex: 999999 }),   // << เสริมเลเยอร์สูงมาก
  menu: (b) => ({
    ...b,
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 8px 20px rgba(0,0,0,.08)',
  }),
  option: (b, s) => ({
    ...b,
    padding: '9px 12px',
    backgroundColor: s.isSelected ? 'rgba(14,134,253,.08)' : s.isFocused ? '#e9f6fb' : '#fff',
    color: s.isSelected ? '#0e86fd' : '#374151',
    cursor: 'pointer',
  }),
  placeholder: (b) => ({ ...b, color: '#9ca3af' }),
};

/* map สถานะ → ชื่อคลาส badge แบบเรียบง่าย */
const getStatusClass = (status, eventType, groupType, moveType) => {
  const s = (status || '').toLowerCase();
  const g = (groupType || '').toUpperCase();

  // RETURN group แยกสีให้ดูออกทันที
  if (g === 'RETURN') {
    if (s === 'damaged') return 'stReturnDamaged';
    if (s === 'lost') return 'stReturnLost';
    if (s === 'returned_complete') return 'stReturnComplete';
    if (s === 'returned_partially') return 'stReturnPartial';
    return 'stReturn';
  }

  if (s === 'waiting_approval' || s === 'approved_in_queue') return 'stWaiting';
  if (s === 'pending' || s === 'preparing' || s === 'delivering') return 'stProcessing';

  if (s === 'approved_all' || s === 'approved') return 'stApproved';
  if (s === 'approved_partial') return 'stApprovedPartial';
  if (s === 'approved_partial_and_rejected_partial') return 'stMixed';

  if (s === 'rejected_all' || s === 'rejected') return 'stRejected';
  if (s === 'rejected_partial') return 'stRejectedPartial';

  if (s === 'completed' || s === 'imported' || s === 'returned_complete') return 'stCompleted';
  if (s === 'canceled' || s === 'scrapped') return 'stCanceled';
  if (s === 'moved') return 'stMoved';
  if (s === 'adjusted') return 'stAdjusted';

  if (g === 'STOCK_MOVEMENT' || (moveType || '').length) return 'stMoved';

  return 'stDefault';
};

export default function TransactionHistoryLogPage() {
  const [menuPortalTarget, setMenuPortalTarget] = useState(null);
  useEffect(() => setMenuPortalTarget(document.body), []);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // spinner หลักของตาราง
  const [isFetching, setIsFetching] = useState(false);
  // บอกว่าตอนนี้เป็น “การเปลี่ยนหน้า” อยู่หรือไม่ (ไว้ซ่อน spinner ตอน paging)
  const [isPaging, setIsPaging] = useState(false);

  const [error, setError] = useState(null);

  // ✅ คงเฉพาะ “ค้นหา/ประเภท” — ไม่มีตัวกรองเวลาแล้ว
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Pagination & Sorting
  const rowsPerPage = 12; // คงที่ 10 เสมอ
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');

  // cache: request mode
  const [reqTypeMap, setReqTypeMap] = useState({});

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ดึงข้อมูล (รองรับโหมด silent เพื่อไม่โชว์ spinner ตอน paging)
  const fetchHistoryLogs = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setIsFetching(true);
      setError(null);
      try {
        const res = await axiosInstance.get('/transaction-history', {
          params: {
            page: currentPage,
            limit: rowsPerPage,
            type: typeMap[filterType] ?? '',
            search: debouncedSearchTerm,
            sort_by: sortColumn,
            sort_order: sortOrder,
            group: true,
            _t: Date.now(),
          },
        });
        const { data, totalPages: tp } = res.data || {};
        setLogs(Array.isArray(data) ? data : []);
        setTotalPages(tp || 1);
      } catch (err) {
        console.error(err);
        setError('ไม่สามารถโหลดประวัติการทำรายการได้');
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดประวัติการทำรายการได้', 'error');
      } finally {
        if (!silent) setIsFetching(false);
        setLoading(false);
        // setIsPaging(false); // จบโหมดเปลี่ยนหน้า
      }
    },
    [currentPage, rowsPerPage, filterType, debouncedSearchTerm, sortColumn, sortOrder]
  );

  useEffect(() => {
    // โหลดข้อมูลแบบเงียบ ไม่โชว์ overlay spinner
    fetchHistoryLogs({ silent: true });
  }, [fetchHistoryLogs, isPaging]);

  // ดึงชนิดคำขอสำหรับ CREATE_REQUEST
  useEffect(() => {
    const ids = Array.from(
      new Set(
        (logs || [])
          .filter(l => l?.group_type === 'CREATE_REQUEST' && (l.request_id || l.id))
          .map(l => l.request_id || l.id)
          .filter(rid => !reqTypeMap[rid])
      )
    );
    if (ids.length === 0) return;
    (async () => {
      const pairs = await Promise.all(ids.map(async (rid) => {
        try {
          const r = await axiosInstance.get(`/transaction-history/request/${rid}`, { params: { _t: Date.now() } });
          const data = r?.data?.data || {};
          const items = Array.isArray(data.lineItems) ? data.lineItems : [];
          const sumType = String(data?.summary?.request_type || '').toLowerCase();
          const anyBorrow = items.some(it => {
            const a = String(it?.request_mode_thai || '').toLowerCase();
            const b = String(it?.request_mode || '').toLowerCase();
            return a === 'ยืม' || b === 'borrow';
          });
          const modeTH = (anyBorrow || sumType === 'borrow' || sumType === 'ยืม') ? 'ยืม' : 'เบิก';
          return [rid, modeTH];
        } catch { return [rid, null]; }
      }));
      setReqTypeMap(prev => ({ ...prev, ...Object.fromEntries(pairs) }));
    })();
  }, [logs, reqTypeMap]);

  const handleSort = (column) => {
    const backendColumn =
      ({ reference_code: 'reference_code', timestamp: 'timestamp', latest_type: 'event_type', latest_user_name: 'user_name' }[column])
      || 'timestamp';
    // setIsPaging(false);          // เรียง = ให้โชว์ spinner
    if (sortColumn === backendColumn) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortColumn(backendColumn); setSortOrder('asc'); }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    // setIsPaging(false);          // ล้างตัวกรอง = ให้โชว์ spinner
    setFilterType('');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSortColumn('timestamp');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) {
      setIsPaging(true);         // เปลี่ยนหน้า = ไม่โชว์ spinner
      setCurrentPage(p);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'returned': return '#28a745';
      case 'damaged': return '#ff5722';
      case 'lost': return '#9e9e9e';
      case 'approved_all': case 'approved_partial':
      case 'อนุมัติทั้งหมด': case 'อนุมัติบางส่วน': case 'อนุมัติ/ปฏิเสธบางส่วน':
        return '#4CAF50';
      case 'waiting_approval': case 'approved_in_queue':
      case 'รอดำเนินการ': case 'รอการอนุมัติ': return '#FFC107';
      case 'returned_partially': return '#FF9800';
      case 'completed': case 'imported': case 'returned_complete': case 'moved':
      case 'เสร็จสิ้น': case 'โอนย้ายสำเร็จ': return '#2196F3';
      case 'rejected_all': case 'canceled': case 'scrapped':
      case 'ปฏิเสธทั้งหมด': case 'ยกเลิกคำขอ': case 'ยกเลิก/ชำรุด': return '#F44336';
      default: return '#757575';
    }
  };

  const buildDetailLink = (log) => {
    if (!log || !log.reference_code) return '';
    const isReq = ['CREATE_REQUEST', 'APPROVAL', 'PROCESSING'].includes(log.group_type);
    if (isReq) {
      const view = log.group_type === 'CREATE_REQUEST' ? 'create' : (log.group_type === 'APPROVAL' ? 'approval' : 'processing');
      const requestId = log.request_id ?? log.id;
      return `/manage/transactionHistory/${requestId}?view=${view}`;
    }
    if (log.group_type === 'STOCK_MOVEMENT') {
      return `/manage/transactionHistory/0?move_code=${encodeURIComponent(log.reference_code)}`;
    }
    if (log.group_type === 'RETURN') {
      const requestId = log.request_id ?? null;
      if (requestId) return `/manage/transactionHistory/${requestId}?view=return&ret=${encodeURIComponent(log.reference_code)}`;
    }
    return '';
  };

  const renderEventType = (log) => {
    if (log?.group_type === 'CREATE_REQUEST') {
      const rid = log.request_id || log.id;
      const cached = reqTypeMap[rid];
      if (cached) return `สร้างคำขอ${cached}`;
      const mode = toThaiMode(log.request_type_thai || log.request_type || log.request_mode);
      return mode ? `สร้างคำขอ${mode}` : 'สร้างคำขอ…';
    }
    if (log?.group_type === 'RETURN') {
      const t = (log?.status || '').toLowerCase();
      return t === 'damaged' ? 'คืน (ชำรุด)' : t === 'lost' ? 'คืน (สูญหาย)' : 'คืน (ปกติ)';
    }
    const translated = statusMap[log?.event_type];
    return translated || log?.event_type || '-';
  };

  // เตรียมข้อมูล + เติมแถวว่างให้ครบ 10
  const displayRows = [...logs];
  while (displayRows.length < rowsPerPage) displayRows.push({ _placeholder: true });

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3) pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    return pages;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p className={styles.loading}>กำลังโหลดประวัติการทำรายการ...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${styles.container} ${styles.errorContainer}`}>
        <p>{error}</p>
        <button onClick={() => fetchHistoryLogs({ silent: true })} className={styles.retryBtn}>ลองโหลดใหม่</button>
      </div>
    );
  }

  return (
    <div className={styles.pageBackground}>
      <div className={styles.containerCard}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ประวัติการทำรายการทั้งหมด</h1>
          </div>
        </div>
        
        <div className={styles.toolbar}>
          {/* ซ้าย: ประเภท (react-select) */}
          <div className={`${styles.filterGroup} ${styles.filterCol} ${styles.typeGroup}`}>
            <label htmlFor="type" className={styles.label}>
              <FontAwesomeIcon icon={faFilter} /> ประเภท
            </label>
            <Select
              inputId="type"
              options={TYPE_OPTIONS}
              isClearable
              isSearchable={false}
              placeholder="-- แสดงทั้งหมด --"
              styles={customSelectStyles}
              value={TYPE_OPTIONS.find(o => o.value === filterType) || TYPE_OPTIONS[0]}
              onChange={(opt) => { setFilterType(opt?.value || ''); setCurrentPage(1); }}
              menuPlacement="auto"
              menuPosition="fixed"
              menuPortalTarget={menuPortalTarget}
            />
          </div>

          {/* ขวา: ค้นหา + ล้างตัวกรอง */}
          <div className={`${styles.filterGroup} ${styles.filterCol} ${styles.searchGroup}`}>
            <label htmlFor="search-input" className={styles.label}>
              <FontAwesomeIcon icon={faSearch} /> ค้นหา
            </label>
            <input
              id="search-input"
              type="text"
              className={styles.input}
              placeholder="ค้นหาจากชื่อ, รหัส หรือรายละเอียด..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <button
            onClick={handleClearFilters}
            className={styles.clearBtn}
            title="ล้างตัวกรองทั้งหมด"
          >
            <Trash2 size={18} /> ล้างตัวกรอง
          </button>
        </div>

        {/* แสดง overlay เฉพาะตอน “ไม่ใช่ paging” */}
        {/* {isFetching && !isPaging && (
          <div className={styles.tableLoadingOverlay}>
            <div className={styles.spinner} />
          </div>
        )} */}

        {/* ===== Table (Grid) ===== */}
        <div className={styles.tableFrame}>
          {/* Header */}
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div
              className={`${styles.headerItem} ${styles.sortable}`}
              onClick={() => handleSort('reference_code')}
            >
              รหัสอ้างอิง
              {sortColumn === 'reference_code' && (
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} className={styles.sortIcon} />
              )}
            </div>
            <div
              className={`${styles.headerItem} ${styles.sortable}`}
              onClick={() => handleSort('timestamp')}
            > เวลา/วันที่ล่าสุด
            </div>
            <div
              className={`${styles.headerItem} ${styles.sortable}`}
              onClick={() => handleSort('latest_type')}
            >
              ประเภท
              {sortColumn === 'event_type' && (
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} className={styles.sortIcon} />
              )}
            </div>
            <div
              className={`${styles.headerItem} ${styles.sortable}`}
              onClick={() => handleSort('latest_user_name')}
            >
              ผู้ทำรายการล่าสุด
              {sortColumn === 'user_name' && (
                <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} className={styles.sortIcon} />
              )}
            </div>
            <div className={styles.headerItem}>แผนก</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ดูรายละเอียด</div>
          </div>

          {/* Body */}
          <div className={styles.inventory} style={{ '--rows-per-page': rowsPerPage }}>
            {displayRows.map((log, idx) => {
              const placeholder = !!log._placeholder || !log.reference_code;
              const key = placeholder ? `p-${currentPage}-${idx}` : `${log.reference_code}-${log.group_type}`;
              const detailLink = placeholder ? '' : buildDetailLink(log);

              return (
                <div key={key} className={`${styles.tableGrid} ${styles.tableRow} ${placeholder ? styles.placeholderRow : ''}`}>
                  {/* รหัสอ้างอิง */}
                  <div className={styles.tableCell}>
                    {placeholder ? '' : (
                      <>
                        {log.reference_code || '-'}
                        {log.group_type === 'RETURN' && log.parent_reference_code && (
                          <div className={styles.subRef}>จากคำขอ: {log.parent_reference_code}</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* เวลา/วันที่ */}
                  <div className={styles.tableCell}>{placeholder ? '' : formatDate(log.timestamp)}</div>

                  {/* ประเภท */}
                  <div className={styles.tableCell}>{placeholder ? '' : renderEventType(log)}</div>

                  {/* ผู้ทำรายการล่าสุด */}
                  <div className={styles.tableCell}>{placeholder ? '' : (log.user_name || '-')}</div>

                  {/* แผนก */}
                  <div className={styles.tableCell}>{placeholder ? '' : (log.department_name || '-')}</div>

                  {/* สถานะ */}
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {placeholder ? '' : (() => {
                      const sc = getStatusClass(
                        log.status,
                        log.event_type,
                        log.group_type,
                        log.move_type
                      );
                      return (
                        <span className={`${styles.statusBadge} ${styles[sc]}`}>
                          {getTranslatedStatus(
                            log.status,
                            log.event_type,
                            log.group_type,
                            log.move_type
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  {/* ดูรายละเอียด */}
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {!placeholder && detailLink && (
                      <Link href={detailLink}>
                        <button className={styles.detailButton}>ดูรายละเอียด</button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination … + arrows */}
          {totalPages > 0 && (
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                </button>
              </li>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <li key={`e-${i}`} className={styles.ellipsis}>…</li>
                ) : (
                  <li key={`p-${p}`}>
                    <button
                      className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  </li>
                )
              )}
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
