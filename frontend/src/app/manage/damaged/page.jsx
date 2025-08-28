'use client';

import { useEffect, useState, useMemo } from 'react';
import axiosInstance from '@/app/utils/axiosInstance';
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
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f1f5ff' : '#fff',
    color: '#111827',
    padding: '8px 12px',
  }),
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

export default function DamagedItemsPage() {
  const [damagedList, setDamagedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟิลเตอร์
  const [damageFilter, setDamageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // modal state
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState([]);

  const fetchDamaged = async () => {
    try {
      const res = await axiosInstance.get('/damaged');
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
    const socket = connectSocket(() => {
      fetchDamaged();
    });
    fetchDamaged();
    return () => { disconnectSocket(); };
  }, []);

  // Filter list
  const filteredList = useMemo(() => {
    return damagedList.filter(d => {
      const rowStatus = getRowStatus(d.damaged_qty, d.remaining_qty);
      const damageOk = damageFilter === 'all' || d.damage_type === damageFilter;
      const statusOk = statusFilter === 'all' || rowStatus.cls === statusFilter;
      const searchOk =
        search === '' ||
        d.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.reporter_name?.toLowerCase().includes(search.toLowerCase());
      return damageOk && statusOk && searchOk;
    });
  }, [damagedList, damageFilter, statusFilter, search]);

  // เรียง: เหลือ > 0 อยู่บน, ครบแล้วอยู่ล่าง
  const sortedDamagedList = [...filteredList].sort((a, b) => {
    const ra = Number(a.remaining_qty) || 0;
    const rb = Number(b.remaining_qty) || 0;
    if (ra > 0 && rb === 0) return -1;
    if (ra === 0 && rb > 0) return 1;
    return new Date(b.damaged_date) - new Date(a.damaged_date);
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedDamagedList.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = sortedDamagedList.slice(start, start + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handlePrev = () => currentPage > 1 && setCurrentPage(p => p - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(p => p + 1);

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

  const handleAction = async (damagedId, remaining, actionType) => {
    try {
      const { value: qty } = await Swal.fire({
        title: actionType === 'repaired' ? 'ซ่อมพัสดุ' : 'ทำลายพัสดุ',
        input: 'number',
        inputLabel: `จำนวนที่ต้องการ${actionType === 'repaired' ? 'ซ่อม' : 'ทำลาย'}`,
        inputAttributes: { min: 1, max: remaining },
        inputValue: remaining,
        showCancelButton: true,
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก',
        preConfirm: (val) => {
          const n = Number(val);
          if (isNaN(n) || n <= 0 || n > remaining) {
            Swal.showValidationMessage(`จำนวนต้องอยู่ระหว่าง 1 ถึง ${remaining}`);
            return false;
          }
          return n;
        },
      });

      if (!qty) return;

      // ✅ call API
      await axiosInstance.post(`/damaged/${damagedId}/action`, {
        damaged_id: damagedId,
        action_type: actionType,
        action_qty: qty,
      });

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'บันทึกการดำเนินการแล้ว',
        timer: 1500,
        showConfirmButton: false,
      });

      // reload ข้อมูล
      fetchDamaged();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกการดำเนินการได้',
      });
    }
  };


  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>จัดการพัสดุชำรุด</h1>
          </div>
        </div>

        {/* Toolbar ฟิลเตอร์ */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            {/* ประเภท */}
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="damageType">ประเภท</label>
              <Select
                inputId="damageType"
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                options={DAMAGE_OPTIONS}
                value={DAMAGE_OPTIONS.find(o => o.value === damageFilter) || null}
                onChange={(opt) => setDamageFilter(opt?.value || 'all')}
                styles={customSelectStyles}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={typeof window !== 'undefined' ? document.body : undefined}
              />
            </div>

            {/* สถานะ */}
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="status">สถานะ</label>
              <Select
                inputId="status"
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
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

          {/* ช่องค้นหา */}
          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="search">ค้นหา</label>
              <div className={styles.searchBox}>
                <input
                  id="search"
                  type="text"
                  className={styles.input}
                  placeholder="ค้นหาชื่อพัสดุ หรือผู้แจ้ง"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} 
            onClick={clearFilters}
            title="ล้างตัวกรอง"
            aria-label="ล้างตัวกรอง"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {loading ? (
          <p className={styles.infoMessage}>กำลังโหลดข้อมูล...</p>
        ) : (
          <div className={styles.tableFrame}>
            {/* ==== ตาราง (คงเดิม ไม่แก้) ==== */}
            {/* Header */}
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ชื่อพัสดุ</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวนที่ชำรุด</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>คงเหลือ</div>
              <div className={styles.headerItem}>วันที่แจ้งชำรุด</div>
              <div className={styles.headerItem}>ผู้แจ้ง</div>
              {/* <div className={styles.headerItem}>หมายเหตุ</div> */}
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>การดำเนินการ</div>
            </div>

            {/* Body */}
            <div className={styles.inventory} style={{ '--rows-per-page': itemsPerPage }}>
              {currentItems.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบรายการพัสดุชำรุด</div>
              ) : currentItems.map(d => (
                <div
                  key={d.damaged_id || `damaged-${d.item_name}-${d.damaged_date}`}
                  className={`${styles.tableGrid} ${styles.tableRow}`}
                >
                  <div className={styles.tableCell}>{d.item_name ?? '-'}</div>
                  <div className={styles.tableCell}>
                    {(() => {
                      const t = getDamageType(d.damage_type);
                      return <span className={`${styles.typeBadge} ${styles[t.cls]}`}>{t.text}</span>;
                    })()}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>{d.damaged_qty ?? 0}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>{d.remaining_qty ?? 0}</div>
                  <div className={styles.tableCell}>
                    {d.damaged_date ? new Date(d.damaged_date).toLocaleDateString('th-TH') : '-'}
                  </div>
                  <div className={styles.tableCell}>{d.reporter_name ?? '-'}</div>

                  {/* สถานะ */}
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {(() => {
                      const s = getRowStatus(d.damaged_qty, d.remaining_qty);
                      return <span className={`${styles.statusBadge} ${styles[s.cls]}`}>{s.text}</span>;
                    })()}
                  </div>
                  {/* จัดการ */}
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {(d.remaining_qty ?? 0) > 0 ? (
                      <div className={styles.actions}>
                        <button
                          className={`${styles.actionBtn} ${styles.btnRepair}`}
                          onClick={() => handleAction(d.damaged_id, d.remaining_qty, 'repaired')}
                          aria-label="ซ่อม"
                          title="ซ่อม"
                        >
                          <Wrench size={16} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.btnDispose}`}
                          onClick={() => handleAction(d.damaged_id, d.remaining_qty, 'disposed')}
                          aria-label="ทิ้ง"
                          title="ทิ้ง"
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
                      >
                        ดูประวัติ
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <ul className={styles.paginationControls}>
              <li>
                <button className={styles.pageButton} onClick={handlePrev} disabled={currentPage === 1}>
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
                  onClick={handleNext}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* ==== Popup History (คงเดิม) ==== */}
        {showHistory && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>ประวัติการดำเนินการ</h2>
              {selectedHistory.length === 0 ? (
                <p>ไม่มีข้อมูลประวัติ</p>
              ) : (
                <ul className={styles.historyList}>
                  {selectedHistory.map((a, idx) => (
                    <li key={idx}>
                      {a.action_type === 'repaired' && 'ซ่อม'}
                      {a.action_type === 'disposed' && 'ทำลาย'}
                      {a.action_type !== 'repaired' && a.action_type !== 'disposed' && a.action_type}
                      {' '} {a.action_qty} ชิ้น โดย {a.action_by_name}
                      {a.action_date && (
                        <span className={styles.historyDate}>
                          {' '}({new Date(a.action_date).toLocaleDateString('th-TH')})
                        </span>
                      )}
                      {a.note && <div className={styles.historyNote}>หมายเหตุ: {a.note}</div>}
                    </li>
                  ))}
                </ul>
              )}
              <button className={styles.closeBtn} onClick={() => setShowHistory(false)}>ปิด</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
