'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import Swal from 'sweetalert2';
import Image from 'next/image';
import styles from './page.module.css';
import { FaSave, FaTimesCircle, FaThumbsDown } from 'react-icons/fa'; // ⬅️ เพิ่มไอคอน

// รูปสินค้า
function ItemImage({ item_img, alt }) {
  const defaultImg = "http://localhost:5000/public/defaults/landscape.png";
  const [imgSrc, setImgSrc] = useState(
    item_img && typeof item_img === "string" && item_img.trim() !== ""
      ? `http://localhost:5000/uploads/${item_img}`
      : defaultImg
  );

  return (
    <Image
      src={imgSrc}
      alt={alt || "ไม่มีคำอธิบายภาพ"}
      width={40}
      height={40}
      style={{ objectFit: "cover", borderRadius: 8 }}
      onError={() => setImgSrc(defaultImg)}
    />
  );
}

export default function ApprovalRequestPage() {
  const { request_id } = useParams();
  const router = useRouter();

  const [request, setRequest] = useState(null);
  const [details, setDetails] = useState([]);
  const [draftDetails, setDraftDetails] = useState({});
  const [itemErrors, setItemErrors] = useState({});
  const [tooltip, setTooltip] = useState({});
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const statusMap = {
    waiting_approval_detail: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธแล้ว',
    waiting_approval: 'รอการอนุมัติ',
    approved_all: 'อนุมัติทั้งหมด',
    rejected_all: 'ปฏิเสธทั้งหมด',
    approved_partial: 'อนุมัติบางส่วน',
    rejected_partial: 'ปฏิเสธบางส่วน',
    approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน',
    preparing: 'กำลังจัดเตรียม',
    delivering: 'กำลังนำส่ง',
    completed: 'เสร็จสิ้น',
    canceled: 'ยกเลิกคำขอ',
    approved_in_queue: 'รอกำเนินการ',
  };

  const disabledOverallStatuses = [
    "preparing","delivering","completed","canceled",
    "approved_all","rejected_all","approved_partial",
    "rejected_partial","approved_partial_and_rejected_partial"
  ];

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('user_id')) {
      localStorage.setItem('user_id', '999');
      localStorage.setItem('user_fname', 'ชื่อจำลอง');
      localStorage.setItem('user_lname', 'ผู้อนุมัติ');
    }
  }, []);

  useEffect(() => { if (request_id) fetchRequestDetail(); }, [request_id]);

  const fetchRequestDetail = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/approval/${request_id}`);
      setRequest(res.data.request);
      setDetails(res.data.details);

      const initialDraft = {};
      res.data.details.forEach(d => {
        initialDraft[d.request_detail_id] = {
          status: d.approval_status,
          approved_qty:
            d.approved_qty !== null && d.approved_qty !== undefined
              ? d.approved_qty
              : (d.approval_status === 'rejected' ? 0 : d.requested_qty),
          reason: d.approval_note
        };
      });
      setDraftDetails(initialDraft);
      setItemErrors({});
      setTooltip({});
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด','ไม่สามารถโหลดข้อมูลคำขอได้','error');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (id, newStatus, newApprovedQty, reason='') => {
    setDraftDetails(prev => ({
      ...prev,
      [id]: {
        status: newStatus,
        approved_qty: newApprovedQty,
        reason: newStatus === 'rejected' ? (reason || null) : null
      }
    }));
    setItemErrors(prev => ({ ...prev, [id]: '' }));
    setTooltip(prev => ({ ...prev, [id]: { show:false, message:'' } }));
  };

  const handleApproveOne = (d) =>
    updateDraft(d.request_detail_id, 'approved', d.requested_qty);

  const handleRejectOne = async (d) => {
    const { value: reason } = await Swal.fire({
      title: 'ปฏิเสธรายการนี้',
      input: 'textarea',
      inputLabel: 'ระบุเหตุผล',
      inputPlaceholder: 'เช่น พัสดุหมด, ไม่สามารถให้ยืม',
      showCancelButton: true,
      confirmButtonText: '❌ ปฏิเสธ',
      cancelButtonText: 'ยกเลิก'
    });
    if (reason === undefined) return;
    updateDraft(d.request_detail_id, 'rejected', 0, reason);
  };

  const handleApprovedQtyChange = (id, value, requestedQty) => {
    let errorMsg = '';
    let finalQty = null;

    const current = draftDetails[id];
    if (current?.status === 'rejected') {
      setDraftDetails(p => ({ ...p, [id]: { ...p[id], approved_qty: 0 } }));
      return;
    }

    if (value === '') {
      finalQty = '';
    } else {
      const n = parseInt(value, 10);
      if (isNaN(n) || n < 0) { errorMsg = 'กรอกจำนวนเป็นเลขไม่ติดลบ'; finalQty = 0; }
      else if (n > requestedQty) { errorMsg = `จำนวนต้องไม่เกิน ${requestedQty}`; finalQty = requestedQty; }
      else { finalQty = n; }
    }

    setItemErrors(prev => ({ ...prev, [id]: errorMsg }));
    setTooltip(prev => ({ ...prev, [id]: { show: !!errorMsg, message: errorMsg }}));

    setDraftDetails(prev => ({ ...prev, [id]: { ...(prev[id]||{}), approved_qty: finalQty }}));
  };

  const handleSaveDraft = async () => {
    if (request && disabledOverallStatuses.includes(request.request_status)) {
      Swal.fire('ไม่สามารถบันทึกได้','คำขออยู่ในสถานะที่ไม่อนุญาตให้แก้ไขแล้ว','warning');
      return;
    }

    if (Object.values(itemErrors).some(e => e)) {
      Swal.fire('ข้อผิดพลาด','กรุณาแก้ไขข้อมูลจำนวนที่อนุมัติให้ถูกต้องก่อนบันทึก','error');
      return;
    }

    const changesToSave = Object.keys(draftDetails)
      .map(idStr => {
        const id = parseInt(idStr, 10);
        const original = details.find(d => d.request_detail_id === id);
        const draft = draftDetails[idStr];
        if (!original) return null;

        const approvedQty =
          draft.approved_qty === '' ? 0 :
          (isNaN(parseInt(draft.approved_qty,10)) ? 0 : parseInt(draft.approved_qty,10));

        if (approvedQty === 0 && draft.status !== 'rejected') {
          setItemErrors(prev => ({ ...prev, [idStr]:'จำนวนที่อนุมัติเป็น 0 ไม่ได้ หากสถานะไม่ใช่ปฏิเสธ' }));
          setTooltip(prev => ({ ...prev, [idStr]: { show:true, message:'จำนวนที่อนุมัติเป็น 0 ไม่ได้ หากสถานะไม่ใช่ปฏิเสธ' } }));
          return null;
        }
        if (draft.status === 'rejected' && approvedQty !== 0) {
          setItemErrors(prev => ({ ...prev, [idStr]:'จำนวนที่อนุมัติควรเป็น 0 เมื่อสถานะปฏิเสธ' }));
          setTooltip(prev => ({ ...prev, [idStr]: { show:true, message:'จำนวนที่อนุมัติควรเป็น 0 เมื่อสถานะปฏิเสธ' } }));
          return null;
        }

        return {
          request_detail_id: id,
          status: draft.status,
          approved_qty: approvedQty,
          note: draft.reason || null,
          old_status: original.approval_status,
        };
      })
      .filter(Boolean)
      .filter(u => {
        const orig = details.find(d => d.request_detail_id === u.request_detail_id);
        return (
          u.status !== orig.approval_status ||
          u.approved_qty !== orig.approved_qty ||
          (u.status === 'rejected' && u.note !== orig.approval_note)
        );
      });

    if (!changesToSave.length) {
      Swal.fire('ไม่พบการเปลี่ยนแปลง','ไม่มีรายการใดที่ถูกเลือกเพื่อบันทึก','info');
      return;
    }

    const ok = await Swal.fire({
      title: 'ยืนยันการบันทึก',
      text: 'ต้องการบันทึกการอนุมัติ/ปฏิเสธหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '💾 บันทึก',
      cancelButtonText: 'ยกเลิก'
    });
    if (!ok.isConfirmed) return;

    setLoading(true);
    try {
      const userId = parseInt(localStorage.getItem('user_id'), 10);
      await axiosInstance.put(`/approval/${request_id}/bulk-update`, { updates: changesToSave, userId });
      Swal.fire('สำเร็จ','บันทึกสำเร็จแล้ว','success');
      await fetchRequestDetail();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'ไม่สามารถบันทึกได้';
      Swal.fire('ผิดพลาด', msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ⬅️ ปุ่มปฏิเสธทั้งหมด
  const handleRejectAll = async () => {
    if (isOverallDisabled) {
      Swal.fire('ไม่สามารถทำได้', 'คำขออยู่ในสถานะที่ไม่อนุญาตให้แก้ไขแล้ว', 'warning');
      return;
    }
    const { value: reason } = await Swal.fire({
      title: 'ปฏิเสธทั้งหมด',
      input: 'textarea',
      inputLabel: 'เหตุผล (จะแนบให้ทุกรายการ)',
      inputPlaceholder: 'เช่น พัสดุหมด, ไม่เข้าเกณฑ์การเบิก',
      showCancelButton: true,
      confirmButtonText: '❌ ปฏิเสธทั้งหมด',
      cancelButtonText: 'ยกเลิก',
    });
    if (reason === undefined) return;

    setDraftDetails((prev) => {
      const next = { ...prev };
      details.forEach((d) => {
        next[d.request_detail_id] = {
          ...(next[d.request_detail_id] || {
            status: d.approval_status,
            approved_qty:
              d.approved_qty ?? (d.approval_status === 'rejected' ? 0 : d.requested_qty),
            reason: d.approval_note,
          }),
          status: 'rejected',
          approved_qty: 0,
          reason,
        };
      });
      return next;
    });
    setItemErrors({});
    setTooltip({});
  };

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = details.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(details.length / itemsPerPage);

  const summary = useMemo(() => {
    const c = { totalItems: 0, approvedCount: 0, rejectedCount: 0, pendingCount: 0 };
    details.forEach(d => {
      const st = draftDetails[d.request_detail_id]?.status || d.approval_status;
      c.totalItems += d.requested_qty;
      if (st === 'approved') c.approvedCount += 1;
      else if (st === 'rejected') c.rejectedCount += 1;
      else c.pendingCount += 1;
    });
    return c;
  }, [details, draftDetails]);

  const isOverallDisabled = request && disabledOverallStatuses.includes(request.request_status);

  const pillClassByStatus = (s) => {
    if (s === 'approved') return `${styles.badge} ${styles.badgeGreen}`;
    if (s === 'rejected') return `${styles.badge} ${styles.badgeRed}`;
    return `${styles.badge} ${styles.badgeYellow}`;
  };

  if (loading) return <p className={styles.loading}>กำลังโหลดข้อมูล...</p>;
  if (!request) return <p className={styles.error}>ไม่พบคำขอ</p>;

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h2 className={styles.title}>รายละเอียดคำขอ: {request.request_code}</h2>

        <div className={styles.infoGrid}>
          <div className={styles.infoLeft}>
            <div><strong>วันที่ขอ:</strong> {new Date(request.request_date).toLocaleDateString('th-TH')}</div>
            <div><strong>กำหนดส่ง:</strong> {request.request_due_date ? new Date(request.request_due_date).toLocaleDateString('th-TH') : '-'}</div>
            <div><strong>ผู้ขอ:</strong> {request.user_name} ({request.department})</div>
            <div><strong>ประเภทคำขอ:</strong> {request.request_type === 'borrow' ? 'ยืม' : 'เบิก'}</div>
            <div><strong>สถานะ:</strong> <span className={styles.status}>{statusMap[request.request_status]}</span></div>
            <div><strong>ความเร่งด่วน:</strong> {request.is_urgent ? 'ด่วน' : 'ปกติ'}</div>
            <div className={styles.summary}>
              รวมทั้งหมด: {details.length} รายการ ({summary.totalItems} ชิ้น) | อนุมัติ: {summary.approvedCount} | ปฏิเสธ: {summary.rejectedCount} | รออนุมัติ: {summary.pendingCount}
            </div>
          </div>
          <div className={styles.noteBox}>
            <strong>หมายเหตุ:</strong>
            <div>{request.request_note || '-'}</div>
          </div>
        </div>

        <h3 className={styles.subtitle}>รายการที่ขอ</h3>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            {/* จัดคอลัมน์ให้ขนานกัน */}
            <colgroup>
              <col style={{ width: '70px' }} />    {/* ลำดับ */}
              <col style={{ width: '72px' }} />    {/* รูป */}
              <col style={{ width: 'auto' }} />    {/* ชื่อพัสดุ */}
              <col style={{ width: '130px' }} />   {/* ขอ */}
              <col style={{ width: '110px' }} />   {/* หน่วย */}
              <col style={{ width: '150px' }} />   {/* สถานะ */}
              <col style={{ width: '160px' }} />   {/* อนุมัติ */}
              <col style={{ width: '220px' }} />   {/* จัดการ */}
            </colgroup>

            <thead className={styles.tableHead}>
              <tr>
                <th>ลำดับ</th>
                <th>รูป</th>
                <th>ชื่อพัสดุ</th>
                <th>จำนวนที่ขอ</th>
                <th>หน่วย</th>
                <th>สถานะ</th>
                <th>จำนวนที่อนุมัติ</th>
                <th>จัดการ</th>
              </tr>
            </thead>

            <tbody>
              {currentItems.map((d, i) => {
                const draft = draftDetails[d.request_detail_id] || {
                  status: d.approval_status,
                  approved_qty: d.approved_qty,
                  reason: d.approval_note
                };

                const st = draft?.status;
                const statusText = statusMap[st] || st;
                const displayApprovedQty =
                  draft?.approved_qty !== undefined
                    ? String(draft.approved_qty)
                    : (d.approved_qty ?? '') + '';

                const qtyDisabled = isOverallDisabled || st === 'rejected';
                const btnDisabled = isOverallDisabled;

                return (
                  <tr key={d.request_detail_id}>
                    <td data-label="ลำดับ">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td data-label="รูป"><ItemImage item_img={d.item_img} alt={d.item_name} /></td>
                    <td data-label="ชื่อพัสดุ" title={d.item_name}>{d.item_name}</td>
                    <td data-label="จำนวนที่ขอ">{d.requested_qty}</td>
                    <td data-label="หน่วย">{d.item_unit}</td>

                    {/* สถานะเป็น pill ให้เหมือนหน้าอื่น */}
                    <td data-label="สถานะ">
                      <span className={pillClassByStatus(st)}>{statusText}</span>
                    </td>

                    <td data-label="จำนวนที่อนุมัติ">
                      <div
                        className={styles.tooltipContainer}
                        onMouseOver={() => tooltip?.[d.request_detail_id]?.message &&
                          setTooltip(prev => ({ ...prev, [d.request_detail_id]: { ...prev?.[d.request_detail_id], show: true } }))}
                        onMouseOut={() => setTooltip(prev => ({ ...prev, [d.request_detail_id]: { ...prev?.[d.request_detail_id], show: false } }))}
                        onFocus={() => tooltip?.[d.request_detail_id]?.message &&
                          setTooltip(prev => ({ ...prev, [d.request_detail_id]: { ...prev?.[d.request_detail_id], show: true } }))}
                        onBlur={() => setTooltip(prev => ({ ...prev, [d.request_detail_id]: { ...prev?.[d.request_detail_id], show: false } }))}
                      >
                        <input
                          type="number"
                          value={displayApprovedQty}
                          onChange={(e) => handleApprovedQtyChange(d.request_detail_id, e.target.value, d.requested_qty)}
                          min="0"
                          max={d.requested_qty}
                          className={`${styles.approvedQtyInput} ${itemErrors?.[d.request_detail_id] ? styles.inputErrorBorder : ''}`}
                          disabled={qtyDisabled}
                        />
                        {(itemErrors?.[d.request_detail_id] || tooltip?.[d.request_detail_id]?.show) && tooltip?.[d.request_detail_id]?.message && (
                          <div className={styles.tooltip}>{tooltip?.[d.request_detail_id]?.message}</div>
                        )}
                      </div>
                    </td>

                    <td data-label="จัดการ" className={styles.actionsCell}>
  <div className={styles.actionBtnGroup}>
    {btnDisabled ? (
      <>
        <button disabled className={`${styles.actionButton} ${styles.disabled}`}>✅ อนุมัติ</button>
        <button disabled className={`${styles.actionButton} ${styles.disabled}`}>❌ ปฏิเสธ</button>
      </>
    ) : (
      <>
        <button onClick={() => handleApproveOne(d)} className={`${styles.actionButton} ${styles.approve}`}>✅ อนุมัติ</button>
        <button onClick={() => handleRejectOne(d)} className={`${styles.actionButton} ${styles.reject}`}>❌ ปฏิเสธ</button>
      </>
    )}
  </div>
</td>
                  </tr>
                );
              })}

              {Array.from({ length: itemsPerPage - currentItems.length }).map((_, idx) => (
                <tr key={`empty-${idx}`} className={styles.emptyRow}>
                  <td colSpan={8}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.saveButton}
            onClick={handleSaveDraft}
            disabled={
              Object.keys(draftDetails).length === 0 ||
              isOverallDisabled ||
              loading ||
              Object.values(itemErrors).some(Boolean)
            }
          >
            <FaSave className={styles.btnIcon} aria-hidden="true" />
            บันทึก
          </button>

          <button className={styles.cancelButton} onClick={() => router.push('/manage/requestList')}>
            <FaTimesCircle className={styles.btnIcon} aria-hidden="true" />
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}