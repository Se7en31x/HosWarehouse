'use client';

import { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import styles from './page.module.css';

const STATUS_STEPS = [
  { key: 'รอดำเนินการ', label: 'รอดำเนินการ', icon: '⏳' },
  { key: 'กำลังจัดเตรียม', label: 'กำลังจัดเตรียม', icon: '📦' },
  { key: 'รอส่ง', label: 'รอส่ง', icon: '🚚' },
  { key: 'ส่งแล้ว', label: 'ส่งแล้ว', icon: '📬' },
  { key: 'เสร็จสิ้น', label: 'เสร็จสิ้น', icon: '✅' },
  { key: 'ปฏิเสธ', label: 'ปฏิเสธ', icon: '❌' },
  { key: 'ยกเลิกโดยผู้ใช้', label: 'ยกเลิกโดยผู้ใช้', icon: '🚫' },
];

function getStepIndex(status) {
  return STATUS_STEPS.findIndex(s => s.key === status);
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axiosInstance.get('/my-requests?user_id=1');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถโหลดรายการคำขอได้');
    } finally {
      setLoading(false);
    }
  };

  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.request_date) - new Date(a.request_date)
  );

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>📦 ติดตามสถานะคำขอ</h2>

      {loading ? (
        <p className={styles.loading}>กำลังโหลด...</p>
      ) : sortedRequests.length === 0 ? (
        <p className={styles.noData}>ไม่พบคำขอของคุณ</p>
      ) : (
        <div className={styles.requestsList}>
          {sortedRequests.map((req) => {
            const currentStep = getStepIndex(req.request_status);
            return (
              <div key={req.request_id} className={styles.requestCard}>
                <div className={styles.requestHeader}>
                  <div><strong>รหัสคำขอ:</strong> {req.request_code}</div>
                  <div><strong>วันที่ขอ:</strong> {new Date(req.request_date).toLocaleDateString('th-TH')}</div>
                  <div><strong>ประเภท:</strong> {req.request_types}</div>
                  <div><strong>จำนวนรายการ:</strong> {req.item_count}</div>
                  <div>
                    <strong>เร่งด่วน:</strong>{' '}
                    <span className={req.is_urgent ? styles.urgent : ''}>
                      {req.is_urgent ? '✓' : '—'}
                    </span>
                  </div>
                </div>

                {/* Step Tracker */}
                <div className={styles.stepTracker}>
                  {STATUS_STEPS.map((step, i) => {
                    let stepClass = '';
                    if (i < currentStep) stepClass = styles.completed;
                    else if (i === currentStep) stepClass = styles.current;
                    else stepClass = styles.pending;

                    return (
                      <div key={step.key} className={`${styles.step} ${stepClass}`}>
                        <div className={styles.stepCircle}>{step.icon}</div>
                        <div>{step.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
