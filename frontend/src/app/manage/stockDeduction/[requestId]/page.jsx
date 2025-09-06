'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { manageAxios } from '@/app/utils/axiosInstance';
import styles from './page.module.css';

/* ====== Maps ====== */
const statusMap = {
  approved_all:   { text: 'อนุมัติทั้งหมด', class: 'stApproved' },
  approved_partial: { text: 'อนุมัติบางส่วน', class: 'stPartial' },
  stock_deducted: { text: 'เบิก-จ่ายแล้ว', class: 'stDeducted' },
  completed:      { text: 'เสร็จสิ้น', class: 'stCompleted' },
};

const typeMap = { borrow: 'ยืม', withdraw: 'เบิก', transfer: 'โอน' };

/* ====== Helpers ====== */
const fmtDateTH = (d) => {
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return '-';
  return new Date(t).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
};

export default function SingleStockDeductionPage() {
  const params = useParams();
  const requestId = params?.requestId || params?.id;
  const router = useRouter();

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'view').toLowerCase();
  const isHistory = mode === 'view';

  const [requestDetail, setRequestDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [itemQuantities, setItemQuantities] = useState({}); // { [item_id]: { actual_deducted_qty, deduction_reason } }

  /* ====== Load detail ====== */
  useEffect(() => {
    if (!requestId) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await manageAxios.get(`/stockDeduction/${requestId}/details`);
        const data = res?.data || null;
        setRequestDetail(data);

        if (data && !isHistory) {
          // เตรียมค่าเริ่มต้นเฉพาะรายการ pending
          const initial = {};
          (data.details || [])
            .filter((i) => i.processing_status === 'pending')
            .forEach((i) => {
              initial[i.item_id] = { actual_deducted_qty: '', deduction_reason: '' };
            });
          setItemQuantities(initial);
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'โหลดข้อมูลไม่สำเร็จ');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [requestId, isHistory]);

  /* ====== Derived rows ====== */
  const rows = useMemo(() => {
    const list = requestDetail?.details || [];
    return isHistory ? list : list.filter((it) => it.processing_status === 'pending');
  }, [requestDetail, isHistory]);

  /* ====== Per-row validation ====== */
  const validationMap = useMemo(() => {
    if (isHistory) return {};
    const map = {};
    rows.forEach((it) => {
      const entry = itemQuantities[it.item_id] || { actual_deducted_qty: '', deduction_reason: '' };
      const raw = entry.actual_deducted_qty;
      const qty = raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0);

      let ok = true;
      let msg = '';

      if (qty === '') { ok = false; msg = 'กรอกจำนวนที่ต้องการตัด'; }
      else if (qty > (it.approved_qty ?? 0)) { ok = false; msg = `ต้องไม่เกิน ${it.approved_qty}`; }
      else if (qty > (it.current_stock_qty ?? 0)) { ok = false; msg = `สต็อกคงเหลือไม่พอ (${it.current_stock_qty})`; }
      else if (qty < (it.approved_qty ?? 0) && !(entry.deduction_reason || '').trim()) {
        ok = false; msg = 'กรอกเหตุผลเมื่อเบิกน้อยกว่าที่อนุมัติ';
      }

      map[it.item_id] = { ok, msg };
    });
    return map;
  }, [rows, itemQuantities, isHistory]);

  const allValid = useMemo(() => {
    if (isHistory) return true;
    if (!rows.length) return false;
    return rows.every((it) => validationMap[it.item_id]?.ok);
  }, [rows, validationMap, isHistory]);

  /* ====== Handlers ====== */
  const handleQtyChange = (id, val) => {
    const n = val === '' ? '' : Math.max(0, parseInt(val, 10) || 0);
    setItemQuantities((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), actual_deducted_qty: n },
    }));
  };

  const handleReasonChange = (id, val) => {
    setItemQuantities((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), deduction_reason: val } }));
  };

  const fillApprovedForAll = () => {
    // ใส่ตามอนุมัติ (แต่ไม่เกินสต็อกคงเหลือ)
    const next = { ...itemQuantities };
    rows.forEach((it) => {
      const maxAllow = Math.min(it.approved_qty ?? 0, it.current_stock_qty ?? 0);
      next[it.item_id] = { ...(next[it.item_id] || {}), actual_deducted_qty: maxAllow };
      // ล้างเหตุผลหากเท่ากับอนุมัติ
      if (maxAllow === (it.approved_qty ?? 0)) next[it.item_id].deduction_reason = '';
    });
    setItemQuantities(next);
  };

  const clearAllInputs = () => {
    const next = {};
    rows.forEach((it) => { next[it.item_id] = { actual_deducted_qty: '', deduction_reason: '' }; });
    setItemQuantities(next);
  };

  const handleDeduct = async () => {
    if (!requestDetail || isProcessing || !rows.length) return;
    if (!allValid) {
      Swal.fire('กรอกไม่ครบ', 'กรุณาตรวจสอบจำนวนและเหตุผลของทุกรายการ', 'error');
      return;
    }

    const updates = rows.map((it) => ({
      request_detail_id: it.request_detail_id,
      newStatus: 'preparing',
      current_approval_status: 'approved',
      current_processing_status: 'pending',
      item_id: it.item_id,
      requested_qty: Number(itemQuantities[it.item_id]?.actual_deducted_qty || 0),
      deduction_reason: itemQuantities[it.item_id]?.deduction_reason || '',
    }));

    const confirm = await Swal.fire({
      title: 'ยืนยันการเบิก-จ่าย?',
      text: `ยืนยันการเบิก-จ่ายคำขอ ${requestDetail?.request_code || ''}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!confirm.isConfirmed) return;

    try {
      setIsProcessing(true);
      await manageAxios.put(`/stockDeduction/${requestId}/process`, { updates });
      Swal.fire('สำเร็จ', 'บันทึกการเบิก-จ่ายเรียบร้อย', 'success');
      router.push('/manage/stockDeduction?refresh=1');
    } catch (err) {
      Swal.fire('ผิดพลาด', err?.response?.data?.message || 'ไม่สามารถดำเนินการได้', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  /* ====== UI ====== */
  if (isLoading) return <div className={styles.stateMsg}>กำลังโหลด...</div>;
  if (error)     return <div className={`${styles.stateMsg} ${styles.err}`}>{error}</div>;

  // เติมแถวว่างให้ครบ 12 แถว (เฉพาะเมื่อมี < 12 เพื่อคุมความสูงนิ่ง)
  const ROWS_PER_PAGE = 12;
  const fillersCount = Math.max(0, ROWS_PER_PAGE - (rows?.length || 0));
  const COLS = 7;

  const statusKey = requestDetail?.request_status;
  const st = statusMap[statusKey] || { text: statusKey || '-', class: 'stDefault' };

  return (
    <div className={styles.page}>
      {/* Header Card */}
      <div className={styles.headerCard}>
        <h1 className={styles.title}>
          เบิก-จ่ายสต็อก <span>#{requestDetail?.request_code}</span>
        </h1>
        <div className={styles.meta}>
          <span><strong>ผู้ขอ:</strong> {requestDetail?.user_name || '-'}</span>
          <span><strong>แผนก:</strong> {requestDetail?.department_name || '-'}</span>
          <span><strong>วันที่:</strong> {fmtDateTH(requestDetail?.request_date)}</span>
          <span><strong>ประเภท:</strong> {typeMap[requestDetail?.request_type] || '-'}</span>
          <span className={styles.statusWrap}>
            <strong>สถานะ:</strong>
            <span className={`${styles.stBadge} ${styles[st.class]}`}>{st.text}</span>
          </span>
        </div>

        {!isHistory && rows.length > 0 && (
          <div className={styles.quickActions}>
            <button
              className={`${styles.ghostBtn} ${styles.btnInline}`}
              onClick={fillApprovedForAll}
              disabled={isProcessing}
              aria-label="ใส่ตามอนุมัติทุกแถว"
              title="ใส่ตามอนุมัติทุกแถว (ไม่เกินสต็อกคงเหลือ)"
            >
              ใส่ตามอนุมัติ
            </button>
            <button
              className={`${styles.ghostBtn} ${styles.btnInline}`}
              onClick={clearAllInputs}
              disabled={isProcessing}
              aria-label="ล้างค่าทุกแถว"
              title="ล้างค่าทุกแถว"
            >
              ล้างค่า
            </button>
            <span className={styles.hint}>* หากกรอกน้อยกว่าอนุมัติ จำเป็นต้องระบุเหตุผล</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className={styles.tableSection}>
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div>ลำดับ</div>
          <div>สินค้า</div>
          <div>ที่ขอ</div>
          <div>อนุมัติ</div>
          <div>คงเหลือ</div>
          <div>{isHistory ? 'เบิกจริง' : 'กรอกจำนวน'}</div>
          <div>เหตุผล</div>
        </div>

        <div className={styles.tableBody} style={{ '--rows-per-page': ROWS_PER_PAGE }}>
          {rows.length === 0 ? (
            <div className={styles.noData}>ไม่มีรายการที่ต้องดำเนินการ</div>
          ) : (
            <>
              {rows.map((it, idx) => {
                const entry = itemQuantities[it.item_id] || { actual_deducted_qty: '', deduction_reason: '' };
                const valid = validationMap[it.item_id]?.ok ?? true;
                const msg = validationMap[it.item_id]?.msg ?? '';
                const showReasonInput =
                  !isHistory && entry.actual_deducted_qty !== '' &&
                  Number(entry.actual_deducted_qty) < (it.approved_qty ?? 0);

                return (
                  <div key={it.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div>{idx + 1}</div>
                    <div title={it.item_name}>{it.item_name || '-'}</div>
                    <div>{it.requested_qty ?? 0}</div>
                    <div>{it.approved_qty ?? 0}</div>
                    <div className={ (it.current_stock_qty ?? 0) < (it.approved_qty ?? 0) ? styles.lowStock : '' }>
                      {it.current_stock_qty ?? 0}
                    </div>
                    <div className={styles.cellWithInput}>
                      {isHistory ? (
                        it.actual_deducted_qty ?? '-'
                      ) : (
                        <>
                          <input
                            type="number"
                            min={0}
                            max={it.approved_qty ?? undefined}
                            value={entry.actual_deducted_qty}
                            onChange={(e) => handleQtyChange(it.item_id, e.target.value)}
                            className={`${styles.qtyInput} ${!valid ? styles.invalid : ''}`}
                            aria-invalid={!valid}
                            disabled={isProcessing}
                          />
                          {!valid && msg && <div className={styles.helperText}>{msg}</div>}
                        </>
                      )}
                    </div>
                    <div className={styles.cellWithInput}>
                      {isHistory ? (
                        it.deduction_reason || '-'
                      ) : showReasonInput ? (
                        <>
                          <input
                            type="text"
                            placeholder="เหตุผล"
                            value={entry.deduction_reason || ''}
                            onChange={(e) => handleReasonChange(it.item_id, e.target.value)}
                            className={styles.reasonInput}
                            disabled={isProcessing}
                          />
                          {!valid && msg && <div className={styles.helperText}>{msg}</div>}
                        </>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* เติมแถวว่างให้ครบ 12 แถวเสมอ */}
              {Array.from({ length: fillersCount }).map((_, i) => (
                <div key={`filler-${i}`} className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`} aria-hidden="true">
                  {Array.from({ length: COLS }).map((__, j) => (
                    <div key={j}>&nbsp;</div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {!isHistory && (
          <button
            onClick={handleDeduct}
            disabled={isProcessing || !allValid || !rows.length}
            className={styles.primaryBtn}
            title={!allValid ? 'ตรวจสอบจำนวน/เหตุผลให้ครบทุกแถว' : 'ยืนยันการเบิก-จ่าย'}
          >
            {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยันเบิก-จ่าย'}
          </button>
        )}
        <button onClick={() => router.push('/manage/stockDeduction')} className={styles.secondaryBtn}>
          ย้อนกลับ
        </button>
      </div>
    </div>
  );
}
