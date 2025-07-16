'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import Swal from 'sweetalert2';
import Image from 'next/image';
import styles from './page.module.css';

// Component สำหรับแสดงรูปภาพสินค้า
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

// Main Component: ApprovalDetailPage
export default function ApprovalRequestPage() {
    const { request_id } = useParams();
    const router = useRouter();
    const [request, setRequest] = useState(null);
    const [details, setDetails] = useState([]);
    const [draftDetails, setDraftDetails] = useState({});
    const [itemErrors, setItemErrors] = useState({});
    const [tooltip, setTooltip] = useState({}); // { [itemId]: { show: boolean, message: string } }
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Map สถานะเป็นภาษาไทย
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
        pending: 'รอดำเนินการ (จัดเตรียม)',
    };

    // สถานะคำขอรวมที่ไม่สามารถแก้ไขได้ (ใช้กับคำขอโดยรวม)
    const disabledOverallStatuses = [
        "preparing",
        "delivering",
        "completed",
        "canceled",
        "approved_all",
        "rejected_all",
        "approved_partial",
        "rejected_partial",
        "approved_partial_and_rejected_partial"
    ];

    // จำลอง user_id สำหรับการทดสอบ (ควรใช้จากระบบ Authentication จริง)
    useEffect(() => {
        if (typeof window !== 'undefined' && !localStorage.getItem('user_id')) {
            localStorage.setItem('user_id', '999');
            localStorage.setItem('user_fname', 'ชื่อจำลอง');
            localStorage.setItem('user_lname', 'ผู้อนุมัติ');
        }
    }, []);

    // Fetch ข้อมูลคำขอเมื่อ request_id เปลี่ยน
    useEffect(() => {
        if (request_id) fetchRequestDetail();
    }, [request_id]);

    // ฟังก์ชันดึงข้อมูลรายละเอียดคำขอ
    const fetchRequestDetail = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/approval/${request_id}`);
            setRequest(res.data.request);
            setDetails(res.data.details);
            const initialDraft = {};
            res.data.details.forEach(detail => {
                initialDraft[detail.request_detail_id] = {
                    status: detail.approval_status,
                    approved_qty: (detail.approved_qty !== null && detail.approved_qty !== undefined)
                        ? detail.approved_qty
                        : (detail.approval_status === 'rejected' ? 0 : detail.requested_qty), // Default to 0 if rejected
                    reason: detail.approval_note
                };
            });
            setDraftDetails(initialDraft);
            setItemErrors({});
            setTooltip({});
            setCurrentPage(1);
            console.log("Fetched and updated details:", res.data.details);
            console.log("Initial draft after fetch:", initialDraft);
        } catch (err) {
            console.error("Error fetching request detail:", err);
            Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลคำขอได้', 'error');
        } finally {
            setLoading(false);
        }
    };

    // อัปเดตสถานะและจำนวนใน draftDetails
    const updateDraft = (id, newStatus, newApprovedQty, reason = '') => {
        setDraftDetails(prev => ({
            ...prev,
            [id]: {
                status: newStatus,
                approved_qty: newApprovedQty,
                reason: newStatus === 'rejected' ? (reason || null) : null
            }
        }));
        setItemErrors(prev => ({ ...prev, [id]: '' })); // Clear errors when status changes
        setTooltip(prev => ({ ...prev, [id]: { show: false, message: '' } })); // Hide tooltip
    };

    // Handler เมื่อกดปุ่มอนุมัติรายการเดียว
    const handleApproveOne = (detail) => {
        // เมื่อกดอนุมัติ ให้กำหนดสถานะเป็น approved และจำนวนเป็น requested_qty
        // แต่ยังคงอนุญาตให้ผู้ใช้แก้ไขจำนวนได้หลังจากนี้
        updateDraft(detail.request_detail_id, 'approved', detail.requested_qty);
    };

    // Handler เมื่อกดปุ่มปฏิเสธรายการเดียว
    const handleRejectOne = async (detail) => {
        const { value: reason } = await Swal.fire({
            title: 'ปฏิเสธรายการนี้',
            input: 'textarea',
            inputLabel: 'ระบุเหตุผล',
            inputPlaceholder: 'เช่น พัสดุหมด, ไม่สามารถให้ยืม',
            showCancelButton: true,
            confirmButtonText: '❌ ปฏิเสธ',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                confirmButton: 'swal2-confirm swal2-styled swal2-deny-button',
                cancelButton: 'swal2-cancel swal2-styled'
            }
        });
        if (reason === undefined) return;
        // เมื่อกดปฏิเสธ ให้กำหนดสถานะเป็น rejected และจำนวนเป็น 0 ทันที
        updateDraft(detail.request_detail_id, 'rejected', 0, reason);
    };

    // Handler เมื่อมีการเปลี่ยนจำนวนที่อนุมัติใน input field
    const handleApprovedQtyChange = (id, value, requestedQty) => {
        let errorMsg = '';
        let finalQtyForDraft = null;

        const currentDetailInDraft = draftDetails[id];
        // ตรวจสอบว่าสถานะปัจจุบันใน draftDetails เป็น 'rejected' หรือไม่
        // ถ้าเป็น 'rejected' ไม่ต้องทำอะไรกับการเปลี่ยนจำนวน เพราะ input ควรจะ disabled อยู่แล้ว
        if (currentDetailInDraft?.status === 'rejected') {
            // ไม่ควรมาถึงตรงนี้หาก input ถูก disabled อย่างถูกต้อง
            // แต่เพื่อความปลอดภัย ให้ตั้งค่าเป็น 0 และออกจากฟังก์ชัน
            setDraftDetails(prev => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    approved_qty: 0,
                }
            }));
            return;
        }

        if (value === '') {
            errorMsg = '';
            finalQtyForDraft = ''; // ให้แสดงเป็นช่องว่างได้
        } else {
            const parsedValue = parseInt(value, 10);
            if (isNaN(parsedValue) || parsedValue < 0 || parsedValue > requestedQty) {
                if (isNaN(parsedValue) || parsedValue < 0) {
                     errorMsg = 'กรุณากรอกจำนวนให้เป็นตัวเลขที่ไม่ติดลบ';
                     finalQtyForDraft = 0; // หรือคงค่าเดิมไว้
                } else if (parsedValue > requestedQty) {
                     errorMsg = `จำนวนต้องไม่เกิน ${requestedQty}`;
                     finalQtyForDraft = requestedQty; // ตั้งค่าเป็น max เพื่อไม่ให้เกิน
                }
            } else {
                errorMsg = '';
                finalQtyForDraft = parsedValue;
            }
        }

        setItemErrors(prev => ({
            ...prev,
            [id]: errorMsg
        }));

        if (errorMsg) {
            setTooltip(prev => ({ ...prev, [id]: { show: true, message: errorMsg } }));
        } else {
            setTooltip(prev => ({ ...prev, [id]: { show: false, message: '' } }));
        }

        setDraftDetails(prev => {
            const currentDraft = prev[id] || {};
            // สถานะควรคงเดิมตามที่ผู้ใช้เลือก (approved/waiting_approval_detail)
            // หรือถ้าเป็น rejected ควรจะถูก updateDraft ไปแล้วตั้งแต่แรก
            return {
                ...prev,
                [id]: {
                    ...currentDraft,
                    approved_qty: finalQtyForDraft,
                }
            };
        });
    };


    // Handler สำหรับบันทึกการเปลี่ยนแปลงทั้งหมด
    const handleSaveDraft = async () => {
        if (request && disabledOverallStatuses.includes(request.request_status)) {
            Swal.fire('ไม่สามารถบันทึกได้', 'คำขออยู่ในสถานะที่ไม่อนุญาตให้แก้ไขแล้ว', 'warning');
            return;
        }

        const hasInputErrors = Object.values(itemErrors).some(error => error !== '');
        if (hasInputErrors) {
            Swal.fire('ข้อผิดพลาด', 'กรุณาแก้ไขข้อมูลในช่องจำนวนที่อนุมัติให้ถูกต้องก่อนบันทึก', 'error');
            return;
        }

        const changesToSave = Object.keys(draftDetails)
            .map(detailId => {
                const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
                const draft = draftDetails[detailId];
                if (!originalDetail) return null;

                const approvedQtyForBackend = typeof draft.approved_qty === 'string' && draft.approved_qty === ''
                    ? 0 // Treat empty string as 0 for backend
                    : (isNaN(parseInt(draft.approved_qty, 10)) ? 0 : parseInt(draft.approved_qty, 10));

                // If status is NOT rejected, and approved_qty is 0, show error
                if (approvedQtyForBackend === 0 && draft.status !== 'rejected') {
                    setItemErrors(prev => ({ ...prev, [detailId]: 'จำนวนที่อนุมัติเป็น 0 ไม่ได้ หากสถานะไม่ใช่ปฏิเสธ' }));
                    setTooltip(prev => ({ ...prev, [detailId]: { show: true, message: 'จำนวนที่อนุมัติเป็น 0 ไม่ได้ หากสถานะไม่ใช่ปฏิเสธ' } }));
                    return null;
                }
                // If status is rejected, ensure approved_qty is 0
                if (draft.status === 'rejected' && approvedQtyForBackend !== 0) {
                     setItemErrors(prev => ({ ...prev, [detailId]: 'จำนวนที่อนุมัติควรเป็น 0 เมื่อสถานะปฏิเสธ' }));
                     setTooltip(prev => ({ ...prev, [detailId]: { show: true, message: 'จำนวนที่อนุมัติควรเป็น 0 เมื่อสถานะปฏิเสธ' } }));
                     return null;
                }


                return {
                    request_detail_id: parseInt(detailId, 10),
                    status: draft.status,
                    approved_qty: approvedQtyForBackend,
                    note: draft.reason || null,
                    old_status: originalDetail.approval_status,
                };
            })
            .filter(item => {
                if (!item) return false;
                const originalDetail = details.find(d => d.request_detail_id === item.request_detail_id);
                // Only include items that actually changed
                return (
                    item.status !== originalDetail.approval_status ||
                    item.approved_qty !== originalDetail.approved_qty ||
                    (item.status === 'rejected' && item.note !== originalDetail.approval_note)
                );
            });

        if (Object.values(itemErrors).some(error => error !== '')) {
            Swal.fire('ข้อผิดพลาด', 'กรุณาแก้ไขข้อมูลในช่องจำนวนที่อนุมัติให้ถูกต้องก่อนบันทึก', 'error');
            return;
        }

        if (changesToSave.length === 0) {
            Swal.fire('ไม่พบการเปลี่ยนแปลง', 'ไม่มีรายการใดที่ถูกเลือกเพื่อบันทึก', 'info');
            return;
        }

        const confirm = await Swal.fire({
            title: 'ยืนยันการบันทึก',
            text: 'คุณต้องการบันทึกการอนุมัติ/ปฏิเสธหรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '💾 บันทึก',
            cancelButtonText: 'ยกเลิก'
        });
        if (!confirm.isConfirmed) return;

        setLoading(true);
        try {
            const userId = parseInt(localStorage.getItem('user_id'), 10);
            await axiosInstance.put(`/approval/${request_id}/bulk-update`, { updates: changesToSave, userId });
            Swal.fire('สำเร็จ', 'บันทึกสำเร็จแล้ว', 'success');
            await fetchRequestDetail();
        } catch (err) {
            console.error("Error saving draft:", err);
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'ไม่สามารถบันทึกได้';
            Swal.fire('ผิดพลาด', errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    // การแบ่งหน้า
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = details.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(details.length / itemsPerPage);

    // สรุปจำนวนตามสถานะต่างๆ
    const summary = useMemo(() => {
        const counts = { totalItems: 0, approvedCount: 0, rejectedCount: 0, pendingCount: 0 };
        details.forEach(d => {
            const currentStatus = draftDetails[d.request_detail_id]?.status || d.approval_status;
            counts.totalItems += d.requested_qty; // นับตามจำนวนที่ขอทั้งหมด

            if (currentStatus === 'approved') counts.approvedCount += 1;
            else if (currentStatus === 'rejected') counts.rejectedCount += 1;
            else counts.pendingCount += 1;
        });
        return counts;
    }, [details, draftDetails]);

    // ตรวจสอบว่าคำขอโดยรวมอยู่ในสถานะที่แก้ไขไม่ได้แล้วหรือไม่
    const isOverallRequestDisabled = request && disabledOverallStatuses.includes(request.request_status);

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
                            รวมทั้งหมด: {details.length} รายการ ({summary.totalItems} ชิ้น) |
                            อนุมัติ: {summary.approvedCount} |
                            ปฏิเสธ: {summary.rejectedCount} |
                            รออนุมัติ: {summary.pendingCount}
                        </div>
                    </div>
                    <div className={styles.noteBox}>
                        <strong>หมายเหตุ:</strong>
                        <div>{request.request_note || '-'}</div>
                    </div>
                </div>

                <h3 className={styles.subtitle}>รายการที่ขอ:</h3>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
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
                                const currentItemStatus = draft?.status;
                                const statusText = statusMap[currentItemStatus] || currentItemStatus;

                                const displayApprovedQty = draft?.approved_qty !== undefined
                                    ? String(draft.approved_qty)
                                    : (d.approved_qty !== undefined && d.approved_qty !== null
                                        ? String(d.approved_qty)
                                        : '');

                                // **เงื่อนไขสำหรับ Input Field (จำนวนที่อนุมัติ)**
                                // Input จะถูก disabled เมื่อ:
                                // 1. คำขอโดยรวมอยู่ในสถานะที่แก้ไขไม่ได้แล้ว (isOverallRequestDisabled)
                                // หรือ
                                // 2. สถานะของรายการนั้นใน draftDetails เป็น 'rejected'
                                const isQuantityInputDisabled = isOverallRequestDisabled || (currentItemStatus === 'rejected');

                                // **เงื่อนไขสำหรับ Action Buttons (อนุมัติ/ปฏิเสธ)**
                                // ปุ่มจะถูก disabled ก็ต่อเมื่อ:
                                // 1. คำขอโดยรวมอยู่ในสถานะที่แก้ไขไม่ได้แล้วเท่านั้น (isOverallRequestDisabled)
                                const areItemActionButtonsDisabled = isOverallRequestDisabled;

                                return (
                                    <tr key={d.request_detail_id}>
                                        <td data-label="ลำดับ">{indexOfFirstItem + i + 1}</td>
                                        <td data-label="รูป">
                                            <ItemImage item_img={d.item_img} alt={d.item_name} />
                                        </td>
                                        <td data-label="ชื่อพัสดุ">{d.item_name}</td>
                                        <td data-label="จำนวนที่ขอ">{d.requested_qty}</td>
                                        <td data-label="หน่วย">{d.item_unit}</td>
                                        <td data-label="สถานะ">{statusText}</td>
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
                                                    disabled={isQuantityInputDisabled}
                                                />
                                                {(itemErrors?.[d.request_detail_id] || tooltip?.[d.request_detail_id]?.show) && tooltip?.[d.request_detail_id]?.message && (
                                                    <div className={styles.tooltip}>
                                                        {tooltip?.[d.request_detail_id]?.message}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="จัดการ">
                                            {areItemActionButtonsDisabled ? (
                                                <>
                                                    <button
                                                        disabled
                                                        className={`${styles.actionButton} ${styles.disabled}`}
                                                        title="คำขออยู่ในสถานะที่ไม่สามารถแก้ไขได้"
                                                    >
                                                        ✅ อนุมัติ
                                                    </button>
                                                    <button
                                                        disabled
                                                        className={`${styles.actionButton} ${styles.disabled}`}
                                                        title="คำขออยู่ในสถานะที่ไม่สามารถแก้ไขได้"
                                                    >
                                                        ❌ ปฏิเสธ
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => handleApproveOne(d)}
                                                        className={`${styles.actionButton} ${styles.approve}`}
                                                        title="อนุมัติรายการนี้"
                                                    >
                                                        ✅ อนุมัติ
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectOne(d)}
                                                        className={`${styles.actionButton} ${styles.reject}`}
                                                        title="ปฏิเสธรายการนี้"
                                                    >
                                                        ❌ ปฏิเสธ
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {Array.from({ length: itemsPerPage - currentItems.length }).map((_, idx) => (
                                <tr key={`empty-${idx}`} className={styles.emptyRow}>
                                    <td colSpan="8">&nbsp;</td>
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
                            isOverallRequestDisabled ||
                            loading ||
                            Object.values(itemErrors).some(error => error !== '')
                        }
                    >
                        💾 ยืนยันการบันทึก
                    </button>
                    <button
                        className={styles.cancelButton}
                        onClick={() => router.push('/manage/requestList')}
                    >
                        ❌ ยกเลิก
                    </button>
                </div>

                <div className={styles.pagination}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => prev - 1)}
                        className={styles.pageButton}
                    >
                        ⬅️ ก่อนหน้า
                    </button>
                    <span>หน้า {currentPage} / {totalPages}</span>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className={styles.pageButton}
                    >
                        ถัดไป ➡️
                    </button>
                </div>
            </div>
        </div>
    );
}