'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import styles from './page.module.css';
import Link from 'next/link';
import Swal from 'sweetalert2';

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const userId = 1; // จำลองผู้ใช้ก่อน

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get(`/my-requests?user_id=${userId}`);
      setRequests(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดคำขอได้', 'error');
    }
  };

  const handleCancel = async (requestId) => {
    const confirm = await Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'ต้องการยกเลิกคำขอนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกเลิกเลย',
      cancelButtonText: 'ไม่',
    });

    if (confirm.isConfirmed) {
      try {
        const res = await axiosInstance.put(`/my-requests/${requestId}/cancel`, {
          user_id: userId,
        });
        Swal.fire('สำเร็จ', 'ยกเลิกคำขอเรียบร้อยแล้ว', 'success');
        fetchRequests(); // โหลดข้อมูลใหม่
      } catch (err) {
        console.error(err);
        Swal.fire('ผิดพลาด', 'ไม่สามารถยกเลิกคำขอได้', 'error');
      }
    }
  };

  const translateRequestTypes = (types) => {
    if (!types) return '-';

    const mapType = {
      withdraw: 'การเบิก',
      borrow: 'การยืม',
      return: 'คืน',
    };

    const arrTypes = types.split(',');

    const uniqueTranslated = [...new Set(
      arrTypes.map(t => {
        if (!t) return '-';
        const key = t.toLowerCase();
        return mapType[key] || t;
      })
    )];

    return uniqueTranslated.join(' และ ');
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>รายการคำขอของฉัน</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>รหัสคำขอ</th>
            <th>วันที่/เวลา</th>
            <th>ประเภท</th>
            <th>สถานะ</th>
            <th>จำนวนรายการ</th>
            <th>การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req, index) => (
            <tr key={req.request_id}>
              <td>{index + 1}</td>
              <td>{req.request_code || '-'}</td>
              <td>
                {new Date(req.request_date).toLocaleDateString()} เวลา{' '}
                {new Date(req.request_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </td>
              <td>{translateRequestTypes(req.request_types)}</td>
              <td>{req.request_status}</td>
              <td>{req.item_count}</td>
              <td className={styles.actions}>
                <Link href={`/staff/my-request-detail/${req.request_id}`}>
                  <button className={styles.view}>ดู</button>
                </Link>
                {req.request_status === 'รอดำเนินการ' && (
                  <>
                    <Link href={`/staff/my-request-detail/${req.request_id}/edit`}>
                      <button className={styles.edit}>แก้ไข</button>
                    </Link>
                    <button
                      className={styles.cancel}
                      onClick={() => handleCancel(req.request_id)}
                    >
                      ยกเลิก
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {requests.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.empty}>
                ไม่มีคำขอในระบบ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
