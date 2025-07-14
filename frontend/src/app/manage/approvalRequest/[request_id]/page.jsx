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
    // draftDetails เก็บทั้ง status, reason, และ approved_qty
    const [draftDetails, setDraftDetails] = useState({});
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

    // สถานะคำขอรวมที่ไม่สามารถแก้ไขได้
    const disabledOverallStatuses = ["preparing", "delivering", "completed", "canceled", "approved_all", "rejected_all", "approved_partial", "rejected_partial", "approved_partial_and_rejected_partial"];

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
            // เมื่อโหลดข้อมูลใหม่ ให้รีเซ็ต draftDetails
            setDraftDetails({});
            setCurrentPage(1);
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
                approved_qty: newApprovedQty, // เพิ่ม approved_qty
                reason: reason || null
            }
        }));
    };

    // Handler เมื่อกดปุ่มอนุมัติรายการเดียว
    const handleApproveOne = (detail) => {
        // กำหนดจำนวนที่อนุมัติเริ่มต้นเท่ากับจำนวนที่ขอ
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
            cancelButtonText: 'ยกเลิก'
        });
        if (reason === undefined) return;
        // เมื่อปฏิเสธ จำนวนที่อนุมัติเป็น 0
        updateDraft(detail.request_detail_id, 'rejected', 0, reason);
    };

    // Handler เมื่อมีการเปลี่ยนจำนวนที่อนุมัติใน input field
    const handleApprovedQtyChange = (id, value, requestedQty) => {
        const parsedValue = parseInt(value, 10);
        // ตรวจสอบให้แน่ใจว่าเป็นตัวเลขและไม่ติดลบ
        const newQty = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
        // ไม่ให้เกินจำนวนที่ขอ
        const finalQty = Math.min(newQty, requestedQty);

        setDraftDetails(prev => {
            const currentDraft = prev[id] || {};
            return {
                ...prev,
                [id]: {
                    ...currentDraft,
                    status: currentDraft.status || 'waiting_approval_detail', // รักษาสถานะเดิม หรือตั้งเป็นรออนุมัติ
                    approved_qty: finalQty, // อัปเดตจำนวนที่อนุมัติ
                }
            };
        });
    };

    // Handler สำหรับบันทึกการเปลี่ยนแปลงทั้งหมด
    const handleSaveDraft = async () => {
        // กรองเฉพาะรายการที่มีการเปลี่ยนแปลงจากสถานะเดิม หรือมีการเปลี่ยนแปลง approved_qty
        const changesToSave = Object.keys(draftDetails)
            .filter(detailId => {
                const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
                const draft = draftDetails[detailId];
                // ตรวจสอบว่าสถานะเปลี่ยนไป หรือ approved_qty เปลี่ยนไป
                return (
                    draft.status !== originalDetail?.approval_status ||
                    draft.approved_qty !== originalDetail?.approved_qty
                );
            })
            .map(detailId => {
                const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
                const draft = draftDetails[detailId];
                return {
                    request_detail_id: parseInt(detailId, 10),
                    status: draft.status,
                    approved_qty: draft.approved_qty, // ส่ง approved_qty ไปด้วย
                    note: draft.reason || null,
                    old_status: originalDetail?.approval_status, // สถานะเดิม (สำหรับบันทึกประวัติ)
                };
            });

        if (changesToSave.length === 0) {
            Swal.fire('ไม่พบการเปลี่ยนแปลง', 'ไม่มีรายการใดที่ถูกเลือกเพื่อบันทึก', 'info');
            return;
        }

        if (request && disabledOverallStatuses.includes(request.request_status)) {
            Swal.fire('ไม่สามารถบันทึกได้', 'คำขออยู่ในสถานะที่ไม่อนุญาตให้แก้ไขแล้ว', 'warning');
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
            await fetchRequestDetail(); // โหลดข้อมูลใหม่หลังจากบันทึก
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
            counts.totalItems += d.requested_qty;
            if (currentStatus === 'approved') counts.approvedCount += 1;
            else if (currentStatus === 'rejected') counts.rejectedCount += 1;
            else counts.pendingCount += 1;
        });
        return counts;
    }, [details, draftDetails]);


    // ตรวจสอบว่าปุ่มอนุมัติ/ปฏิเสธแต่ละรายการควรถูกปิดใช้งานหรือไม่
    const isItemDisabled = (detail) => {
        const currentStatus = draftDetails[detail.request_detail_id]?.status || detail.approval_status;
        // ปิดใช้งานถ้าสถานะคำขอรวมอยู่ใน disabledOverallStatuses
        if (request && disabledOverallStatuses.includes(request.request_status)) return true;
        // ปิดใช้งานถ้าสถานะรายการย่อยไม่ใช่ 'รออนุมัติ' แล้ว
        return currentStatus !== 'waiting_approval_detail';
    };

    // Render Logic
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
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>รูป</th>
                            <th>ชื่อพัสดุ</th>
                            <th>จำนวนที่ขอ</th>
                            <th>หน่วย</th>
                            <th>สถานะ</th>
                            <th>จำนวนที่อนุมัติ</th> {/* เพิ่มคอลัมน์นี้ */}
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentItems.map((d, i) => {
                            const draft = draftDetails[d.request_detail_id];
                            const currentItemStatus = draft?.status || d.approval_status;
                            const statusText = statusMap[currentItemStatus] || currentItemStatus;
                            const isItemDisabledForApproval = isItemDisabled(d); // ตรวจสอบว่าปุ่มอนุมัติ/ปฏิเสธควรถูกปิดใช้งานหรือไม่

                            // จำนวนที่อนุมัติที่แสดงในช่อง input
                            const displayApprovedQty = draft?.approved_qty !== undefined
                                ? draft.approved_qty
                                : d.approved_qty !== undefined
                                    ? d.approved_qty
                                    : d.requested_qty; // ค่าเริ่มต้นคือจำนวนที่ขอ

                            return (
                                <tr key={d.request_detail_id}>
                                    <td data-label="ลำดับ">{indexOfFirstItem + i + 1}</td>
                                    <td data-label="รูป"><ItemImage item_img={d.item_img} alt={d.item_name} /></td>
                                    <td data-label="ชื่อพัสดุ">{d.item_name}</td>
                                    <td data-label="จำนวนที่ขอ">{d.requested_qty}</td>
                                    <td data-label="หน่วย">{d.item_unit}</td>
                                    <td data-label="สถานะ">{statusText}</td>
                                    <td data-label="จำนวนที่อนุมัติ">
                                        {/* ช่องกรอกจำนวนที่อนุมัติ */}
                                        <input
                                            type="number"
                                            value={displayApprovedQty}
                                            onChange={(e) => handleApprovedQtyChange(d.request_detail_id, e.target.value, d.requested_qty)}
                                            min="0"
                                            max={d.requested_qty}
                                            className={styles.approvedQtyInput}
                                            // ปิดใช้งานถ้าสถานะรวมถูกปิด หรือรายการย่อยถูกอนุมัติ/ปฏิเสธไปแล้ว
                                            disabled={isItemDisabledForApproval || currentItemStatus === 'approved' || currentItemStatus === 'rejected'}
                                        />
                                    </td>
                                    <td data-label="จัดการ">
                                        {isItemDisabledForApproval ? (
                                            <>
                                                <button
                                                    disabled
                                                    className={styles.disabledButton}
                                                    title="รายการนี้ได้รับการอนุมัติหรือปฏิเสธแล้ว"
                                                >
                                                    ✅
                                                </button>
                                                <button
                                                    disabled
                                                    className={styles.disabledButton}
                                                    title="รายการนี้ได้รับการอนุมัติหรือปฏิเสธแล้ว"
                                                >
                                                    ❌
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleApproveOne(d)} // ส่ง detail object ไป
                                                    className={styles.activeButton}
                                                    title="อนุมัติรายการนี้"
                                                >
                                                    ✅
                                                </button>
                                                <button
                                                    onClick={() => handleRejectOne(d)} // ส่ง detail object ไป
                                                    className={styles.activeButton}
                                                    title="ปฏิเสธรายการนี้"
                                                >
                                                    ❌
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {/* แถวว่างสำหรับ Pagination */}
                        {Array.from({ length: itemsPerPage - currentItems.length }).map((_, idx) => (
                            <tr key={`empty-${idx}`} className={styles.emptyRow}>
                                <td colSpan="8">&nbsp;</td> {/* ปรับ colSpan ให้ตรงกับจำนวนคอลัมน์ */}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className={styles.actions}>
                    <button
                        className={styles.saveButton}
                        onClick={handleSaveDraft}
                        disabled={Object.keys(draftDetails).length === 0 || (request && disabledOverallStatuses.includes(request.request_status))}
                    >
                        💾 ยืนยันการบันทึก
                    </button>
                    <button
                        className={styles.cancelButton}
                        onClick={() => router.push('/manage/approvalRequest')}
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
