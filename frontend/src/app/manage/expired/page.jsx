'use client';
import { useEffect, useState, useMemo } from 'react';
import axios from '@/app/utils/axiosInstance';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Trash2, Clock, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import Swal from "sweetalert2";

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

/* สถานะที่เลือกได้ */
const STATUS_OPTIONS = [
  { value: 'all', label: 'สถานะทั้งหมด' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'partial', label: 'ทำลายบางส่วน' },
  { value: 'complete', label: 'ทำลายครบ' },
];

export default function ExpiredItemsPage() {
  const [expiredList, setExpiredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ✅ modal states
  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [disposeData, setDisposeData] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  // โหลดข้อมูล
  const fetchExpired = async () => {
    try {
      const res = await axios.get('/expired');
      const data = Array.isArray(res.data) ? res.data : [];
      setExpiredList(data);
    } catch (err) {
      setDataError('ไม่สามารถดึงข้อมูลพัสดุหมดอายุได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExpired(); }, []);

  // 👉 เปิด modal ทำลาย
  const openDisposeModal = (lotId, itemId, itemName, lotNo, qty) => {
    setDisposeData({ lotId, itemId, itemName, lotNo, qty, actionQty: qty });
    setShowDisposeModal(true);
  };
  // 👉 บันทึกทำลาย
  const confirmDispose = async () => {
    try {
      await axios.post(`/expired/action`, {
        lot_id: disposeData.lotId,
        item_id: disposeData.itemId,
        action_qty: disposeData.actionQty,
        note: 'ทำลายเนื่องจากหมดอายุ',
        action_by: 999
      });

      // ✅ ใช้ Swal แจ้งเตือนสำเร็จ
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: `ทำลาย Lot ${disposeData.lotId} จำนวน ${disposeData.actionQty} ชิ้นแล้ว`,
        confirmButtonText: 'ตกลง'
      });

      setShowDisposeModal(false); // ปิด modal
      fetchExpired(); // reload ข้อมูล
    } catch (err) {
      console.error("confirmDispose error:", err);

      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกการทำลายได้',
        confirmButtonText: 'ปิด'
      });
    }
  };

  // 👉 เปิด modal ประวัติ
  const openHistoryModal = async (lotId) => {
    try {
      const res = await axios.get(`/expired/actions/${lotId}`);
      setHistoryData(Array.isArray(res.data) ? res.data : []);
      setShowHistoryModal(true);
    } catch (err) {
      alert('❌ ไม่สามารถดึงข้อมูลประวัติได้');
    }
  };

  // Filter
  const filteredList = useMemo(() => {
    return expiredList.filter(e => {
      const remaining = (Number(e.expired_qty) || 0) - (Number(e.disposed_qty) || 0);
      const status = remaining === 0 ? 'complete' : (e.disposed_qty > 0 ? 'partial' : 'pending');

      const okStatus = statusFilter === 'all' || statusFilter === status;
      const okSearch =
        e.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.lot_no?.toLowerCase().includes(search.toLowerCase());

      return okStatus && okSearch;
    });
  }, [expiredList, search, statusFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredList.slice(start, start + itemsPerPage);

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
    setSearch('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>จัดการของหมดอายุ</h1>
        </div>

        {/* ✅ Toolbar */}
        <div className={styles.toolbar}>
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

          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="search">ค้นหา</label>
              <input
                id="search"
                type="text"
                className={styles.input}
                placeholder="ค้นหาชื่อพัสดุ หรือ Lot No."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* ✅ Table */}
        {loading && <p className={styles.infoMessage}>กำลังโหลดข้อมูล...</p>}
        {!loading && currentItems.length === 0 && <p className={styles.noDataMessage}></p>}

        {!loading && (
          <div className={styles.tableFrame}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>Lot Number</div>
              <div className={styles.headerItem}>ชื่อพัสดุ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวนหมดอายุ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>เหลือให้ทำลาย</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>ทำลายแล้ว</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>หน่วย</div>
              <div className={styles.headerItem}>วันที่หมดอายุ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>การดำเนินการ</div>
            </div>

            <div className={styles.inventory} style={{ '--rows-per-page': itemsPerPage }}>
              {currentItems.map((e, idx) => {
                const remainingToDispose = (Number(e.expired_qty) || 0) - (Number(e.disposed_qty) || 0);

                const statusText =
                  remainingToDispose === 0
                    ? 'ทำลายครบ'
                    : (Number(e.disposed_qty) || 0) > 0
                      ? 'ทำลายบางส่วน'
                      : 'รอดำเนินการ';

                const statusClass =
                  remainingToDispose === 0
                    ? styles.statusComplete
                    : (Number(e.disposed_qty) || 0) > 0
                      ? styles.statusPartial
                      : styles.statusPending;

                return (
                  <div key={`${e.lot_id}-${e.item_id}-${idx}`} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{e.lot_no || '-'}</div>
                    <div className={styles.tableCell}>{e.item_name || '-'}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{Number(e.expired_qty) || 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{remainingToDispose}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{Number(e.disposed_qty) || 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{e.item_unit || '-'}</div>
                    <div className={styles.tableCell}>
                      {e.exp_date ? new Date(e.exp_date).toLocaleDateString('th-TH') : '-'}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.statusBadge} ${statusClass}`}>{statusText}</span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {remainingToDispose > 0 && e.item_id ? (
                        <div className={styles.actions}>
                          <button
                            className={`${styles.actionBtn} ${styles.btnDispose}`}
                            onClick={() => openDisposeModal(e.lot_id, e.item_id, e.item_name, e.lot_no, remainingToDispose)}
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.btnHistory}`}
                            onClick={() => openHistoryModal(e.lot_id)}
                          >
                            <Clock size={16} /> ประวัติ
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actions}>
                          <span className={styles.doneIcon}>
                            <CheckCircle size={18} />
                          </span>
                          <button
                            className={`${styles.actionBtn} ${styles.btnHistory}`}
                            onClick={() => openHistoryModal(e.lot_id)}
                          >
                            <Clock size={16} /> ประวัติ
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                <button className={styles.pageButton} onClick={handleNext} disabled={currentPage >= totalPages}>
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* ✅ Modal ทำลาย */}
        {showDisposeModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>ทำลาย Lot {disposeData.lotNo}</h2>   {/* 👈 ใช้ lotNo */}
              <p>ชื่อพัสดุ: {disposeData.itemName}</p>
              <p>เหลือให้ทำลาย: {disposeData.qty} ชิ้น</p>
              <input
                type="number"
                min="1"
                max={disposeData.qty}
                value={disposeData.actionQty}
                onChange={(e) =>
                  setDisposeData({ ...disposeData, actionQty: Number(e.target.value) })
                }
                className={styles.input}
              />
              <div className={styles.modalActions}>
                <button className={styles.btnPrimary} onClick={confirmDispose}>
                  ยืนยัน
                </button>
                <button
                  className={styles.btnSecondary}
                  onClick={() => setShowDisposeModal(false)}
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Modal ประวัติ (ปรับแก้ส่วนนี้) */}
        {showHistoryModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2>ประวัติการทำลาย</h2>
              {historyData.length === 0 ? (
                <p>ไม่มีข้อมูลประวัติ</p>
              ) : (
                // ✅ เพิ่ม div ใหม่เพื่อจัดการ overflow
                <div className={styles.historyTableContainer}>
                  <table className={styles.historyTable}>
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>จำนวน</th>
                        <th>ผู้ทำรายการ</th>
                        <th>หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map((a, idx) => (
                        <tr key={idx}>
                          <td>{new Date(a.action_date).toLocaleDateString('th-TH')}</td>
                          <td>{a.action_qty}</td>
                          <td>{a.action_by_name || '-'}</td>
                          <td>{a.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={styles.modalActions}>
                <button className={styles.btnPrimary} onClick={() => setShowHistoryModal(false)}>ปิด</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}