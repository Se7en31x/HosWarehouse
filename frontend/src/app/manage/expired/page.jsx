'use client';
import { useEffect, useState, useMemo } from 'react';
import axios from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import { ChevronLeft, ChevronRight, Trash2, Clock, CheckCircle } from 'lucide-react';

export default function ExpiredItemsPage() {
  const [expiredList, setExpiredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // pagination unified
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const totalPages = Math.max(1, Math.ceil(expiredList.length / itemsPerPage));
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = expiredList.slice(start, start + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  // ✅ ตั้งค่า SweetAlert ให้เข้าธีมเดียวกัน
  const swal = useMemo(
    () =>
      Swal.mixin({
        customClass: {
          popup: styles.swalPopup,
          title: styles.swalTitle,
          confirmButton: styles.swalConfirm,
          cancelButton: styles.swalCancel,
          actions: styles.swalActions,
          htmlContainer: styles.swalHtml
        },
        buttonsStyling: false
      }),
    []
  );

  const fetchExpired = async () => {
    try {
      const res = await axios.get('/expired');
      const data = Array.isArray(res.data) ? res.data : [];

      const hasInvalidItem = data.some(e => !e.item_id);
      setDataError(hasInvalidItem ? 'ข้อมูลบางรายการไม่สมบูรณ์: ไม่มี Item ID' : null);

      setExpiredList(data);
    } catch (err) {
      console.error('Error fetching expired items:', err);
      setDataError('ไม่สามารถดึงข้อมูลพัสดุหมดอายุได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDispose = async (lotId, itemId, remainingQty) => {
    const { value: qty } = await swal.fire({
      title: 'ระบุจำนวนที่จะทำลาย',
      input: 'number',
      inputLabel: `สามารถทำลายได้สูงสุด ${remainingQty} ชิ้น`,
      inputAttributes: { min: 1, max: remainingQty, step: 1 },
      inputValue: remainingQty,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      focusConfirm: false,
      didOpen: () => {
        const input = Swal.getInput();
        if (input) input.classList.add(styles.swalInput);
      },
      preConfirm: (value) => {
        const v = parseInt(value, 10);
        if (!v || v <= 0) {
          Swal.showValidationMessage('กรุณาระบุจำนวนที่ถูกต้อง');
        } else if (v > remainingQty) {
          Swal.showValidationMessage('จำนวนเกินจากที่เหลืออยู่');
        }
      }
    });

    if (!qty) return;

    try {
      await axios.post(`/expired/action`, {
        lot_id: lotId,
        item_id: itemId,
        action_qty: parseInt(qty, 10),
        action_by: 1, // TODO: ใช้ user_id จริงจาก auth
        note: ''
      });
      swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: `ทำลาย ${qty} ชิ้นแล้ว`, confirmButtonText: 'ตกลง' });
      fetchExpired();
    } catch (err) {
      console.error('Error during disposal action:', err);
      swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อมูลได้' });
    }
  };

  const handleViewHistory = async (lotId) => {
    try {
      const res = await axios.get(`/expired/actions/${lotId}`);
      const history = Array.isArray(res.data) ? res.data : [];

      if (history.length === 0) {
        await swal.fire({
          title: '🕒 ยังไม่มีประวัติการทำลาย',
          icon: 'info',
          confirmButtonText: 'ปิด',
        });
        return;
      }

      const htmlList = `
        <div class="swal-history">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>จำนวน</th>
                <th>ผู้ทำลาย</th>
              </tr>
            </thead>
            <tbody>
              ${history
          .map(
            (h) => `
                <tr>
                  <td>${new Date(h.action_date).toLocaleString('th-TH')}</td>
                  <td class="qty">${h.action_qty} ชิ้น</td>
                  <td>${h.action_by_name || 'ไม่ทราบ'}</td>
                </tr>`
          )
          .join('')}
            </tbody>
          </table>
        </div>
      `;

      await swal.fire({
        title: '📜 ประวัติการทำลาย',
        html: htmlList,
        width: 720,
        confirmButtonText: 'ปิด'
      });
    } catch (err) {
      console.error('Error fetching history:', err);
      swal.fire('เกิดข้อผิดพลาดในการโหลดประวัติ');
    }
  };

  useEffect(() => { fetchExpired(); }, []);

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

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>จัดการพัสดุหมดอายุ</h1>
          </div>
        </div>

        {loading && <p className={styles.infoMessage}>กำลังโหลดข้อมูล...</p>}
        {dataError && !loading && <p className={styles.errorMessage}>{dataError}</p>}

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
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จัดการ</div>
            </div>

            <div className={styles.inventory} style={{ '--rows-per-page': itemsPerPage }}>
              {currentItems.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบรายการพัสดุหมดอายุ</div>
              ) : currentItems.map(e => {
                const remainingToDispose = (Number(e.expired_qty) || 0) - (Number(e.disposed_qty) || 0);

                const statusText =
                  remainingToDispose === 0
                    ? 'ทำลายครบแล้ว'
                    : (Number(e.disposed_qty) || 0) > 0
                      ? 'ทำลายบางส่วนแล้ว'
                      : 'รอดำเนินการ';

                const statusClass =
                  remainingToDispose === 0
                    ? styles.statusComplete
                    : (Number(e.disposed_qty) || 0) > 0
                      ? styles.statusPartial
                      : styles.statusPending;

                return (
                  <div key={e.lot_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
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
                            onClick={() => handleDispose(e.lot_id, e.item_id, remainingToDispose)}
                            aria-label="ทำลาย"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.btnHistory}`}
                            onClick={() => handleViewHistory(e.lot_id)}
                            aria-label="ประวัติ"
                            title="ประวัติ"
                          >
                            <Clock size={16} />
                            <span>ประวัติ</span>
                          </button>
                        </div>
                      ) : (
                        <div className={styles.actions}>
                          <span className={styles.doneIcon} aria-label="ทำลายครบแล้ว" title="ทำลายครบแล้ว">
                            <CheckCircle size={18} />
                          </span>
                          <button
                            className={`${styles.actionBtn} ${styles.btnHistory}`}
                            onClick={() => handleViewHistory(e.lot_id)}
                            aria-label="ประวัติ"
                            title="ประวัติ"
                          >
                            <Clock size={16} />
                            <span>ประวัติ</span>
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
