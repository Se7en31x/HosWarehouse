// TransactionHistoryLogPage — page.jsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSortUp,
  faSortDown,
  faSearch,
  faFilter,
  faTimes,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

// --- Utility: สถานะ ---
const statusMap = {
  // 🆕 สถานะการคืนจากโมเดลใหม่
  returned: 'คืนปกติ',
  damaged: 'คืนชำรุด',
  lost: 'สูญหาย',
  return_in: 'รับคืนเข้าคลังแล้ว',
  RETURN: 'คืนพัสดุ', // เพิ่มสถานะนี้
  approved_all: 'อนุมัติทั้งหมด',
  approved_partial: 'อนุมัติบางส่วน',
  waiting_approval: 'รอการอนุมัติ',
  rejected_all: 'ปฏิเสธทั้งหมด',
  rejected_partial: 'ปฏิเสธบางส่วน',
  approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน',
  canceled: 'ยกเลิกคำขอ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธแล้ว',

  // ดำเนินการ
  waiting_approval_detail: 'รออนุมัติ',
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

const getTranslatedStatus = (status, eventType, groupType, moveType) => {
  // หากเป็น groupType 'RETURN' ให้แสดงผลเป็น 'คืนสินค้า'
  if (groupType === 'RETURN') {
    return 'คืนสินค้า';
  }

  // กรณีเป็นการคืนเข้าคลัง
  if (
    moveType === 'return_in' ||
    status === 'return_in' ||
    eventType === 'return_in'
  ) {
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
const toThaiMode = (v) => {
  if (!v) return 'เบิก';
  const s = String(v).toLowerCase();
  return s === 'borrow' || s === 'ยืม' ? 'ยืม' : 'เบิก';
};

// แม็ปค่าประเภทบน UI -> ค่าที่ backend ต้องการ
const typeMap = {
  'คำขอเบิก (สร้างคำขอ)': 'CREATE_REQUEST',
  'คำขอเบิก (อนุมัติ)': 'APPROVAL',
  'คำขอเบิก (ดำเนินการ)': 'PROCESSING',
  นำเข้า: 'IMPORT',
  คืนสินค้า: 'RETURN',
  จัดการสต็อก: 'STOCK_MOVEMENT',
};

export default function TransactionHistoryLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isFetching, setIsFetching] = useState(false);
  const logsPerPage = 10;

  // ✅ cache ชนิดคำขอของแต่ละ request_id => 'เบิก' | 'ยืม'
  const [reqTypeMap, setReqTypeMap] = useState({});

  // debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchHistoryLogs = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      const response = await axiosInstance.get('/transaction-history', {
        params: {
          page: currentPage,
          limit: logsPerPage,
          type: typeMap[filterType] ?? '',
          search: debouncedSearchTerm,
          sort_by: sortColumn,
          sort_order: sortOrder,
          group: true,
          _t: Date.now(), // bust cache to avoid 304 issues
        },
      });
      const { data, totalPages: tp } = response.data || {};
      setLogs(Array.isArray(data) ? data : []);
      setTotalPages(tp || 1);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ไม่สามารถโหลดประวัติการทำรายการได้');
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดประวัติการทำรายการได้', 'error');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [currentPage, filterType, debouncedSearchTerm, sortColumn, sortOrder]);

  useEffect(() => {
    fetchHistoryLogs();
  }, [fetchHistoryLogs]);

  // ⭐ ดึงชนิดคำขอสำหรับแถวที่เป็น CREATE_REQUEST (ถ้ายังไม่มีใน cache)
  useEffect(() => {
    const idsToFetch = Array.from(
      new Set(
        (logs || [])
          .filter(
            (l) =>
              l?.group_type === 'CREATE_REQUEST' &&
              (l.request_id || l.id) &&
              !reqTypeMap[l.request_id || l.id]
          )
          .map((l) => l.request_id || l.id)
      )
    );
    if (idsToFetch.length === 0) return;

    (async () => {
      const pairs = await Promise.all(
        idsToFetch.map(async (rid) => {
          try {
            const res = await axiosInstance.get(`/transaction-history/request/${rid}`, {
              params: { _t: Date.now() },
            });
            const data = res?.data?.data || {};
            const items = Array.isArray(data.lineItems) ? data.lineItems : [];
            const sumType = String(data?.summary?.request_type || '').toLowerCase();

            const anyBorrow = items.some((it) => {
              const a = String(it?.request_mode_thai || '').toLowerCase();
              const b = String(it?.request_mode || '').toLowerCase();
              return a === 'ยืม' || b === 'borrow';
            });

            const modeTH =
              anyBorrow || sumType === 'borrow' || sumType === 'ยืม' ? 'ยืม' : 'เบิก';
            return [rid, modeTH];
          } catch {
            return [rid, null];
          }
        })
      );
      setReqTypeMap((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    })();
  }, [logs, reqTypeMap]);

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
    setCurrentPage(1);
  };
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    const backendColumn =
      {
        last_timestamp: 'timestamp',
        latest_type: 'event_type',
        latest_user_name: 'user_name',
        reference_code: 'reference_code',
      }[column] || (column === 'timestamp' ? 'timestamp' : 'timestamp');

    if (sortColumn === backendColumn) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortColumn(backendColumn);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilterType('');
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSortColumn('timestamp');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) setCurrentPage(page);
  };

  const getStatusColor = (status) => {
    switch (status) {
      // 🆕 สีสำหรับสถานะคืน
      case 'returned':
        return '#28a745'; // เขียว (คืนปกติ)
      case 'damaged':
        return '#ff5722'; // ส้มแดง (ชำรุด)
      case 'lost':
        return '#9e9e9e'; // เทา (สูญหาย)

      case 'อนุมัติทั้งหมด':
      case 'approved_all':
      case 'อนุมัติบางส่วน':
      case 'approved_partial':
      case 'อนุมัติ/ปฏิเสธบางส่วน':
        return '#4CAF50';
      case 'รอการอนุมัติ':
      case 'waiting_approval':
      case 'รอดำเนินการ':
      case 'approved_in_queue':
        return '#FFC107';
      case 'คืนบางส่วน':
      case 'returned_partially':
        return '#FF9800';
      case 'เสร็จสิ้น':
      case 'completed':
      case 'นำเข้าแล้ว':
      case 'imported':
      case 'คืนครบ':
      case 'returned_complete':
      case 'โอนย้ายสำเร็จ':
      case 'moved':
        return '#2196F3';
      case 'ปฏิเสธทั้งหมด':
      case 'rejected_all':
      case 'ยกเลิกคำขอ':
      case 'canceled':
      case 'ยกเลิก/ชำรุด':
      case 'scrapped':
        return '#F44336';
      default:
        return '#757575';
    }
  };

  // 🆕 ตัวช่วยสร้างลิงก์ “ดูรายละเอียด” ให้ใช้หน้าเดียวกันได้ (รองรับ RETURN)
  const buildDetailLink = (log) => {
    if (!log || !log.reference_code) return '';
    const isRequest = ['CREATE_REQUEST', 'APPROVAL', 'PROCESSING'].includes(log.group_type);

    if (isRequest) {
      const view =
        log.group_type === 'CREATE_REQUEST'
          ? 'create'
          : log.group_type === 'APPROVAL'
          ? 'approval'
          : 'processing';
      const requestIdForLink = log.request_id ?? log.id;
      return `/manage/transactionHistory/${requestIdForLink}?view=${view}`;
    }

    // STOCK_MOVEMENT → ใช้หน้าเดียวกันแต่ส่ง move_code
    if (log.group_type === 'STOCK_MOVEMENT') {
      return `/manage/transactionHistory/0?move_code=${encodeURIComponent(
        log.reference_code
      )}`;
    }

    // RETURN → พาไปหน้าใบคำขอแม่ โดยใช้ request_id และแนบ ret เพื่อโฟกัสครั้งที่คืน
    if (log.group_type === 'RETURN') {
      const requestIdForLink = log.request_id ?? null;
      if (requestIdForLink) {
        return `/manage/transactionHistory/${requestIdForLink}?view=return&ret=${encodeURIComponent(
          log.reference_code
        )}`;
      }
    }

    // IMPORT (ยังไม่ทำหน้าเจาะ) → ไม่ลิงก์
    return '';
  };

  // สร้าง label "ประเภทล่าสุด" ให้แถว
  const renderEventType = (log) => {
    if (log?.group_type === 'CREATE_REQUEST') {
      const rid = log.request_id || log.id;
      const cached = reqTypeMap[rid];
      if (cached) return `สร้างคำขอ${cached}`;
      // fallback
      const mode = toThaiMode(log.request_type_thai || log.request_type || log.request_mode);
      return mode ? `สร้างคำขอ${mode}` : 'สร้างคำขอ…';
    }

    // แก้ไข: เพิ่มการตรวจสอบ event_type สำหรับสถานะการคืน
    if (log?.group_type === 'RETURN') {
      const t = (log?.status || '').toLowerCase();
      const thai =
        t === 'damaged' ? 'คืน (ชำรุด)' :
        t === 'lost' ? 'คืน (สูญหาย)' :
        'คืน (ปกติ)';
      return thai;
    }
    
    // Fallback สำหรับ event_type อื่นๆ
    const translated = statusMap[log?.event_type];
    return translated || log?.event_type || '-';
  };

  const displayLogs = [...logs];
  while (displayLogs.length < logsPerPage) displayLogs.push({});

  const filterOptions = (
    <>
      <option value="">-- แสดงทั้งหมด --</option>
      <option value="คำขอเบิก (สร้างคำขอ)">คำขอเบิก (สร้างคำขอ)</option>
      <option value="คำขอเบิก (อนุมัติ)">คำขอเบิก (อนุมัติ)</option>
      <option value="คำขอเบิก (ดำเนินการ)">คำขอเบิก (ดำเนินการ)</option>
      <option value="นำเข้า">นำเข้า</option>
      <option value="คืนสินค้า">คืนสินค้า</option>
      <option value="จัดการสต็อก">จัดการสต็อก</option>
    </>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loading}>กำลังโหลดประวัติการทำรายการ...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${styles.container} ${styles.errorContainer}`}>
        <p>{error}</p>
        <button onClick={fetchHistoryLogs} className={styles.retryBtn}>
          ลองโหลดใหม่
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.heading}>ประวัติการทำรายการทั้งหมด</h1>

        <div className={styles.controls}>
          <div className={styles.filterGroup}>
            <label htmlFor="search-input" className={styles.filterLabel}>
              <FontAwesomeIcon icon={faSearch} /> ค้นหา:
            </label>
            <input
              id="search-input"
              type="text"
              placeholder="ค้นหาจากชื่อ, รหัส หรือรายละเอียด..."
              value={searchTerm}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="filter-type" className={styles.filterLabel}>
              <FontAwesomeIcon icon={faFilter} /> กรองประเภท:
            </label>
            <select
              id="filter-type"
              value={filterType}
              onChange={handleFilterChange}
              className={styles.typeSelect}
            >
              {filterOptions}
            </select>
          </div>

          <button
            onClick={handleClearFilters}
            className={styles.clearBtn}
            title="ล้างตัวกรองทั้งหมด"
          >
            <FontAwesomeIcon icon={faTimes} /> ล้างตัวกรอง
          </button>
        </div>

        {isFetching && (
          <div className={styles.tableLoadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th
                  onClick={() => handleSort('reference_code')}
                  className={styles.sortableHeader}
                >
                  รหัสอ้างอิง{' '}
                  {sortColumn === 'reference_code' &&
                    (sortOrder === 'asc' ? (
                      <FontAwesomeIcon icon={faSortUp} />
                    ) : (
                      <FontAwesomeIcon icon={faSortDown} />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('timestamp')}
                  className={styles.sortableHeader}
                >
                  เวลา/วันที่ล่าสุด{' '}
                  {sortColumn === 'timestamp' &&
                    (sortOrder === 'asc' ? (
                      <FontAwesomeIcon icon={faSortUp} />
                    ) : (
                      <FontAwesomeIcon icon={faSortDown} />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('latest_type')}
                  className={styles.sortableHeader}
                >
                  ประเภท{' '}
                  {sortColumn === 'event_type' &&
                    (sortOrder === 'asc' ? (
                      <FontAwesomeIcon icon={faSortUp} />
                    ) : (
                      <FontAwesomeIcon icon={faSortDown} />
                    ))}
                </th>
                <th
                  onClick={() => handleSort('latest_user_name')}
                  className={styles.sortableHeader}
                >
                  ผู้ทำรายการล่าสุด{' '}
                  {sortColumn === 'user_name' &&
                    (sortOrder === 'asc' ? (
                      <FontAwesomeIcon icon={faSortUp} />
                    ) : (
                      <FontAwesomeIcon icon={faSortDown} />
                    ))}
                </th>
                <th>แผนก</th>
                <th>สถานะ</th>
                <th>ดูรายละเอียดเพิ่มเติม</th>
              </tr>
            </thead>

            <tbody>
              {(() => {
                const display = [...logs];
                while (display.length < logsPerPage) display.push({});
                return display.map((log, index) => {
                  const isEmpty = !log.reference_code;
                  const rowKey = log.reference_code
                    ? `${log.reference_code}-${log.group_type}`
                    : `empty-${currentPage}-${index}`;

                  const detailLink = buildDetailLink(log);

                  return (
                    <tr
                      key={rowKey}
                      className={!isEmpty ? styles.rowWithData : styles.emptyRowPlaceholder}
                    >
                      <td>
                        {isEmpty ? (
                          ''
                        ) : (
                          <>
                            {log.reference_code || '-'}
                            {log.group_type === 'RETURN' &&
                              log.parent_reference_code && (
                                <div className={styles.subRef}>
                                  จากคำขอ: {log.parent_reference_code}
                                </div>
                              )}
                          </>
                        )}
                      </td>
                      <td>{isEmpty ? '' : formatDate(log.timestamp)}</td>
                      <td>
                        {isEmpty ? '' : renderEventType(log)}
                      </td>
                      <td>{isEmpty ? '' : log.user_name || '-'}</td>
                      <td>{isEmpty ? '' : log.department_name || '-'}</td>
                      <td>
                        {!isEmpty && (
                          <span
                            className={styles.statusBadge}
                            style={{ backgroundColor: getStatusColor(log.status) }}
                          >
                            {getTranslatedStatus(log.status, log.event_type, log.group_type, log.move_type)}
                          </span>
                        )}
                      </td>
                      <td>
                        {!isEmpty && detailLink && (
                          <Link href={detailLink}>
                            <button className={styles.detailButton}>ดูรายละเอียด</button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
              {logs.length === 0 && !loading && !error && (
                <tr className={styles.noDataRow}>
                  <td colSpan="7">ไม่พบข้อมูลประวัติ</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 0 && (
          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.paginationBtn}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`${styles.paginationBtn} ${currentPage === i + 1 ? styles.activePage : ''
                  }`}
                onClick={() => handlePageChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.paginationBtn}
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}