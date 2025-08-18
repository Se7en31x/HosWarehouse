'use client';
import { useEffect, useState } from 'react';
import axios from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

// This component manages expired items.
export default function ExpiredItemsPage() {
  const [expiredList, setExpiredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Fetches the list of expired lots from the backend.
  const fetchExpired = async () => {
    try {
      const res = await axios.get('/expired');
      const data = res.data;

      const hasInvalidItem = data.some(e => !e.item_id);
      if (hasInvalidItem) {
        setDataError('ข้อมูลบางรายการไม่สมบูรณ์: ไม่มี Item ID');
      } else {
        setDataError(null);
      }

      setExpiredList(data);
    } catch (err) {
      console.error('Error fetching expired items:', err);
      setDataError('ไม่สามารถดึงข้อมูลพัสดุหมดอายุได้');
    } finally {
      setLoading(false);
    }
  };

  // Handles the disposal action for a specific lot.
  const handleDispose = async (lotId, itemId, remainingQty) => {
    const { value: qty } = await Swal.fire({
      title: 'ระบุจำนวนที่จะทำลาย',
      input: 'number',
      inputLabel: `สามารถทำลายได้สูงสุด ${remainingQty} ชิ้น`,
      inputAttributes: { min: 1, max: remainingQty },
      inputValue: remainingQty,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      preConfirm: (value) => {
        if (!value || value <= 0) {
          Swal.showValidationMessage('กรุณาระบุจำนวนที่ถูกต้อง');
        } else if (value > remainingQty) {
          Swal.showValidationMessage('จำนวนเกินจากที่เหลืออยู่');
        }
      }
    });

    if (qty) {
      try {
        await axios.post(`/expired/action`, {
          lot_id: lotId,
          item_id: itemId,
          action_qty: parseInt(qty, 10),
          action_by: 1, // TODO: Replace with real user_id from auth
          note: ''
        });

        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: `ทำลาย ${qty} ชิ้นแล้ว`,
          timer: 2000
        });

        fetchExpired();
      } catch (err) {
        console.error('Error during disposal action:', err);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถบันทึกข้อมูลได้',
        });
      }
    }
  };

  // Fetch disposal history by lot_id
  const handleViewHistory = async (lotId) => {
  try {
    const res = await axios.get(`/expired/actions/${lotId}`);
    const history = res.data;

    if (history.length === 0) {
      Swal.fire('ยังไม่มีประวัติการทำลาย');
      return;
    }

    const htmlList = `
      <div style="max-height:300px; overflow-y:auto; padding:10px;">
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="background:#f1f5f9; text-align:left;">
              <th style="padding:8px; border-bottom:1px solid #ddd;">วันที่</th>
              <th style="padding:8px; border-bottom:1px solid #ddd;">จำนวน</th>
              <th style="padding:8px; border-bottom:1px solid #ddd;">ผู้ทำลาย</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(h => `
              <tr>
                <td style="padding:6px; border-bottom:1px solid #eee;">
                  ${new Date(h.action_date).toLocaleString('th-TH')}
                </td>
                <td style="padding:6px; border-bottom:1px solid #eee; color:#dc2626; font-weight:bold;">
                  ${h.action_qty} ชิ้น
                </td>
                <td style="padding:6px; border-bottom:1px solid #eee;">
                  ${h.action_by_name || 'ไม่ทราบ'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    Swal.fire({
      title: '📜 ประวัติการทำลาย',
      html: htmlList,
      width: 700,
      confirmButtonText: 'ปิด',
      confirmButtonColor: '#6366f1',
    });
  } catch (err) {
    console.error('Error fetching history:', err);
    Swal.fire('เกิดข้อผิดพลาดในการโหลดประวัติ');
  }
};

  useEffect(() => {
    fetchExpired();
  }, []);

  if (loading) {
    return <p>กำลังโหลดข้อมูล...</p>;
  }

  if (dataError) {
    return <div className={styles.errorContainer}>{dataError}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>จัดการพัสดุหมดอายุ</h1>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Lot Number</th>
              <th>ชื่อพัสดุ</th>
              <th>จำนวนทั้งหมด</th>
              <th>เหลือให้ทำลาย</th>
              <th>ทำลายแล้ว</th>
              <th>หน่วย</th>
              <th>วันที่หมดอายุ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {expiredList.map(e => (
              <tr key={e.lot_id}>
                <td>{e.lot_no || '-'}</td>
                <td>{e.item_name || '-'}</td>
                <td>{Number(e.qty_imported) || 0}</td>
                <td>{Number(e.qty_remaining) || 0}</td>
                <td>{Number(e.disposed_qty) || 0}</td>
                <td>{e.item_unit}</td>
                <td>{e.exp_date ? new Date(e.exp_date).toLocaleDateString('th-TH') : '-'}</td>
                <td>
                  {e.qty_remaining === 0
                    ? 'ทำลายครบแล้ว'
                    : e.disposed_qty > 0
                      ? 'ทำลายบางส่วนแล้ว'
                      : 'รอดำเนินการ'}
                </td>
                <td>
                  {e.qty_remaining > 0 && e.item_id ? (
                    <button
                      className={`${styles.actionBtn} ${styles.btnDispose}`}
                      onClick={() => handleDispose(e.lot_id, e.item_id, e.qty_remaining)}
                    >
                      ทำลาย
                    </button>
                  ) : (
                    <span className={styles.doneLabel}>ครบแล้ว</span>
                  )}
                  {/* ปุ่มดูประวัติ */}
                  <button
                    className={`${styles.actionBtn} ${styles.btnHistory}`}
                    onClick={() => handleViewHistory(e.lot_id)}
                  >
                    ประวัติ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
