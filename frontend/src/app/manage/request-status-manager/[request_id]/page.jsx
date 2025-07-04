'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './page.module.css';
import Swal from 'sweetalert2';

// แปลสถานะ
const translateStatus = (status) => {
  const map = {
    pending: 'รอดำเนินการ',
    preparing: 'กำลังจัดเตรียม',
    delivering: 'นำส่งแล้ว',
    completed: 'เสร็จสิ้น',
    approved: 'อนุมัติ',
    rejected: 'ปฏิเสธ',
  };
  return map[status] || status;
};

// Component แสดงสถานะไล่ระดับ
const StatusTrack = ({ currentStatus }) => {
  const statusSteps = ['รอดำเนินการ', 'กำลังจัดเตรียม', 'นำส่งแล้ว', 'เสร็จสิ้น'];
  const currentIndex = statusSteps.indexOf(currentStatus);

  return (
    <div className={styles.progressTracker}>
      {statusSteps.map((status, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;

        return (
          <div key={status} className={styles.stepContainer}>
            <div
              className={`${styles.stepCircle} ${
                isDone ? styles.done : isActive ? styles.active : ''
              }`}
            >
              {isDone ? '✔' : index + 1}
            </div>
            {index !== statusSteps.length - 1 && (
              <div className={`${styles.stepBar} ${isDone ? styles.barDone : ''}`} />
            )}
            <div className={`${styles.stepLabel} ${isActive ? styles.labelActive : ''}`}>
              {status}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function RequestDetailClient() {
  const router = useRouter();
  const { request_id } = useParams();

  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState('');

  const statusSteps = ['รอดำเนินการ', 'กำลังจัดเตรียม', 'นำส่งแล้ว', 'เสร็จสิ้น'];

  const calculateOverallStatus = (details, steps) => {
    if (!details.length) return '';
    const indexes = details.map((d) => steps.indexOf(d.request_detail_status));
    const minIndex = Math.min(...indexes);
    return steps[minIndex];
  };

  useEffect(() => {
    if (request_id) fetchRequestDetails();
  }, [request_id]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/requestStstus/${request_id}`);
      if (res.data.details && Array.isArray(res.data.details)) {
        setDetails(res.data.details);
        const overallStatus = calculateOverallStatus(res.data.details, statusSteps);
        setCurrentStatus(overallStatus);
      } else {
        setDetails([]);
        setCurrentStatus('');
      }
    } catch (err) {
      console.error('โหลดข้อมูลล้มเหลว', err);
      setDetails([]);
      setCurrentStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus, detailId) => {
    try {
      await axiosInstance.put(`/requestStstus/${request_id}/status`, {
        newStatus,
        detailId,
      });

      await Swal.fire({
        icon: 'success',
        title: 'อัปเดตสถานะเรียบร้อย',
        timer: 1500,
        showConfirmButton: false,
      });

      setDetails((prev) => {
        const updated = prev.map((d) =>
          d.request_detail_id === detailId ? { ...d, request_detail_status: newStatus } : d
        );
        const newOverall = calculateOverallStatus(updated, statusSteps);
        setCurrentStatus(newOverall);
        return updated;
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ลองใหม่อีกครั้ง',
      });
    }
  };

  if (loading) return <p className={styles.loading}>กำลังโหลด...</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>รายละเอียดคำขอ #{request_id}</h2>

      <StatusTrack currentStatus={currentStatus} />

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ชื่อพัสดุ</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
            <th>สถานะ</th>
            <th>อัปเดตสถานะ</th>
          </tr>
        </thead>
        <tbody>
          {details.map((d) => (
            <tr key={d.request_detail_id}>
              <td>{d.item_name}</td>
              <td>{d.requested_qty}</td>
              <td>{d.item_unit}</td>
              <td>{translateStatus(d.request_detail_status)}</td>
              <td>
                <select
                  value={d.request_detail_status}
                  onChange={(e) => handleStatusChange(e.target.value, d.request_detail_id)}
                  className={styles.selectStatus}
                >
                  {statusSteps.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        className={styles.backBtn}
        onClick={() => router.push('/manage/request-status-manager')}
      >
        ← กลับหน้ารวม
      </button>
    </div>
  );
}
