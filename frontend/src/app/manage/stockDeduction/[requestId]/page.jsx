'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import axiosInstance from '@/app/utils/axiosInstance';
import styles from './page.module.css';

// Map สถานะ
const statusMap = {
  approved_all: { text: 'อนุมัติทั้งหมด', class: styles.statusApproved },
  approved_partial: { text: 'อนุมัติบางส่วน', class: styles.statusPartial },
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: styles.statusDeducted },
  completed: { text: 'เสร็จสิ้น', class: styles.statusCompleted },
};

// Map ประเภทคำขอ
const typeMap = {
  borrow: 'ยืม',
  withdraw: 'เบิก',
  Transfer: 'โอน',
};

export default function SingleStockDeductionPage() {
  const { requestId } = useParams();
  const router = useRouter();

  const [requestDetail, setRequestDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deductionSuccess, setDeductionSuccess] = useState(false);
  const [itemQuantities, setItemQuantities] = useState({});

  // ───────── โหลดข้อมูล ─────────
  useEffect(() => {
    if (!requestId) return;

    const fetchRequestDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await axiosInstance.get(`/stockDeduction/${requestId}/details`);
        const fetched = res.data;

        // เอาเฉพาะรายการ pending
        const pendingItems = fetched.details.filter(i => i.processing_status === 'pending');
        setRequestDetail({ ...fetched, details: pendingItems });

        // กำหนดค่า default
        const initial = {};
        pendingItems.forEach(i => {
          initial[i.item_id] = {
            actual_deducted_qty: i.approved_qty,
            deduction_reason: '',
          };
        });
        setItemQuantities(initial);
      } catch (err) {
        setError(err.response?.data?.message || 'ไม่สามารถโหลดรายละเอียดคำขอได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestDetail();
  }, [requestId, deductionSuccess]);

  // ───────── ฟังก์ชัน helper ─────────
  const handleActualQtyChange = (itemId, val) => {
    const qty = parseInt(val, 10);
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], actual_deducted_qty: isNaN(qty) ? 0 : Math.max(0, qty) },
    }));
  };

  const handleReasonChange = (itemId, val) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], deduction_reason: val },
    }));
  };

  const handleDeductStock = async () => {
    if (!requestDetail || isProcessing) return;

    const itemsToProcess = requestDetail.details
      .map(item => {
        const actualQty = itemQuantities[item.item_id]?.actual_deducted_qty || 0;
        const reason = itemQuantities[item.item_id]?.deduction_reason || '';

        if (actualQty > item.approved_qty) {
          setError(`จำนวนที่เบิกจริงของ ${item.item_name} เกินจำนวนที่อนุมัติ`);
          return null;
        }
        if (actualQty > item.current_stock_qty) {
          setError(`จำนวนที่เบิกจริงของ ${item.item_name} เกินกว่าสต็อก`);
          return null;
        }
        if (actualQty < item.approved_qty && !reason.trim()) {
          setError(`กรุณาใส่เหตุผลการเบิกไม่ครบสำหรับ ${item.item_name}`);
          return null;
        }
        return {
          request_detail_id: item.request_detail_id,
          item_id: item.item_id,
          actual_deducted_qty: actualQty,
          deduction_reason: reason,
        };
      })
      .filter(Boolean);

    if (itemsToProcess.length !== requestDetail.details.length) return;

    const confirm = await Swal.fire({
      title: 'ยืนยันการเบิก-จ่ายสต็อก?',
      text: `คุณแน่ใจหรือไม่ที่จะเบิก-จ่ายสต็อกสำหรับคำขอ ${requestDetail.request_code}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    try {
      setIsProcessing(true);
      await axiosInstance.put(`/stockDeduction/${requestId}/process`, {
        updates: itemsToProcess.map(i => ({
          request_detail_id: i.request_detail_id,
          newStatus: 'preparing',
          current_approval_status: 'approved',
          current_processing_status: 'pending',
          item_id: i.item_id,
          requested_qty: i.actual_deducted_qty,
          deduction_reason: i.deduction_reason,
        })),
        userId: 999,
      });
      setDeductionSuccess(true);
      Swal.fire('สำเร็จ!', 'ดำเนินการเบิก-จ่ายสำเร็จแล้ว', 'success');
      setTimeout(() => router.push('/manage/stockDeduction'), 500);
    } catch (err) {
      Swal.fire('ผิดพลาด', err.response?.data?.message || 'ไม่สามารถดำเนินการได้', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ───────── Render ─────────
  if (isLoading) return <p className={styles.infoMessage}>กำลังโหลด...</p>;
  if (error) return <p className={styles.errorMessage}>{error}</p>;

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        
        {/* Header */}
        <div className={styles.header}>
          <h1>เบิก-จ่ายสต็อก</h1>
          <span className={styles.requestCode}>#{requestDetail?.request_code}</span>
        </div>

        {/* Info Section */}
        <div className={styles.detailCard}>
          <div><strong>ผู้ขอ:</strong> {requestDetail?.user_name}</div>
          <div><strong>แผนก:</strong> {requestDetail?.department_name}</div>
          <div><strong>วันที่ขอ:</strong> {new Date(requestDetail?.request_date).toLocaleDateString('th-TH')}</div>
          <div><strong>ประเภทคำขอ:</strong> {typeMap[requestDetail?.request_type]}</div>
          <div>
            <strong>สถานะ:</strong>
            <span className={`${styles.statusBadge} ${statusMap[requestDetail?.request_status]?.class}`}>
              {statusMap[requestDetail?.request_status]?.text}
            </span>
          </div>
        </div>

        {/* Table */}
        <h2 className={styles.subtitle}>รายละเอียดสินค้า</h2>
        <div className={styles.tableWrapper}>
          {/* หัวตาราง */}
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div>ลำดับ</div>
            <div>สินค้า</div>
            <div>ที่ขอ</div>
            <div>อนุมัติ</div>
            <div>คงเหลือ</div>
            <div>เบิกจริง</div>
            <div>เหตุผล</div>
          </div>

          {/* body: fix สูงสุด 8 แถวก่อนมี scroll */}
          <div className={styles.tableBody}>
            {Array.from({ length: Math.max(8, requestDetail.details.length) }).map((_, idx) => {
              const item = requestDetail.details[idx];
              if (!item) {
                // ✅ แถวเปล่า ไม่มีเลข
                return (
                  <div key={`empty-${idx}`} className={`${styles.tableGrid} ${styles.tableRow} ${styles.emptyRow}`}>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                );
              }
              return (
                <div key={item.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div>{idx + 1}</div>
                  <div>{item.item_name}</div>
                  <div>{item.requested_qty}</div>
                  <div>{item.approved_qty}</div>
                  <div className={item.current_stock_qty < item.approved_qty ? styles.lowStock : ''}>
                    {item.current_stock_qty}
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max={item.approved_qty}
                      value={itemQuantities[item.item_id]?.actual_deducted_qty || 0}
                      onChange={e => handleActualQtyChange(item.item_id, e.target.value)}
                      className={styles.qtyInput}
                      disabled={isProcessing}
                    />
                  </div>
                  <div>
                    {itemQuantities[item.item_id]?.actual_deducted_qty < item.approved_qty && (
                      <input
                        type="text"
                        placeholder="เหตุผล"
                        value={itemQuantities[item.item_id]?.deduction_reason || ''}
                        onChange={e => handleReasonChange(item.item_id, e.target.value)}
                        className={styles.reasonInput}
                        disabled={isProcessing}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button 
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={handleDeductStock}
            disabled={isProcessing}>
            {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยันเบิก-จ่าย'}
          </button>
          <button 
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={() => router.push('/manage/stockDeduction')}>
            ย้อนกลับ
          </button>
        </div>
      </div>
    </div>
  );
}
