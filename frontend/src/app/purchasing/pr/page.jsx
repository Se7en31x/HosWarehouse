// src/app/purchasing/pr/page.jsx
"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import Link from 'next/link';

export default function PurchasingPrPage() {
  const [purchaseRequests, setPurchaseRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPurchaseRequests = async () => {
      try {
        const response = await axiosInstance.get('/pr/all');
        setPurchaseRequests(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching purchase requests:", err);
        setError("ไม่สามารถดึงข้อมูลคำขอซื้อได้");
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseRequests();
  }, []);

  // ฟังก์ชันสำหรับจัดรูปแบบวันที่
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  };

  // ✅ แปลสถานะ
  const statusMap = {
    submitted: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธแล้ว',
    draft: 'ฉบับร่าง',
    canceled: 'ยกเลิก',
    processed: 'กำลังดำเนินการ'
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'submitted':
        return styles.submitted;
      case 'approved':
        return styles.approved;
      case 'rejected':
        return styles.rejected;
      default:
        return styles.defaultStatus;
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>รายการคำขอซื้อ</h1>
      {purchaseRequests.length === 0 ? (
        <p className={styles.emptyList}>ยังไม่มีรายการคำขอซื้อที่ต้องอนุมัติ</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>เลขที่ PR</th>
              <th>ผู้ร้องขอ</th>
              <th>วันที่สร้าง</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {purchaseRequests.map((pr) => (
              <tr key={pr.pr_id}>
                <td>{pr.pr_no}</td>
                <td>{pr.requester_name}</td>
                <td>{formatDate(pr.created_at)}</td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${getStatusClass(pr.status)}`}
                  >
                    {statusMap[pr.status] || pr.status}
                  </span>
                </td>
                <td>
                  <Link href={`/purchasing/pr/${pr.pr_id}`} className={styles.viewButton}>
                    ดูรายละเอียด
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
