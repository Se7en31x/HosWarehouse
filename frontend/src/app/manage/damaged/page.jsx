'use client';

import { useEffect, useState, useMemo } from 'react';
import { manageAxios } from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import { connectSocket, disconnectSocket } from '@/app/utils/socket';
import { ChevronLeft, ChevronRight, Wrench, Trash2, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

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

/* options */
const DAMAGE_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'damaged', label: 'ชำรุด' },
  { value: 'lost', label: 'สูญหาย' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'stPending', label: 'รอดำเนินการ' },
  { value: 'stPartial', label: 'บางส่วนแล้ว' },
  { value: 'stDone', label: 'ครบแล้ว' },
];

/* คำนวณสถานะจาก damaged_qty และ remaining_qty */
const getRowStatus = (damaged_qty, remaining_qty) => {
  const d = Number(damaged_qty) || 0;
  const r = Number(remaining_qty) || 0;
  const done = Math.max(d - r, 0);

  if (r <= 0) return { text: 'ดำเนินการครบแล้ว', cls: 'stDone' };
  if (done > 0 && r > 0) return { text: 'ดำเนินการบางส่วนแล้ว', cls: 'stPartial' };
  return { text: 'รอดำเนินการ', cls: 'stPending' };
};

/* badge ประเภทความเสียหาย */
const getDamageType = (t) => {
  if (t === 'lost') return { text: 'สูญหาย', cls: 'typeLost' };
  if (t === 'damaged') return { text: 'ชำรุด', cls: 'typeDamaged' };
  return { text: '-', cls: 'typeNeutral' };
};

/* key ที่นิ่ง ป้องกัน key ซ้ำเวลาสลับหน้า */
const stableKey = (d, i) =>
  `dam-${d?.damaged_id ?? d?.item_id ?? `${d?.item_name || 'row'}-${i}`}`;

export default function DamagedItemsPage() {
  const [damagedList, setDamagedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟิลเตอร์
  const [damageFilter, setDamageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // ล็อคจำนวนแถว/หน้าไว้ที่ 12

  // modal state
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState([]);

  const menuPortalTarget = typeof window !== 'undefined' ? document.body : undefined;

  const fetchDamaged = async () => {
    try {
      setLoading(true);
      const res = await manageAxios.get('/damaged');
      setDamagedList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถดึงข้อมูลรายการชำรุดได้',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // โฟกัสช่องค้นหาอัตโนมัติ
    document.getElementById('search')?.focus();

    const socket = connectSocket?.();
    socket?.on?.('damagedUpdated', fetchDamaged);
    fetchDamaged();

    return () => {
      socket?.off?.('damagedUpdated', fetchDamaged);
      disconnectSocket?.();
    };
  }, []);

  // Filter
  const q = useMemo(() => search.trim().toLowerCase(), [search]);

  const filteredList = useMemo(() => {
    return damagedList.filter((d) => {
      const rowStatus = getRowStatus(d.damaged_qty, d.remaining_qty);
      const damageOk = damageFilter === 'all' || d.damage_type === damageFilter;
      const statusOk = statusFilter === 'all' || rowStatus.cls === statusFilter;
      const searchOk =
        q === '' ||
        d.item_name?.toLowerCase().includes(q) ||
        d.reporter_name?.toLowerCase().includes(q);
      return damageOk && statusOk && searchOk;
    });
  }, [damagedList, damageFilter, statusFilter, q]);

  // เรียง: เหลือ > 0 อยู่บน, ครบแล้วอยู่ล่าง, จากนั้นตามวันที่แจ้งชำรุดใหม่ก่อน
  const sortedDamagedList = useMemo(() => {
    return [...filteredList].sort((a, b) => {
      const ra = Number(a.remaining_qty) || 0;
      const rb = Number(b.remaining_qty) || 0;
      if (ra > 0 && rb === 0) return -1;
      if (ra === 0 && rb > 0) return 1;
      return (new Date(b.damaged_date).getTime() || 0) - (new Date(a.damaged_date).getTime() || 0);
    });
  }, [filteredList]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedDamagedList.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = sortedDamagedList.slice(start, start + itemsPerPage);

  // เมื่อเปลี่ยนตัวกรอง/ค้นหา ให้รีเซ็ตไปหน้าแรก
  useEffect(() => { setCurrentPage(1); }, [damageFilter, statusFilter, q]);

  // clamp หน้าเผื่อจำนวนหน้าลดลง
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages || 1));
  }, [totalPages]);

  const handlePrev = () => currentPage > 1 && setCurrentPage((p) => p - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage((p) => p + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const clearFilters = () => {
    setDamageFilter('all');
    setStatusFilter('all');
    setSearch('');
    setCurrentPage(1);
  };

  // เติมแถวว่างให้ครบ 12 แถวเสมอ (และ key ไม่ชน)
  const COLS = 8;
  const fillersCount = Math.max(0, itemsPerPage - (currentItems?.length || 0));
  const startDisplay = currentItems.length ? start + 1 : 0;
  const endDisplay = start + currentItems.length;
  const totalItems = sortedDamagedList.length;

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              จัดการของชำรุด
            </h1>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={`${styles.filterGrid} ${styles.filterGridCompact}`}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="damageType">ประเภท</label>
              <Select
                inputId="damageType"
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                options={DAMAGE_OPTIONS}
                value={DAMAGE_OPTIONS.find((o) => o.value === damageFilter) || null}
                onChange={(opt) => setDamageFilter(opt?.value || 'all')}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget}
                aria-label="เลือกประเภทความเสียหาย"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="status">สถานะ</label>
              <Select
                inputId="status"
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
                onChange={(opt) => setStatusFilter(opt?.value || 'all')}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget}
                aria-label="เลือกสถานะการดำเนินการ"
              />
            </div>
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.inputIcon} />
              <input
                id="search"
                type="text"
                className={styles.input}
                placeholder="ค้นหาชื่อพัสดุ หรือผู้แจ้ง"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="ค้นหาชื่อพัสดุหรือผู้แจ้ง"
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

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p className={styles.infoMessage}>กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className={styles.tableFrame}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>รายการ</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวนที่ชำรุด</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>คงเหลือ</div>
              <div className={styles.headerItem}>วันที่แจ้งชำรุด</div>
              <div className={styles.headerItem}>ผู้แจ้ง</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>การดำเนินการ</div>
            </div>

            <div
              className={styles.inventory}
              style={{ '--rows-per-page': `${itemsPerPage}` }}
            >
              {currentItems.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบรายการพัสดุชำรุด</div>
              ) : (
                <>
                  {currentItems.map((d, i) => (
                    <div
                      key={stableKey(d, i)}
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                    >
                      <div className={styles.tableCell} title={d.item_name}>{d.item_name ?? '-'}</div>
                      <div className={styles.tableCell}>
                        {(() => {
                          const t = getDamageType(d.damage_type);
                          return <span className={`${styles.typeBadge} ${styles[t.cls]}`}>{t.text}</span>;
                        })()}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>{d.damaged_qty ?? 0}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>{d.remaining_qty ?? 0}</div>
                      <div className={styles.tableCell}>
                        {d.damaged_date
                          ? new Date(d.damaged_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
                          : '-' }
                      </div>
                      <div className={styles.tableCell} title={d.reporter_name}>{d.reporter_name ?? '-'}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {(() => {
                          const s = getRowStatus(d.damaged_qty, d.remaining_qty);
                          return <span className={`${styles.statusBadge} ${styles[s.cls]}`}>{s.text}</span>;
                        })()}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {(Number(d.remaining_qty) || 0) > 0 ? (
                          <div className={styles.actions}>
                            <button
                              className={`${styles.actionBtn} ${styles.btnRepair}`}
                              onClick={() => handleAction(d.damaged_id, d.remaining_qty, 'repaired')}
                              aria-label="ซ่อมพัสดุ"
                              title="ซ่อมพัสดุ"
                            >
                              <Wrench size={16} />
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.btnDispose}`}
                              onClick={() => handleAction(d.damaged_id, d.remaining_qty, 'disposed')}
                              aria-label="ทำลายพัสดุ"
                              title="ทำลายพัสดุ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className={styles.historyBtn}
                            onClick={() => {
                              setSelectedHistory(d.actions || []);
                              setShowHistory(true);
                            }}
                            aria-label="ดูประวัติการดำเนินการ"
                            title="ดูประวัติการดำเนินการ"
                          >
                            ดูประวัติ
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {Array.from({ length: fillersCount }).map((_, i) => (
                    <div
                      key={`filler-${currentPage}-${i}`}
                      className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                      aria-hidden="true"
                    >
                      {Array.from({ length: COLS }).map((__, j) => (
                        <div key={`filler-cell-${j}`} className={styles.tableCell}>&nbsp;</div>
                      ))}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* แถบสรุป + ตัวควบคุมหน้า */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {totalItems} รายการ
              </div>
              {totalPages > 1 && (
                <ul className={styles.paginationControls}>
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={handlePrev}
                      disabled={currentPage === 1}
                      aria-label="ไปยังหน้าที่แล้ว"
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
                        >
                          {p}
                        </button>
                      </li>
                    )
                  )}
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={handleNext}
                      disabled={currentPage >= totalPages}
                      aria-label="ไปยังหน้าถัดไป"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        )}

        {showHistory && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2 className={styles.modalTitle}>ประวัติการดำเนินการ</h2>
              {selectedHistory.length === 0 ? (
                <p className={styles.noDataMessage}>ไม่มีข้อมูลประวัติ</p>
              ) : (
                <ul className={styles.historyList}>
                  {selectedHistory.map((a, idx) => (
                    <li key={idx} className={styles.historyItem}>
                      {a.action_type === 'repaired' && 'ซ่อม'}
                      {a.action_type === 'disposed' && 'ทำลาย'}
                      {a.action_type !== 'repaired' && a.action_type !== 'disposed' && a.action_type}
                      {' '}{a.action_qty} ชิ้น โดย {a.action_by_name}
                      {a.action_date && (
                        <span className={styles.historyDate}>
                          {' '}(
                          {new Date(a.action_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                          )
                        </span>
                      )}
                      {a.note && <div className={styles.historyNote}>หมายเหตุ: {a.note}</div>}
                    </li>
                  ))}
                </ul>
              )}
              <button
                className={styles.closeBtn}
                onClick={() => setShowHistory(false)}
                aria-label="ปิดหน้าต่างประวัติ"
                title="ปิดหน้าต่างประวัติ"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
