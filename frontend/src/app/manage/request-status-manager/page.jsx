'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import axiosInstance from '../../utils/axiosInstance';
import styles from './page.module.css';

export default function RequestStatusManagerPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get('/requestStstus');
      setRequests(res.data);
    } catch (err) {
      console.error('โหลดคำขอล้มเหลว', err);
      alert('โหลดคำขอไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className={styles.loading}>กำลังโหลดข้อมูล...</p>;

  if (requests.length === 0)
    return <p className={styles.noData}>ไม่พบคำขอ</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>จัดการสถานะคำขอทั้งหมด</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>รหัสคำขอ</th>
            <th>ผู้ขอ</th>
            <th>แผนก</th>
            <th>วันที่ขอ</th>
            <th>เวลา</th>
            <th>วันที่นำส่ง</th>
            <th>สถานะปัจจุบัน</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.request_id}>
              <td>{r.request_code}</td>
              <td>{r.user_name}</td>
              <td>{r.department}</td>
              <td>{new Date(r.request_date).toLocaleDateString('th-TH')}</td>
              <td>{new Date(r.request_date).toLocaleTimeString('th-TH')}</td>
              <td>{new Date(r.request_due_date).toLocaleDateString('th-TH')}</td>
              <td>
                <span className={`${styles.statusBadge} ${styles[r.request_status.replace(/\s+/g, '').toLowerCase()]}`}>
                  {r.request_status}
                </span>
              </td>
              <td>
                <Link href={`/manage/request-status-manager/${r.request_id}`}>
                  <button className={styles.manageBtn}>จัดการสถานะ</button>
                </Link>
              </td>
            </tr>

          ))}
        </tbody>

      </table>
    </div>
  );
}
