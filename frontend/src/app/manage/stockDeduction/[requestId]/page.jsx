'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // สำหรับ Next.js 13+ App Router
import Swal from 'sweetalert2'; // Import SweetAlert2

import axiosInstance from '@/app/utils/axiosInstance'; // ตรวจสอบ Path ให้ถูกต้อง
import styles from './page.module.css'; // ตรวจสอบ Path และชื่อไฟล์ CSS Module ให้ถูกต้อง

// Map สถานะเพื่อให้แสดงผลเป็นภาษาไทยและมี class สำหรับ styling
const statusMap = {
  approved_all: { text: 'อนุมัติทั้งหมด', class: styles.statusApproved },
  approved_partial: { text: 'อนุมัติบางส่วน', class: styles.statusPartial },
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: styles.statusDeducted },
  completed: { text: 'เสร็จสิ้น', class: styles.statusCompleted },
};

// Map ประเภทคำขอ (request_type) เป็นภาษาไทย
const typeMap = {
  'Borrow': 'ยืม',
  'Withdraw': 'เบิก',
  'Transfer': 'โอน',
  // เพิ่มประเภทอื่นๆ ที่คุณมีในฐานข้อมูลได้ที่นี่
};

export default function SingleStockDeductionPage() {
  const params = useParams();
  const router = useRouter();
  const { requestId } = params;

  const [requestDetail, setRequestDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deductionSuccess, setDeductionSuccess] = useState(false);

  const [itemQuantities, setItemQuantities] = useState({});

  useEffect(() => {
    if (!requestId) return;

    const fetchRequestDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setDeductionSuccess(false);

        console.log(`Fetching request details for requestId: ${requestId}`);
        const response = await axiosInstance.get(`/stockDeduction/${requestId}/details`); 
        
        const fetchedDetail = response.data;
        console.log("Fetched request detail in Frontend:", fetchedDetail); // เพิ่ม console.log เพื่อดูโครงสร้างข้อมูลที่ได้รับ
        setRequestDetail(fetchedDetail);

        const initialQuantities = {};
        if (fetchedDetail.details) {
          fetchedDetail.details.forEach(item => {
            initialQuantities[item.item_id] = {
              actual_deducted_qty: item.approved_qty,
              deduction_reason: ''
            };
          });
        }
        setItemQuantities(initialQuantities);
        console.log("Initial item quantities state:", initialQuantities);

      } catch (err) {
        console.error("Error fetching request details for deduction:", err);
        setError(err.response?.data?.message || `ไม่สามารถโหลดรายละเอียดคำขอ ${requestId} ได้`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequestDetail();
  }, [requestId]);

  const handleActualQtyChange = (itemId, value) => {
    const qty = parseInt(value, 10);
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        actual_deducted_qty: isNaN(qty) ? 0 : Math.max(0, qty)
      }
    }));
  };

  const handleReasonChange = (itemId, value) => {
    setItemQuantities(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        deduction_reason: value
      }
    }));
  };

  const handleDeductStock = async () => {
    if (!requestDetail || isProcessing) return;

    const itemsToProcess = requestDetail.details.map(item => {
      const actualQty = itemQuantities[item.item_id]?.actual_deducted_qty || 0;
      const reason = itemQuantities[item.item_id]?.deduction_reason || '';

      if (actualQty > item.approved_qty) {
        setError(`จำนวนที่เบิกจริงของ ${item.item_name} (${actualQty}) เกินกว่าจำนวนที่อนุมัติ (${item.approved_qty}).`);
        return null;
      }
      if (actualQty > item.current_stock_qty) {
        setError(`จำนวนที่เบิกจริงของ ${item.item_name} (${actualQty}) เกินกว่าสต็อกที่มีอยู่ (${item.current_stock_qty}).`);
        return null;
      }
      if (actualQty < item.approved_qty && !reason.trim()) {
        setError(`โปรดระบุเหตุผลการเบิกไม่ครบสำหรับ ${item.item_name}.`);
        return null;
      }
      return {
        item_id: item.item_id,
        actual_deducted_qty: actualQty,
        deduction_reason: reason
      };
    }).filter(Boolean);

    if (itemsToProcess.length !== requestDetail.details.length) {
      return;
    }

    const confirmResult = await Swal.fire({
      title: 'ยืนยันการเบิก-จ่ายสต็อก?',
      text: `คุณแน่ใจหรือไม่ที่จะเบิก-จ่ายสต็อกสำหรับคำขอ "${requestDetail.request_code}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ยืนยัน!',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    console.log("Items to send for deduction:", itemsToProcess);
    console.log("Request ID for deduction:", requestDetail.request_id);

    try {
      setIsProcessing(true);
      setError(null);

      const response = await axiosInstance.put(`/stockDeduction/${requestId}/process`, {
        updates: itemsToProcess.map(item => ({
          request_detail_id: requestDetail.details.find(d => d.item_id === item.item_id).request_detail_id,
          newStatus: 'preparing', 
          current_approval_status: requestDetail.details.find(d => d.item_id === item.item_id).approval_status,
          current_processing_status: requestDetail.details.find(d => d.item_id === item.item_id).processing_status,
          item_id: item.item_id,
          requested_qty: item.actual_deducted_qty,
          deduction_reason: item.deduction_reason // *** เพิ่มตรงนี้: ส่งเหตุผลไป Backend ***
        })),
        userId: 1, // TODO: Replace with actual logged-in user ID
      });

      setDeductionSuccess(true);
      // setRequestDetail(prev => ({ ...prev, status: 'stock_deducted' })); // สถานะนี้อาจถูกอัปเดตโดย Backend
      
      await Swal.fire(
        'สำเร็จ!',
        `ดำเนินการเบิก-จ่ายสต็อกของคำขอ "${requestDetail.request_code}" สำเร็จแล้ว.`,
        'success'
      );
      
      setTimeout(() => {
        router.push('/manage/stockDeduction');
      }, 500);

    } catch (err) {
      console.error("Error deducting stock:", err);
      const errorMessage = err.response?.data?.message || `เกิดข้อผิดพลาดในการเบิก-จ่ายสต็อกของคำขอ "${requestDetail.request_code}"`;
      setError(errorMessage);
      setDeductionSuccess(false);

      await Swal.fire(
        'เกิดข้อผิดพลาด!',
        errorMessage,
        'error'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.pageBackground}>
        <p className={styles.infoMessage}>กำลังโหลดรายละเอียดคำขอ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageBackground}>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  if (!requestDetail) {
    return (
      <div className={styles.pageBackground}>
        <p className={styles.infoMessage}>ไม่พบข้อมูลคำขอ หรือคำขอนี้ไม่พร้อมสำหรับการเบิก-จ่ายสต็อก</p>
      </div>
    );
  }

  const isAlreadyDeducted = requestDetail.status === 'stock_deducted' || requestDetail.status === 'completed';

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.title}>เบิก-จ่ายสต็อก: {requestDetail.request_code}</h1>

        <div className={styles.detailSection}>
          <p><strong>ผู้ขอ:</strong> {requestDetail.user_name}</p>
          <p><strong>แผนก:</strong> {requestDetail.department_name}</p>
          <p><strong>วันที่ขอ:</strong> {new Date(requestDetail.request_date).toLocaleDateString('th-TH')}</p>
          <p>
            <strong>ประเภทคำขอ:</strong> {typeMap[requestDetail.request_type] || requestDetail.request_type}
          </p>
          <p>
            <strong>สถานะคำขอ:</strong> 
            <span className={`${styles.statusBadge} ${statusMap[requestDetail.request_status]?.class}`}>
              {statusMap[requestDetail.request_status]?.text || 'ไม่ระบุ'}
            </span>
          </p>
        </div>

        <h2 className={styles.subtitle}>รายการสินค้าที่อนุมัติสำหรับเบิก-จ่าย</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>สินค้า</th>
              <th>จำนวนที่ขอ</th>
              <th>จำนวนที่อนุมัติ</th>
              <th>หน่วยนับ</th>
              <th>คงเหลือในสต็อก</th>
              <th className={styles.actualDeductQtyHeader}>จำนวนที่เบิกจริง</th>
              <th>เหตุผล (ถ้าเบิกไม่ครบ)</th>
            </tr>
          </thead>
          <tbody>
            {requestDetail.details && requestDetail.details.length > 0 ? (
              requestDetail.details.map((item, index) => (
                <tr key={item.item_id}>
                  <td data-label="ลำดับ">{index + 1}</td>
                  <td data-label="สินค้า">{item.item_name}</td>
                  <td data-label="จำนวนที่ขอ">{item.requested_qty}</td>
                  <td data-label="จำนวนที่อนุมัติ">{item.approved_qty}</td>
                  <td data-label="หน่วยนับ">{item.item_unit}</td>
                  <td data-label="คงเหลือในสต็อก" className={item.current_stock_qty < item.approved_qty ? styles.lowStock : ''}>
                    {item.current_stock_qty}
                  </td>
                  <td data-label="จำนวนที่เบิกจริง">
                    <input
                      type="number"
                      min="0"
                      max={item.approved_qty}
                      value={itemQuantities[item.item_id]?.actual_deducted_qty || 0}
                      onChange={(e) => handleActualQtyChange(item.item_id, e.target.value)}
                      className={styles.qtyInput}
                      disabled={isAlreadyDeducted || isProcessing}
                    />
                  </td>
                  <td data-label="เหตุผล (ถ้าเบิกไม่ครบ)">
                    {itemQuantities[item.item_id]?.actual_deducted_qty < item.approved_qty && (
                      <input
                        type="text"
                        placeholder="ระบุเหตุผล"
                        value={itemQuantities[item.item_id]?.deduction_reason || ''}
                        onChange={(e) => handleReasonChange(item.item_id, e.target.value)}
                        className={styles.reasonInput}
                        disabled={isAlreadyDeducted || isProcessing}
                      />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className={styles.infoMessage}>ไม่พบรายการสินค้าที่อนุมัติในคำขอนี้</td>
              </tr>
            )}
          </tbody>
        </table>

        {isAlreadyDeducted && (
          <p className={styles.successMessage}>
            ✅ คำขอนี้ได้รับการเบิก-จ่ายสต็อกเรียบร้อยแล้ว
          </p>
        )}

        <div className={styles.actionButtons}>
          <button 
            className={`${styles.button} ${styles.primaryButton}`}
            onClick={handleDeductStock}
            disabled={isProcessing || isAlreadyDeducted || !requestDetail.details || requestDetail.details.length === 0}
          >
            {isProcessing ? 'กำลังดำเนินการเบิก-จ่าย...' : 'ยืนยันการเบิก-จ่ายสต็อก'}
          </button>
          <button 
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={() => router.push('/manage/stockDeduction')}
          >
            ย้อนกลับหน้ารายการ
          </button>
        </div>
      </div>
    </div>
  );
}
