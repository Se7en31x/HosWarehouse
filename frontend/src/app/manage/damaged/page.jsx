'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

// Import functions from your separate socket file
import { connectSocket, disconnectSocket } from '@/app/utils/socket';

export default function DamagedItemsPage() {
  const [damagedList, setDamagedList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to fetch damaged items from the server
  const fetchDamaged = async () => {
    try {
      const res = await axiosInstance.get('/damaged');
      setDamagedList(res.data);
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

  // Function to handle repair or dispose action
  const handleAction = async (id, remainingQty, actionType) => {
    const actionText = actionType === 'repaired' ? 'ซ่อม' : 'ทิ้ง';
    const { value: qty } = await Swal.fire({
      title: `ระบุจำนวนที่จะ${actionText}`,
      input: 'number',
      inputLabel: `สามารถดำเนินการได้สูงสุด ${remainingQty} ชิ้น`,
      inputAttributes: {
        min: 1,
        max: remainingQty,
        step: 1
      },
      inputValue: remainingQty > 0 ? 1 : 0,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      preConfirm: (value) => {
        const parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue) || parsedValue <= 0) {
          Swal.showValidationMessage('กรุณาระบุจำนวนที่ถูกต้องและมากกว่า 0');
        } else if (parsedValue > remainingQty) {
          Swal.showValidationMessage('จำนวนเกินจากที่เหลืออยู่');
        }
      }
    });

    if (qty) {
      const parsedQty = parseInt(qty, 10);
      try {
        await axiosInstance.post(`/damaged/${id}/action`, {
          action_type: actionType,
          action_qty: parsedQty
        });

        // ✅ ตอนนี้เราจะให้ WebSocket เป็นตัวจัดการการอัปเดตหน้าจอเพียงอย่างเดียว
        // ไม่ต้องเรียก updateLocalItem() ตรงนี้แล้ว

        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: `${actionText} ${parsedQty} ชิ้นแล้ว`,
          timer: 2000
        });
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถบันทึกข้อมูลได้',
        });
      }
    }
  };

  useEffect(() => {
    // Connect to the socket and set the listener for 'damagedUpdated'
    const socket = connectSocket(() => {
      console.log('✅ Received WebSocket update, fetching new data...');
      // ✅ เมื่อได้รับการแจ้งเตือนจาก WebSocket ให้เรียกฟังก์ชัน fetchDamaged เพื่อดึงข้อมูลล่าสุดทั้งหมด
      fetchDamaged();
    });

    // Fetch initial data
    fetchDamaged();

    // Clean up function to disconnect the socket when the component unmounts
    return () => {
      disconnectSocket();
    };
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>จัดการพัสดุชำรุด</h1>
      <div className={styles.tableWrapper}>
        <table className={styles.table}><thead>
          <tr>
            <th>ชื่อพัสดุ</th>
            <th>ประเภทความเสียหาย</th>
            <th>จำนวนที่ชำรุด</th>
            <th>เหลือให้ดำเนินการ</th>
            <th>วันที่ชำรุด</th>
            <th>ผู้แจ้ง</th>
            <th>หมายเหตุ</th>
            <th>สถานะ</th>
            <th>จัดการ</th>
          </tr>
        </thead><tbody>
            {damagedList.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center' }}>ไม่พบรายการพัสดุชำรุด</td>
              </tr>
            ) : (
              damagedList.map(d => (
                <tr key={d.damaged_id || `damaged-item-${d.item_name}-${Math.random()}`}>
                  <td>{d.item_name ?? '-'}</td>
                  <td>{d.damage_type === 'damaged' ? 'ชำรุด' : d.damage_type === 'lost' ? 'สูญหาย' : '-'}</td>
                  <td>{d.damaged_qty ?? 0}</td>
                  <td>{d.remaining_qty ?? 0}</td>
                  <td>{d.damaged_date ? new Date(d.damaged_date).toLocaleDateString() : '-'}</td>
                  <td>{d.reporter_name ?? '-'}</td>
                  <td>{d.note ?? '-'}</td>
                  <td>{d.remaining_qty > 0 ? 'รอดำเนินการ' : 'ดำเนินการครบแล้ว'}</td>
                  <td>
                    {d.remaining_qty > 0 && (
                      <>
                        <button
                          className={`${styles.actionBtn} ${styles.btnRepair}`}
                          onClick={() => handleAction(d.damaged_id, d.remaining_qty, 'repaired')}
                        >
                          ซ่อม
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.btnDispose}`}
                          onClick={() => handleAction(d.damaged_id, d.remaining_qty, 'disposed')}
                        >
                          ทิ้ง
                        </button>
                      </>
                    )}
                    {d.remaining_qty <= 0 && (
                      <span className={styles.doneLabel}>ครบแล้ว</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody></table>
      </div>
    </div>
  );
}
