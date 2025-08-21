'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import { connectSocket, disconnectSocket } from '@/app/utils/socket';
import { ChevronLeft, ChevronRight, Wrench, Trash2 } from 'lucide-react';



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

  // Pagination (สอดคล้องทุกหน้า, ล็อก 12 แถว)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const totalPages = Math.max(1, Math.ceil(damagedList.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = damagedList.slice(start, start + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

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

  const handleAction = async (id, remainingQty, actionType) => {
    const actionText = actionType === 'repaired' ? 'ซ่อม' : 'ทิ้ง';
    const { value: qty } = await Swal.fire({
      title: `ระบุจำนวนที่จะ${actionText}`,
      input: 'number',
      inputLabel: `สามารถดำเนินการได้สูงสุด ${remainingQty} ชิ้น`,
      inputAttributes: { min: 1, max: remainingQty, step: 1 },
      inputValue: remainingQty > 0 ? 1 : 0,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      preConfirm: (value) => {
        const v = parseInt(value, 10);
        if (isNaN(v) || v <= 0) {
          Swal.showValidationMessage('กรุณาระบุจำนวนที่ถูกต้องและมากกว่า 0');
        } else if (v > remainingQty) {
          Swal.showValidationMessage('จำนวนเกินจากที่เหลืออยู่');
        }
      }
    });

    if (!qty) return;

    try {
      await axiosInstance.post(`/damaged/${id}/action`, {
        action_type: actionType,
        action_qty: parseInt(qty, 10),
      });
      Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: `${actionText} ${qty} ชิ้นแล้ว`, timer: 1800 });
      // ให้ socket แจ้งเตือนแล้วค่อยโหลดใหม่
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้' });
    }
  };

  useEffect(() => {
    const socket = connectSocket(() => {
      // ได้สัญญาณอัปเดต → โหลดใหม่
      fetchDamaged();
    });
    fetchDamaged();
    return () => { disconnectSocket(); };
  }, []);

  const handlePrev = () => currentPage > 1 && setCurrentPage(p => p - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(p => p + 1);

  // เลขหน้า + "..." (เหมือนทุกหน้า)
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

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>จัดการพัสดุชำรุด</h1>
          </div>
        </div>

        {loading ? (
          <p className={styles.infoMessage}>กำลังโหลดข้อมูล...</p>
        ) : (
          <div className={styles.tableFrame}>
            {/* Header (grid เหมือน body) */}
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ชื่อพัสดุ</div>
              <div className={styles.headerItem}>ประเภทความเสียหาย</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวนที่ชำรุด</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>เหลือให้ดำเนินการ</div>
              <div className={styles.headerItem}>วันที่ชำรุด</div>
              <div className={styles.headerItem}>ผู้แจ้ง</div>
              <div className={styles.headerItem}>หมายเหตุ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จัดการ</div>
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
                  <div className={styles.tableCell}>
                    <span className={styles.ellipsisText}>{d.note ?? '-'}</span>
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {(() => {
                      const s = getRowStatus(d.damaged_qty, d.remaining_qty);
                      return <span className={`${styles.statusBadge} ${styles[s.cls]}`}>{s.text}</span>;
                    })()}
                  </div>
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
                          {/* <span>ซ่อม</span> */}
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.btnDispose}`}
                          onClick={() => handleAction(d.damaged_id, d.remaining_qty, 'disposed')}
                          aria-label="ทิ้ง"
                          title="ทิ้ง"
                        >
                          <Trash2 size={16} />
                          {/* <span>ทิ้ง</span> */}
                        </button>
                      </div>
                    ) : (
                      <span className={styles.doneLabel}>ครบแล้ว</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination (เหมือนทุกหน้า) */}
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
      </div>
    </div>
  );
}
