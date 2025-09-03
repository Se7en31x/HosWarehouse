'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { manageAxios } from '@/app/utils/axiosInstance';
import styles from './page.module.css';

// Map สถานะและประเภท (เหมือนเดิม)
const statusMap = {
  approved_all: { text: 'อนุมัติทั้งหมด', class: styles.stApproved },
  approved_partial: { text: 'อนุมัติบางส่วน', class: styles.stPartial },
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: styles.stDeducted },
  completed: { text: 'เสร็จสิ้น', class: styles.stCompleted },
};

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

  // โหลดข้อมูล (เหมือนเดิม)
  useEffect(() => {
    if (!requestId) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await manageAxios.get(`/stockDeduction/${requestId}/details`);
        const fetched = res.data;
        const pendingItems = fetched.details.filter(i => i.processing_status === 'pending');
        setRequestDetail({ ...fetched, details: pendingItems });

        const initial = {};
        pendingItems.forEach(i => {
          initial[i.item_id] = { actual_deducted_qty: '', deduction_reason: '' }; // เริ่มต้นเป็นค่าว่าง
        });
        setItemQuantities(initial);
      } catch (err) {
        setError(err.response?.data?.message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [requestId, deductionSuccess]);

  // จัดการจำนวน
  const handleQtyChange = (id, val) => {
    setItemQuantities(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        actual_deducted_qty: val === '' ? '' : Math.max(0, parseInt(val, 10) || 0), // อนุญาตค่าว่าง
      },
    }));
  };

  const handleReasonChange = (id, val) => {
    setItemQuantities(prev => ({ ...prev, [id]: { ...prev[id], deduction_reason: val } }));
  };

  // เบิกสต็อก (ปรับการตรวจสอบเล็กน้อย)
  const handleDeduct = async () => {
    if (!requestDetail || isProcessing) return;
    const itemsToProcess = requestDetail.details
      .map(it => {
        const qty = itemQuantities[it.item_id]?.actual_deducted_qty;
        const reason = itemQuantities[it.item_id]?.deduction_reason || '';
        // ตรวจสอบกรณีค่าว่าง
        if (qty === '' || qty === undefined) return null;
        const parsedQty = parseInt(qty, 10);
        if (parsedQty > it.approved_qty) return null;
        if (parsedQty > it.current_stock_qty) return null;
        if (parsedQty < it.approved_qty && !reason.trim()) return null;
        return {
          request_detail_id: it.request_detail_id,
          item_id: it.item_id,
          actual_deducted_qty: parsedQty,
          deduction_reason: reason,
        };
      })
      .filter(Boolean);

    if (itemsToProcess.length !== requestDetail.details.length) {
      Swal.fire('ผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'error');
      return;
    }

    const confirm = await Swal.fire({
      title: 'ยืนยันการเบิก-จ่าย?',
      text: `คุณแน่ใจหรือไม่ที่จะเบิก-จ่ายคำขอ ${requestDetail.request_code}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    try {
      setIsProcessing(true);
      await manageAxios.put(`/stockDeduction/${requestId}/process`, {
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
      Swal.fire('สำเร็จ', 'เบิก-จ่ายสำเร็จแล้ว', 'success');
      setTimeout(() => router.push('/manage/stockDeduction'), 600);
    } catch (err) {
      Swal.fire('ผิดพลาด', err.response?.data?.message || 'ไม่สามารถดำเนินการได้', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Render
  if (isLoading) return <div className={styles.loading}>กำลังโหลด...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <h1>เบิก-จ่ายสต็อก <span>#{requestDetail?.request_code}</span></h1>
        <div className={styles.meta}>
          <span><strong>ผู้ขอ:</strong> {requestDetail?.user_name}</span>
          <span><strong>แผนก:</strong> {requestDetail?.department_name}</span>
          <span><strong>วันที่:</strong> {new Date(requestDetail?.request_date).toLocaleDateString('th-TH')}</span>
          <span><strong>ประเภท:</strong> {typeMap[requestDetail?.request_type]}</span>
          <span>
            <strong>สถานะ:</strong>
            <span className={`${styles.stBadge} ${statusMap[requestDetail?.request_status]?.class}`}>
              {statusMap[requestDetail?.request_status]?.text}
            </span>
          </span>
        </div>
      </div>

      <div className={styles.tableSection}>
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div>ลำดับ</div>
          <div>สินค้า</div>
          <div>ที่ขอ</div>
          <div>อนุมัติ</div>
          <div>คงเหลือ</div>
          <div>เบิกจริง</div>
          <div>เหตุผล</div>
        </div>
        <div className={styles.tableBody}>
          {Array.from({ length: 10 }).map((_, idx) => {
            const it = requestDetail.details[idx];
            if (!it) {
              return (
                <div
                  key={`empty-${idx}`}
                  className={`${styles.tableGrid} ${styles.tableRow} ${styles.emptyRow}`}
                />
              );
            }
            return (
              <div key={it.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                <div>{idx + 1}</div>
                <div>{it.item_name}</div>
                <div>{it.requested_qty}</div>
                <div>{it.approved_qty}</div>
                <div className={it.current_stock_qty < it.approved_qty ? styles.lowStock : ''}>
                  {it.current_stock_qty}
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    max={it.approved_qty}
                    value={itemQuantities[it.item_id]?.actual_deducted_qty ?? ''} // ใช้ ?? เพื่อให้เป็นค่าว่างได้
                    onChange={e => handleQtyChange(it.item_id, e.target.value)}
                    className={styles.qtyInput}
                    disabled={isProcessing}
                  />
                </div>
                <div>
                  {itemQuantities[it.item_id]?.actual_deducted_qty < it.approved_qty && (
                    <input
                      type="text"
                      placeholder="เหตุผล"
                      value={itemQuantities[it.item_id]?.deduction_reason || ''}
                      onChange={e => handleReasonChange(it.item_id, e.target.value)}
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

      <div className={styles.actions}>
        <button onClick={handleDeduct} disabled={isProcessing} className={styles.primaryBtn}>
          {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยันเบิก-จ่าย'}
        </button>
        <button onClick={() => router.push('/manage/stockDeduction')} className={styles.secondaryBtn}>
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}