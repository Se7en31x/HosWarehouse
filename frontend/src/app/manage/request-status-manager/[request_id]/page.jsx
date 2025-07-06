'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

import {
  MdAccessTime,
  MdBuild,
  MdLocalShipping,
  MdCheckCircle,
} from 'react-icons/md';

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

const statusSteps = ['pending', 'preparing', 'delivering', 'completed'];

const statusIconMap = {
  pending: <MdAccessTime size={24} />,
  preparing: <MdBuild size={24} />,
  delivering: <MdLocalShipping size={24} />,
  completed: <MdCheckCircle size={24} />,
};

const StatusTrack = ({ currentStatus }) => {
  const currentIndex = statusSteps.indexOf(currentStatus);

  return (
    <div className={styles.progressTracker}>
      {statusSteps.map((status, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;
        const isLast = index === statusSteps.length - 1;

        return (
          <div key={status} className={styles.stepContainer}>
            <div
              className={`${styles.stepCircle} ${isDone ? styles.done : isActive ? styles.active : ''
                }`}
            >
              {statusIconMap[status]}
            </div>
            {!isLast && (
              <div
                className={`${styles.stepBar} ${isDone ? styles.barDone : ''
                  }`}
              />
            )}
            <div
              className={`${styles.stepLabel} ${isActive ? styles.labelActive : ''
                }`}
            >
              {translateStatus(status)}
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
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');

  const itemsPerPage = 10;

  const calculateOverallStatus = (details) => {
    if (!details.length) return '';
    const indexes = details.map((d) =>
      statusSteps.indexOf(d.request_detail_status)
    );
    const minIndex = Math.min(...indexes);
    return statusSteps[minIndex];
  };

  useEffect(() => {
    if (request_id) fetchRequestDetails();
  }, [request_id]);

  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      // เพิ่ม timestamp query เพื่อกัน cache
      const res = await axiosInstance.get(`/requestStatus/${request_id}`, {
        params: { t: Date.now() }, // <-- แก้ตรงนี้
      });

      if (res.data.details && Array.isArray(res.data.details)) {
        setDetails(res.data.details);
        const overallStatus = calculateOverallStatus(res.data.details);
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
    setUpdating(true);
    try {
      await axiosInstance.put(`/requestStatus/${request_id}/detail-status`, {
        newStatus,
        detailId,
      });

      Swal.fire({
        icon: 'success',
        title: 'อัปเดตสถานะเรียบร้อย',
        timer: 1500,
        showConfirmButton: false,
      });

      setDetails((prev) => {
        const updated = prev.map((d) =>
          d.request_detail_id === detailId
            ? { ...d, request_detail_status: newStatus }
            : d
        );
        const newOverall = calculateOverallStatus(updated);
        setCurrentStatus(newOverall);
        return updated;
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: err.message || 'ลองใหม่อีกครั้ง',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return <p className={styles.loading}>กำลังโหลดข้อมูล...</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>รายละเอียดคำขอ #{request_id}</h2>

      <StatusTrack currentStatus={currentStatus} />

      <div className={styles.tableContainer}>
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
                <td>
                  <span
                    className={`${styles.statusBadge} ${styles[d.request_detail_status]}`}
                  >
                    {translateStatus(d.request_detail_status)}
                  </span>
                </td>
                <td>
                  <select
                    value={d.request_detail_status}
                    onChange={(e) =>
                      handleStatusChange(e.target.value, d.request_detail_id)
                    }
                    disabled={updating}
                    className={styles.selectStatus}
                  >
                    {statusSteps.map((status) => (
                      <option key={status} value={status}>
                        {translateStatus(status)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {Array.from({ length: itemsPerPage - details.length }).map(
              (_, idx) => (
                <tr key={`empty-${idx}`}>
                  <td colSpan="5">&nbsp;</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <button
        className={styles.backBtn}
        onClick={() => router.push('/manage/request-status-manager')}
      >
        ← กลับหน้ารวม
      </button>
    </div>
  );
}
