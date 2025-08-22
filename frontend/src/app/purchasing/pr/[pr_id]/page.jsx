"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import Swal from 'sweetalert2'; // เพิ่มการนำเข้า SweetAlert2

export default function PrDetailPage() {
  const { pr_id } = useParams();
  const [prDetails, setPrDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPrDetails = async () => {
    try {
      const response = await axiosInstance.get(`/pr/${pr_id}`);
      console.log("PR Details:", response.data); // Log เพื่อ debug
      setPrDetails(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching PR details:", err);
      setError("ไม่สามารถดึงข้อมูลรายละเอียดคำขอซื้อได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pr_id) {
      fetchPrDetails();
    }
  }, [pr_id]);

    const handleUpdateStatus = async (newStatus) => {
        const actionText = newStatus === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ';
        const result = await Swal.fire({
            title: `คุณแน่ใจหรือไม่ที่จะ${actionText}คำขอซื้อนี้?`,
            text: `การ${actionText}จะเปลี่ยนสถานะของคำขอซื้อ #${prDetails?.pr_no}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: actionText,
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: newStatus === 'approved' ? '#28a745' : '#dc3545',
        });

        if (result.isConfirmed) {
            try {
                const response = await axiosInstance.patch(`/pr/${pr_id}`, { status: newStatus });
                
                // ✅ แก้ไขข้อความแจ้งเตือนให้เป็นภาษาไทย
                await Swal.fire({
                    title: 'สำเร็จ',
                    text: `คำขอซื้อถูก${actionText}เรียบร้อยแล้ว`,
                    icon: 'success',
                    confirmButtonText: 'ตกลง',
                });
                fetchPrDetails();
            } catch (err) {
                console.error("Error updating PR status:", err);
                
                // ✅ แก้ไขข้อความแจ้งเตือนให้เป็นภาษาไทย
                await Swal.fire({
                    title: 'ข้อผิดพลาด',
                    text: err.response?.data?.message || `ไม่สามารถ${actionText}คำขอซื้อได้`,
                    icon: 'error',
                    confirmButtonText: 'ตกลง',
                });
            }
        }
    };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('th-TH', options);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'submitted':
        return styles.submitted;
      case 'approved':
      case 'processed':
        return styles.approved;
      case 'rejected':
      case 'canceled':
        return styles.rejected;
      case 'draft':
        return styles.draft;
      default:
        return styles.defaultStatus;
    }
  };

  if (loading) {
    return <div className={styles.container}>กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;
  }

  if (!prDetails) {
    return <div className={styles.container}>ไม่พบรายการคำขอซื้อนี้</div>;
  }

  const isPending = prDetails.status === 'submitted';
  const isApproved = prDetails.status === 'approved';

  return (
    <div className={styles.container}>
      <Link href="/purchasing/pr" className={styles.backButton}>
        &larr; กลับหน้ารายการ
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>รายละเอียดคำขอซื้อ #{prDetails.pr_no}</h1>
        {isApproved && (
          <Link
            href={`/purchasing/rfq/create?pr_id=${prDetails.pr_id}`}
            className={styles.createRfqButton}
          >
            <FaPlus /> สร้างใบขอราคา (RFQ)
          </Link>
        )}
      </div>

      <div className={styles.prSummary}>
        <div className={styles.summaryItem}>
          <p>เลขที่ PR:</p>
          <span>{prDetails.pr_no}</span>
        </div>
        <div className={styles.summaryItem}>
          <p>ผู้ร้องขอ:</p>
          <span>{prDetails.requester_name}</span>
        </div>
        <div className={styles.summaryItem}>
          <p>วันที่สร้าง:</p>
          <span>{formatDate(prDetails.created_at)}</span>
        </div>
        <div className={styles.summaryItem}>
          <p>สถานะ:</p>
          <span className={`${styles.statusBadge} ${getStatusClass(prDetails.status)}`}>
            {prDetails.status}
          </span>
        </div>
      </div>

      {isPending && (
        <div className={styles.actionButtons}>
          <button
            onClick={() => handleUpdateStatus('approved')}
            className={`${styles.approveButton}`}
          >
            อนุมัติ
          </button>
          <button
            onClick={() => handleUpdateStatus('rejected')}
            className={`${styles.rejectButton}`}
          >
            ปฏิเสธ
          </button>
        </div>
      )}

      <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชื่อสินค้า</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {prDetails?.items?.length > 0 ? (
            prDetails.items.map((item, index) => (
              <tr key={item.item_id || `item-${index}`}>
                <td>{index + 1}</td>
                <td>{item.item_name || 'N/A'}</td>
                <td>{item.requested_qty || 0}</td>
                <td>{item.item_unit || '-'}</td>
                <td>{item.note || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">ไม่มีรายการสินค้า</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
