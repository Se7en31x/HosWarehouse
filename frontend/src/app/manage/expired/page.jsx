'use client';
import { useEffect, useState, useMemo } from 'react';
import { manageAxios } from '@/app/utils/axiosInstance';
import { connectSocket, disconnectSocket } from '@/app/utils/socket';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Trash2, Clock, CheckCircle, X, Search, PackageCheck } from 'lucide-react';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import('react-select'), { ssr: false });

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

const STATUS_OPTIONS = [
  { value: 'all', label: 'สถานะทั้งหมด' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'partial', label: 'ทำลายบางส่วน' },
  { value: 'complete', label: 'ทำลายครบ' },
];

// ---- Alert ----
const AlertModal = ({ show, title, message, type, onClose }) => {
  if (!show) return null;
  const icon = type === 'success'
    ? <CheckCircle size={48} className={styles.alertIconSuccess} />
    : <X size={48} className={styles.alertIconError} />;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${styles.alertModal}`}>
        <div className={styles.alertIcon}>{icon}</div>
        <h2 className={styles.alertTitle}>{title}</h2>
        <p className={styles.alertMessage}>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.btnPrimary} onClick={onClose} aria-label="ปิดแจ้งเตือน">
            ตกลง
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Dispose ----
const DisposeModal = ({ show, onClose, disposeData, setDisposeData, onConfirm }) => {
  if (!show) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>ทำลายพัสดุ</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="ปิดหน้าต่างทำลาย">
            <X size={24} />
          </button>
        </div>
        <div className={styles.disposeBody}>
          <div className={styles.disposeInfoGroup}>
            <div className={styles.disposeInfoItem}>
              <span className={styles.disposeLabel}>Lot Number</span>
              <span className={styles.disposeValue}>{disposeData.lotNo}</span>
            </div>
            <div className={styles.disposeInfoItem}>
              <span className={styles.disposeLabel}>ชื่อพัสดุ</span>
              <span className={styles.disposeValue}>{disposeData.itemName}</span>
            </div>
          </div>
          <div className={styles.disposeInfoItem}>
            <span className={styles.disposeLabel}>จำนวนเหลือที่ต้องทำลาย</span>
            <span className={styles.disposeValue}>{disposeData.qty}</span>
          </div>
          <div className={styles.disposeInputGroup}>
            <label htmlFor="actionQty" className={styles.disposeLabel}>จำนวนที่ต้องการทำลาย</label>
            <input
              id="actionQty"
              type="number"
              min="1"
              max={disposeData.qty}
              value={disposeData.actionQty}
              onChange={(e) =>
                setDisposeData({
                  ...disposeData,
                  actionQty: Math.max(1, Math.min(disposeData.qty, Number(e.target.value))),
                })
              }
              className={styles.disposeInput}
              aria-label="จำนวนที่ต้องการทำลาย"
            />
          </div>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>ยกเลิก</button>
          <button className={styles.btnPrimary} onClick={onConfirm}>ยืนยันการทำลาย</button>
        </div>
      </div>
    </div>
  );
};

// ---- History ----
const HistoryModal = ({ show, onClose, historyData }) => {
  if (!show) return null;
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>ประวัติการทำลาย</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="ปิดหน้าต่างประวัติ">
            <X size={24} />
          </button>
        </div>
        {historyData.length === 0 ? (
          <p className={styles.noHistoryMessage}>ไม่มีข้อมูลประวัติการทำลาย</p>
        ) : (
          <div className={styles.historyTableContainer}>
            <table className={styles.historyTable}>
              <thead>
                <tr>
                  <th className={styles.historyTh}>วันที่</th>
                  <th className={styles.historyTh}>จำนวน</th>
                  <th className={styles.historyTh}>ผู้ทำรายการ</th>
                  <th className={styles.historyTh}>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((a, idx) => (
                  <tr key={idx} className={styles.historyTr}>
                    <td className={styles.historyTd}>{new Date(a.action_date).toLocaleDateString('th-TH')}</td>
                    <td className={styles.historyTd}>{a.action_qty}</td>
                    <td className={styles.historyTd}>{a.action_by_name || '-'}</td>
                    <td className={styles.historyTd}>{a.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.modalActions}>
          <button className={styles.btnSecondary} onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  );
};

export default function ExpiredItemsPage() {
  const [expiredList, setExpiredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showDisposeModal, setShowDisposeModal] = useState(false);
  const [disposeData, setDisposeData] = useState(null);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertInfo, setAlertInfo] = useState({ title: '', message: '', type: '' });

  const menuPortalTarget = useMemo(
    () => (typeof window !== 'undefined' ? document.body : null),
    []
  );

  // load
  const fetchExpired = async () => {
    try {
      setLoading(true);
      const res = await manageAxios.get('/expired');
      if (Array.isArray(res.data)) {
        setExpiredList(res.data.filter(Boolean));
      } else {
        setExpiredList([]);
        setDataError('ข้อมูลที่ได้รับไม่ถูกต้อง');
      }
    } catch (err) {
      setDataError('ไม่สามารถดึงข้อมูลพัสดุหมดอายุได้');
    } finally {
      setLoading(false);
    }
  };

  // socket realtime
  useEffect(() => {
    let isMounted = true;
    fetchExpired();

    const socket = connectSocket();
    const handleUpdate = () => { if (isMounted) fetchExpired(); };

    socket.on('itemAdded', handleUpdate);
    socket.on('itemUpdated', handleUpdate);
    socket.on('itemLotUpdated', handleUpdate);
    socket.on('itemDeleted', handleUpdate);

    return () => {
      isMounted = false;
      socket.off('itemAdded', handleUpdate);
      socket.off('itemUpdated', handleUpdate);
      socket.off('itemLotUpdated', handleUpdate);
      socket.off('itemDeleted', handleUpdate);
      disconnectSocket();
    };
  }, []);

  // reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter]);

  // open modals
  const openDisposeModal = (lotId, itemId, itemName, lotNo, qty) => {
    setDisposeData({ lotId, itemId, itemName, lotNo, qty, actionQty: qty });
    setShowDisposeModal(true);
  };
  const openHistoryModal = async (lotId) => {
    try {
      const res = await manageAxios.get(`/expired/actions/${lotId}`);
      setHistoryData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
      setShowHistoryModal(true);
    } catch {
      setAlertInfo({ title: 'ข้อผิดพลาด', message: 'ไม่สามารถดึงข้อมูลประวัติได้', type: 'error' });
      setShowAlertModal(true);
    }
  };

  // filter + sort
  const filteredList = useMemo(() => {
    return expiredList
      .filter((e) => {
        const remaining = (Number(e.expired_qty) || 0) - (Number(e.disposed_qty) || 0);
        const status = remaining === 0 ? 'complete' : Number(e.disposed_qty) > 0 ? 'partial' : 'pending';
        const okStatus = statusFilter === 'all' || statusFilter === status;
        const q = search.trim().toLowerCase();
        const okSearch = !q || e.item_name?.toLowerCase().includes(q) || e.lot_no?.toLowerCase().includes(q);
        return okStatus && okSearch;
      })
      .sort((a, b) => {
        const ra = (Number(a.expired_qty) || 0) - (Number(a.disposed_qty) || 0);
        const rb = (Number(b.expired_qty) || 0) - (Number(b.disposed_qty) || 0);
        if (ra === 0 && rb !== 0) return -1;
        if (rb === 0 && ra !== 0) return 1;
        if (ra !== rb) return ra - rb;
        return (a.item_name || '').localeCompare(b.item_name || '');
      });
  }, [expiredList, search, statusFilter]);

  // pagination math + clamp
  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const start = (currentPage - 1) * itemsPerPage;
  const startDisplay = filteredList.length ? start + 1 : 0;
  const endDisplay = Math.min(start + itemsPerPage, filteredList.length);
  const currentItems = filteredList.slice(start, start + itemsPerPage);

  // filler rows (blank bars like screenshot)
  const fillerCount = Math.max(0, itemsPerPage - currentItems.length);
  const fillerRows = Array.from({ length: fillerCount });

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
    setSearch('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
               จัดการของหมดอายุ
            </h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="status">สถานะ</label>
              <Select
                inputId="status"
                isClearable isSearchable={false}
                placeholder="เลือกสถานะ..."
                options={STATUS_OPTIONS}
                value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
                onChange={(opt) => setStatusFilter(opt?.value || 'all')}
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.inputIcon} />
              <input
                id="search" type="text" className={styles.input}
                placeholder="ค้นหาด้วยชื่อ หรือ Lot No..."
                value={search} onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingContainer} />
        ) : dataError ? (
          <div className={styles.noDataMessage}>{dataError}</div>
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>Lot Number</div>
              <div className={styles.headerItem}>รายการ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวนหมดอายุ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>เหลือให้ทำลาย</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>ทำลายแล้ว</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>หน่วย</div>
              <div className={styles.headerItem}>วันที่หมดอายุ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>การดำเนินการ</div>
            </div>

            <div className={styles.inventory} style={{ '--rows-per-page': `${itemsPerPage}` }}>
              {/* แสดงรายการจริง */}
              {currentItems.map((e, idx) => {
                const remaining = (Number(e.expired_qty) || 0) - (Number(e.disposed_qty) || 0);
                const statusText =
                  remaining === 0 ? 'ทำลายครบ' : Number(e.disposed_qty) > 0 ? 'ทำลายบางส่วน' : 'รอดำเนินการ';
                const statusClass =
                  remaining === 0 ? styles.statusComplete
                    : Number(e.disposed_qty) > 0 ? styles.statusPartial
                    : styles.statusPending;

                return (
                  <div key={`${e.lot_id}-${e.item_id}-${idx}`} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell} title={e.lot_no}>{e.lot_no || '-'}</div>
                    <div className={styles.tableCell} title={e.item_name}>{e.item_name || '-'}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{Number(e.expired_qty) || 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{remaining}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{Number(e.disposed_qty) || 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{e.item_unit || '-'}</div>
                    <div className={styles.tableCell}>{e.exp_date ? new Date(e.exp_date).toLocaleDateString('th-TH') : '-'}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.stBadge} ${statusClass}`}>{statusText}</span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {remaining > 0 && e.item_id ? (
                        <div className={styles.actions}>
                          <button
                            className={`${styles.actionButton} ${styles.btnDispose}`}
                            onClick={() => openDisposeModal(e.lot_id, e.item_id, e.item_name, e.lot_no, remaining)}
                            title="ทำลายพัสดุ"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.btnHistory}`}
                            onClick={() => openHistoryModal(e.lot_id)}
                            title="ดูประวัติ"
                          >
                            <Clock size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actions}>
                          <span className={`${styles.doneIcon} ${styles.placeholder}`}><CheckCircle size={18} /></span>
                          <button className={`${styles.actionButton} ${styles.btnHistory}`} onClick={() => openHistoryModal(e.lot_id)} title="ดูประวัติ">
                            <Clock size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* เติมแถวว่าง: ซ่อนคอนเทนต์ให้ดูเป็นแถบว่างตามภาพ */}
              {fillerRows.map((_, i) => (
                <div key={`placeholder-${i}`} className={`${styles.tableGrid} ${styles.tableRow} ${styles.placeholderRow}`}>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                </div>
              ))}
            </div>

            {/* Pagination แสดงตลอด */}
            <div className={styles.paginationControls}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredList.length} รายการ
              </div>
              <ul className={styles.paginationButtons}>
                <li>
                  <button className={styles.pageButton} onClick={handlePrev} disabled={currentPage === 1}>
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
                        disabled={totalPages === 1}
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
          </div>
        )}

        {/* Modals */}
        <DisposeModal
          show={showDisposeModal}
          onClose={() => setShowDisposeModal(false)}
          disposeData={disposeData}
          setDisposeData={setDisposeData}
          onConfirm={async () => {
            try {
              await manageAxios.post(`/expired/action`, {
                lot_id: disposeData.lotId,
                item_id: disposeData.itemId,
                action_qty: disposeData.actionQty,
                note: 'ทำลายเนื่องจากหมดอายุ',
                action_by: 999
              });
              setAlertInfo({ title: 'บันทึกสำเร็จ', message: `ทำลาย Lot ${disposeData.lotNo} จำนวน ${disposeData.actionQty} ชิ้นแล้ว`, type: 'success' });
              setShowAlertModal(true);
              setShowDisposeModal(false);
              fetchExpired();
            } catch {
              setAlertInfo({ title: 'เกิดข้อผิดพลาด', message: 'ไม่สามารถบันทึกการทำลายได้', type: 'error' });
              setShowAlertModal(true);
            }
          }}
        />

        <HistoryModal show={showHistoryModal} onClose={() => setShowHistoryModal(false)} historyData={historyData} />

        <AlertModal show={showAlertModal} title={alertInfo.title} message={alertInfo.message} type={alertInfo.type} onClose={() => setShowAlertModal(false)} />
      </div>
    </div>
  );
}
