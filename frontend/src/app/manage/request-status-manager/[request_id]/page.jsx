'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import { io } from 'socket.io-client';

import {
    MdOutlineAccessTime,
    MdOutlineBuild,
    MdOutlineLocalShipping,
    MdOutlineCheckCircle,
    MdAccessTimeFilled,
    MdBuildCircle,
    MdLocalShipping,
    MdDoneAll,
    MdInfoOutline,
    MdPersonOutline,
    MdCalendarToday,
    MdHistory,
    MdOutlineInventory,
    MdOutlineAssignmentTurnedIn,
} from 'react-icons/md';

const processingStatusStepsForUI = ['pending', 'preparing', 'delivering', 'completed']; // สถานะที่ผู้ใช้มองเห็นและเปลี่ยนได้
const processingStatusStepsForLogic = [ // สถานะที่ใช้ใน logic ลำดับทั้งหมด
    'approved_in_queue',
    'pending',
    'stock_cut', // ยังคงอยู่ตรงนี้เพราะเป็นลำดับจริง แม้ผู้ใช้จะตั้งค่าเองไม่ได้
    'preparing',
    'delivering',
    'completed'
];
const nonRelevantOverallStatusesForProgress = [
    'rejected_all',
    'rejected_partial',
    'canceled',
];
const immutableDetailProcessingStatuses = ['rejected', 'waiting_approval_detail'];

const statusIconMap = {
    pending: <MdOutlineAccessTime size={24} />,
    pendingActive: <MdAccessTimeFilled size={24} />,
    approved_in_queue: <MdOutlineAssignmentTurnedIn size={24} />,
    approved_in_queueActive: <MdOutlineAssignmentTurnedIn size={24} />,
    preparing: <MdOutlineBuild size={24} />,
    preparingActive: <MdBuildCircle size={24} />,
    delivering: <MdOutlineLocalShipping size={24} />,
    deliveringActive: <MdLocalShipping size={24} />,
    completed: <MdOutlineCheckCircle size={24} />,
    completedActive: <MdDoneAll size={24} />,
    stock_cut: <MdOutlineInventory size={24} />,
    stock_cutActive: <MdOutlineInventory size={24} />,
};

const translateStatus = (status) => {
    const map = {
        approved_all: 'อนุมัติทั้งหมด',
        approved_partial: 'อนุมัติบางส่วน',
        waiting_approval: 'รอการอนุมัติ',
        rejected_all: 'ปฏิเสธทั้งหมด',
        rejected_partial: 'ปฏิเสธบางส่วน',
        approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน',
        canceled: 'ยกเลิกคำขอ',
        approved: 'อนุมัติแล้ว',
        rejected: 'ปฏิเสธแล้ว',
        waiting_approval_detail: 'รออนุมัติ',
        approved_in_queue: 'รอดำเนินการ',
        pending: 'กำลังดำเนินการ',
        stock_cut: 'ตัดสต็อกแล้ว',
        preparing: 'กำลังจัดเตรียมพัสดุ',
        delivering: 'อยู่ระหว่างการนำส่ง',
        completed: 'เสร็จสิ้น',
        partially_processed: 'ดำเนินการบางส่วน',
        no_approved_for_processing: 'ยังไม่มีรายการอนุมัติให้ดำเนินการ',
        unknown_processing_state: 'สถานะดำเนินการไม่ทราบ',
        '': 'ยังไม่ระบุ',
        'N/A': 'N/A',
        null: 'ยังไม่ระบุ',
        unknown_status: 'สถานะไม่ทราบ',
    };
    return map[status] || status;
};

const calculateOverallProcessingStatus = (currentDetails) => {
    const approvedDetails = currentDetails.filter(d => d.approval_status === 'approved');

    if (approvedDetails.length === 0) {
        return 'no_approved_for_processing';
    }

    const statuses = approvedDetails.map(d => d.processing_status || 'approved_in_queue');

    if (statuses.every(s => s === 'completed')) {
        return 'completed';
    }

    let maxStatusIndex = -1;
    let highestStatus = null;
    let hasMixedStates = false;

    for (const status of statuses) {
        const index = processingStatusStepsForLogic.indexOf(status);
        if (index > maxStatusIndex) {
            maxStatusIndex = index;
            highestStatus = status;
        }
    }

    const hasApprovedInQueue = statuses.some(s => s === 'approved_in_queue');
    const hasAnyProgressBeyondQueue = statuses.some(s => processingStatusStepsForLogic.indexOf(s) > processingStatusStepsForLogic.indexOf('approved_in_queue'));

    if (hasApprovedInQueue && hasAnyProgressBeyondQueue) {
        hasMixedStates = true;
    } else if (statuses.some(s => processingStatusStepsForLogic.indexOf(s) < maxStatusIndex)) {
        hasMixedStates = true;
    }

    if (hasMixedStates) {
        return 'partially_processed';
    }

    if (highestStatus) {
        return highestStatus;
    }

    return 'unknown_processing_state';
};

// --- StatusTrack Component (ไม่มีการเปลี่ยนแปลงในคอมโพเนนต์นี้จากการแก้ไขล่าสุด) ---
function StatusTrack({ currentStatus, statusIconMapConfig }) {
    // ใช้ processingStatusStepsForUI สำหรับการแสดงผล Track
    const steps = processingStatusStepsForUI.map(s => ({
        key: s,
        label: translateStatus(s),
        icon: statusIconMapConfig[`${s}Active`] || statusIconMapConfig[s]
    }));

    let currentIndex = -1;
    // ปรับ Logic การหา currentIndex ให้สอดคล้องกับ processingStatusStepsForLogic
    // แต่ map ไปยัง processingStatusStepsForUI
    const currentStatusLogicIndex = processingStatusStepsForLogic.indexOf(currentStatus);

    if (currentStatusLogicIndex !== -1) {
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('pending')) {
            currentIndex = processingStatusStepsForUI.indexOf('pending');
        }
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('stock_cut')) {
            currentIndex = processingStatusStepsForUI.indexOf('preparing'); // stock_cut หรือ preparing จะแสดงที่ preparing ใน UI
        }
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('preparing')) {
             currentIndex = processingStatusStepsForUI.indexOf('preparing');
        }
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('delivering')) {
            currentIndex = processingStatusStepsForUI.indexOf('delivering');
        }
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('completed')) {
            currentIndex = processingStatusStepsForUI.indexOf('completed');
        }
    }


    const isOverallCompleted = currentStatus === 'completed';
    const isOverlayMessageOnlyStatus = nonRelevantOverallStatusesForProgress.includes(currentStatus);
    const isPartiallyProcessedStatus = currentStatus === 'partially_processed';
    const isNoStatusVisual = ['N/A', 'no_approved_for_processing', 'unknown_processing_state', null, ''].includes(currentStatus);


    let donePercentage = '0%';
    if (!isOverlayMessageOnlyStatus && !isNoStatusVisual) {
        if (currentIndex !== -1 && steps.length > 1) {
            donePercentage = `${(currentIndex / (steps.length - 1)) * 100}%`;
        } else if (currentStatus === 'completed') {
            donePercentage = '100%';
        }
    }

    const trackerClass = isOverallCompleted
        ? styles.trackerCompleted
        : isOverlayMessageOnlyStatus
            ? styles.nonTrackableVisual
            : isPartiallyProcessedStatus
                ? styles.partiallyProcessedVisual
                : isNoStatusVisual
                    ? styles.noStatusVisual : '';

    const donePercentageForTrack = (isOverlayMessageOnlyStatus || isNoStatusVisual) ? '0%' : donePercentage;

    let overlayMessage = '';
    if (isOverlayMessageOnlyStatus) {
        if (currentStatus === 'rejected_all' || currentStatus === 'rejected_partial' || currentStatus === 'canceled') {
            overlayMessage = 'คำขอนี้ถูกยกเลิก/ปฏิเสธแล้ว ไม่เกี่ยวข้องกับการติดตามความคืบหน้าการดำเนินการ';
        } else {
            overlayMessage = 'สถานะคำขอนี้ไม่เกี่ยวข้องกับการติดตามความคืบหน้าการดำเนินการ';
        }
    } else if (currentStatus === 'no_approved_for_processing') {
        overlayMessage = 'ยังไม่มีรายการอนุมัติให้ดำเนินการ';
    } else if (currentStatus === 'unknown_processing_state') {
        overlayMessage = 'สถานะดำเนินการไม่ทราบ';
    }


    return (
        <div
            className={`${styles.progressTracker} ${trackerClass}`}
            style={{ '--done-percentage': donePercentageForTrack }}
        >
            <div className={styles.lineBackground}></div>
            <div className={styles.lineProgress}></div>

            {steps.map((step, index) => {
                const isActive = (index === currentIndex && !isOverlayMessageOnlyStatus && !isPartiallyProcessedStatus && !isNoStatusVisual);
                const isDone = (index < currentIndex && !isOverlayMessageOnlyStatus && !isPartiallyProcessedStatus && !isNoStatusVisual);

                const stepCircleClass = `${styles.stepCircle} ${
                    isOverlayMessageOnlyStatus ? styles.noProgressColor :
                    isNoStatusVisual ? styles.noProgressColor :
                    isDone ? styles.done :
                    isActive ? styles.active : ''
                }`;

                const iconToDisplay = isDone
                    ? (statusIconMapConfig?.[`${step.key}Active`] || statusIconMapConfig[step.key])
                    : isActive
                        ? (statusIconMapConfig?.[`${step.key}Active`] || statusIconMapConfig[step.key])
                        : (statusIconMapConfig?.[step.key] || statusIconMapConfig[step.key]);

                return (
                    <div key={step.key} className={styles.stepContainer}>
                        <div className={stepCircleClass}>
                            <div className={styles.icon}>{iconToDisplay}</div>
                        </div>
                        <div className={`${styles.stepLabel} ${isActive ? styles.labelActive : ''}`}>
                            {step.label}
                        </div>
                    </div>
                );
            })}

            {(isOverlayMessageOnlyStatus || currentStatus === 'no_approved_for_processing' || currentStatus === 'unknown_processing_state') && (
                <div className={styles.overlayNonTrackable}>
                    <p className={styles.nonTrackableMessage}>
                        สถานะรวมของคำขอนี้คือ:{' '}
                        <span className={`${styles.statusBadgeSmall} ${styles[currentStatus] || styles.defaultStatus}`}>
                            {translateStatus(currentStatus)}
                        </span>
                        <br />
                        {overlayMessage}
                    </p>
                </div>
            )}
        </div>
    );
}

// --- Main Component ---
export default function RequestDetailClient() {
    const router = useRouter();
    const { request_id } = useParams();

    const [requestInfo, setRequestInfo] = useState(null);
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingProcessingStatus, setPendingProcessingStatus] = useState({});
    const [isSavingAll, setIsSavingAll] = useState(false);

    const currentUserId = 1;

    const getOverallProcessingStatus = useMemo(() => {
        if (!requestInfo) return 'N/A';

        if (nonRelevantOverallStatusesForProgress.includes(requestInfo.request_status)) {
            return requestInfo.request_status;
        }

        const combinedDetails = details.map(d => ({
            ...d,
            processing_status: pendingProcessingStatus[d.request_detail_id] !== undefined
                ? pendingProcessingStatus[d.request_detail_id]
                : (d.processing_status || (d.approval_status === 'approved' ? 'approved_in_queue' : null))
        }));

        const calculatedProcessingStatus = calculateOverallProcessingStatus(combinedDetails);

        console.log('Calculated Overall Processing Status (Live):', calculatedProcessingStatus);
        return calculatedProcessingStatus;
    }, [requestInfo, details, pendingProcessingStatus]);

    useEffect(() => {
        if (!request_id) {
            router.replace('/manage/request-status-manager');
            return;
        }
        fetchRequestDetails();

        const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000');
        socket.on('connect', () => {
            console.log('Connected to Socket.IO server');
        });

        socket.on('requestUpdated', (data) => {
            console.log('Received requestUpdated event:', data);
            if (parseInt(data.request_id, 10) === parseInt(request_id, 10)) {
                console.log('Refetching details for current request due to Socket.IO update.');
                fetchRequestDetails();
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from Socket.IO server');
        });

        return () => {
            socket.disconnect();
        };
    }, [request_id, router]);

    const fetchRequestDetails = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/requestStatus/${request_id}`, {
                params: { t: Date.now() },
            });

            const fetchedRequest = res.data.request || null;
            const fetchedDetails = Array.isArray(res.data.details) ? res.data.details : [];

            setRequestInfo({
                ...fetchedRequest,
                overall_processing_status: fetchedRequest.overall_processing_status || null
            });
            setDetails(fetchedDetails);

            const initialPendingStatuses = {};
            fetchedDetails.forEach(detail => {
                if (detail.approval_status === 'approved') {
                    // หาก approved และไม่มี processing_status ให้เป็น approved_in_queue
                    initialPendingStatuses[detail.request_detail_id] = detail.processing_status || 'approved_in_queue';
                } else {
                    // หากไม่อนุมัติ ไม่ต้องมีสถานะดำเนินการ
                    initialPendingStatuses[detail.request_detail_id] = null; // หรือ detail.processing_status หากมีค่าที่ไม่ใช่ approved
                }
            });
            setPendingProcessingStatus(initialPendingStatuses);

        } catch (err) {
            console.error('โหลดข้อมูลล้มเหลว', err);
            Swal.fire('ผิดพลาด', 'โหลดข้อมูลไม่สำเร็จ', 'error');
            setDetails([]);
            setRequestInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDropdownChange = (e, requestDetailId) => {
        const newValue = e.target.value === "" ? null : e.target.value;
        setPendingProcessingStatus(prev => ({
            ...prev,
            [requestDetailId]: newValue
        }));
    };

    const handleSaveAllChanges = async () => {
        const changesToSave = Object.keys(pendingProcessingStatus).filter(detailId => {
            const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
            // Original status จาก DB, ถ้าเป็น approved และยังไม่มีสถานะ ให้ถือเป็น approved_in_queue
            const originalDbStatus = originalDetail?.processing_status || (originalDetail?.approval_status === 'approved' ? 'approved_in_queue' : null);
            const currentPendingStatus = pendingProcessingStatus[detailId];

            // เปรียบเทียบกับ originalDbStatus ที่ถูก normalize แล้ว
            return currentPendingStatus !== originalDbStatus;
        }).map(detailId => {
            const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
            const newStatusValue = pendingProcessingStatus[detailId];

            return {
                request_detail_id: parseInt(detailId, 10),
                newStatus: newStatusValue,
                current_approval_status: originalDetail?.approval_status,
            };
        }).filter(Boolean);

        if (changesToSave.length === 0) {
            Swal.fire('ไม่พบการเปลี่ยนแปลง', 'ไม่มีรายการใดที่ถูกเลือกเพื่อบันทึก', 'info');
            return;
        }

        if (nonRelevantOverallStatusesForProgress.includes(requestInfo?.request_status)) {
            Swal.fire('ไม่สามารถแก้ไขได้', 'คำขอนี้อยู่ในสถานะรวมที่ไม่สามารถเปลี่ยนแปลงสถานะการดำเนินการได้', 'warning');
            return;
        }

        const invalidApprovalStatusChanges = changesToSave.filter(change => {
            const currentDetail = details.find(d => d.request_detail_id === change.request_detail_id);
            // รายการที่ไม่อนุมัติ ไม่สามารถเปลี่ยนสถานะดำเนินการได้
            return currentDetail && currentDetail.approval_status !== 'approved';
        });

        if (invalidApprovalStatusChanges.length > 0) {
            const invalidItems = invalidApprovalStatusChanges.map(item => {
                const detail = details.find(d => d.request_detail_id === item.request_detail_id);
                return detail ? `"${detail.item_name}" (สถานะอนุมัติ: ${translateStatus(detail.approval_status)})` : `รายการ ID: ${item.request_detail_id}`;
            }).join(', ');
            Swal.fire('ไม่สามารถบันทึกบางรายการได้', `รายการเหล่านี้ไม่สามารถเปลี่ยนแปลงสถานะการดำเนินการได้: ${invalidItems} (เนื่องจากยังไม่ได้รับการอนุมัติ หรือถูกปฏิเสธแล้ว)`, 'warning');
            return;
        }

        const invalidSequenceChanges = changesToSave.filter(change => {
            const originalDetail = details.find(d => d.request_detail_id === change.request_detail_id);
            // สถานะเก่าจาก DB (ถ้าเป็น approved และยังไม่มีสถานะ ให้ถือเป็น approved_in_queue)
            const oldStatus = originalDetail?.processing_status || (originalDetail?.approval_status === 'approved' ? 'approved_in_queue' : null);
            const newStatus = change.newStatus;

            const effectiveOldStatus = oldStatus;
            const effectiveNewStatus = newStatus || 'approved_in_queue'; // หาก newStatus เป็น null/"" ให้ถือเป็น approved_in_queue

            const oldIndex = processingStatusStepsForLogic.indexOf(effectiveOldStatus);
            const newIndex = processingStatusStepsForLogic.indexOf(effectiveNewStatus);

            if (oldIndex === -1 || newIndex === -1) {
                console.warn(`Unknown status encountered during sequence check: Old: ${effectiveOldStatus}, New: ${effectiveNewStatus} for detail ID: ${change.request_detail_id}`);
                return true; // ถือว่าไม่ถูกต้องถ้าสถานะไม่เป็นที่รู้จัก
            }

            // 1. ห้ามย้อนกลับสถานะ (Backward Transition)
            if (newIndex < oldIndex) {
                return true;
            }

            // 2. สถานะ completed เป็น Final State
            if (effectiveOldStatus === 'completed' && effectiveNewStatus !== 'completed') {
                return true;
            }

            // 3. ห้ามข้ามขั้นตอน (Skipping Steps) มากกว่า 1 ขั้น
            //    ข้อยกเว้น: approved_in_queue สามารถข้ามไปยัง pending ได้โดยตรง (ซึ่งคือ newIndex = oldIndex + 1)
            //    ดังนั้น เงื่อนไขนี้จะจับเฉพาะการข้ามที่ **มากกว่า 1 ขั้น** เท่านั้น
            if (newIndex > oldIndex + 1) {
                return true; // ไม่ว่าจะเป็นสถานะอะไรก็ตาม ถ้าข้ามเกิน 1 ขั้น ถือว่าผิด (เพราะข้อยกเว้น approved_in_queue -> pending คือ 1 ขั้นพอดี)
            }

            // 4. ห้ามเฉพาะเจาะจง: pending ห้ามข้ามไปยัง preparing โดยตรง (ต้องผ่าน stock_cut ก่อน).
            //    ซึ่งหมายความว่า pending สามารถไป stock_cut ได้เท่านั้น
            if (effectiveOldStatus === 'pending' && effectiveNewStatus === 'preparing') {
                return true;
            }

            // 5. **NEW:** ห้ามเปลี่ยนสถานะไปเป็น 'stock_cut' จาก Dropdown (ต้องมาจากหน้าตัดสต็อกเท่านั้น)
            //    ยกเว้นว่าสถานะเดิมมันเป็น 'stock_cut' อยู่แล้ว
            if (effectiveNewStatus === 'stock_cut' && effectiveOldStatus !== 'stock_cut') {
                 return true;
            }
            // 6. **NEW:** ห้ามเปลี่ยนจาก 'stock_cut' ไป 'pending' หรือ 'approved_in_queue'
            //    (เพราะ 'stock_cut' ต้องไป 'preparing' เท่านั้น หรือ 'delivering' หรือ 'completed')
            if (effectiveOldStatus === 'stock_cut' && (effectiveNewStatus === 'pending' || effectiveNewStatus === 'approved_in_queue')) {
                return true;
            }
            // 7. **NEW:** 'approved_in_queue' ต้องไป 'pending' เท่านั้น (ถ้าไม่เป็น 'pending')
            //    และห้ามไป 'preparing' โดยตรง
            if (effectiveOldStatus === 'approved_in_queue' && effectiveNewStatus === 'preparing') {
                return true;
            }

            return false;
        });

        if (invalidSequenceChanges.length > 0) {
            const invalidItems = invalidSequenceChanges.map(item => {
                const detail = details.find(d => d.request_detail_id === item.request_detail_id);
                const originalDetail = details.find(d => d.request_detail_id === item.request_detail_id);
                const oldStatusDisplay = translateStatus(originalDetail?.processing_status || (originalDetail?.approval_status === 'approved' ? 'approved_in_queue' : null));
                const newStatusDisplay = translateStatus(item.newStatus || null);
                return `"${detail.item_name}" (จาก: ${oldStatusDisplay} ไป: ${newStatusDisplay})`;
            }).join(', ');
            Swal.fire('การเปลี่ยนสถานะไม่ถูกต้อง', `ไม่สามารถเปลี่ยนสถานะของรายการเหล่านี้ได้เนื่องจากไม่เป็นไปตามลำดับที่กำหนด หรือพยายามย้อนกลับ/ข้ามสถานะ (เช่น ต้องผ่านการตัดสต็อก): ${invalidItems}`, 'warning');
            return;
        }

        const confirmResult = await Swal.fire({
            title: `<span style="font-size:1.1rem">คุณต้องการบันทึกการเปลี่ยนแปลงสถานะการดำเนินการทั้งหมด <strong>${changesToSave.length}</strong> รายการหรือไม่?</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<span style="min-width: 120px; display: inline-block;">✅ ใช่, บันทึก</span>',
            cancelButtonText: '<span style="min-width: 120px; display: inline-block;">❌ ยกเลิก</span>',
            customClass: {
                popup: 'swal2-custom-popup',
                confirmButton: 'swal2-custom-btn',
                cancelButton: 'swal2-custom-btn',
            },
            reverseButtons: true,
        });

        if (!confirmResult.isConfirmed) return;

        setIsSavingAll(true);
        try {
            await axiosInstance.put(`/requestStatus/${request_id}/processing-status-batch`, {
                updates: changesToSave,
                userId: currentUserId,
            });

            Swal.fire({
                icon: 'success',
                title: 'บันทึกสถานะการดำเนินการทั้งหมดเรียบร้อย',
                timer: 1500,
                showConfirmButton: false,
            });

            fetchRequestDetails();

        } catch (err) {
            console.error('อัปเดตสถานะการดำเนินการล้มเหลว:', err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || err.message || 'ไม่สามารถอัปเดตสถานะการดำเนินการได้ ลองใหม่อีกครั้ง',
            });
        } finally {
            setIsSavingAll(false);
        }
    };

    const totalRequestedQty = useMemo(() => {
        return details.reduce((sum, d) => sum + d.requested_qty, 0);
    }, [details]);

    const countByStatus = useMemo(() => {
        const counts = {};
        const combinedDetails = details.map(d => ({
            ...d,
            processing_status: pendingProcessingStatus[d.request_detail_id] !== undefined ? pendingProcessingStatus[d.request_detail_id] : (d.approval_status === 'approved' ? 'approved_in_queue' : null)
        }));

        combinedDetails.forEach((d) => {
            if (d.approval_status === 'rejected') {
                counts['rejected'] = (counts['rejected'] || 0) + d.requested_qty;
            } else if (d.approval_status === 'waiting_approval_detail') {
                counts['waiting_approval_detail'] = (counts['waiting_approval_detail'] || 0) + d.requested_qty;
            }
            else if (d.approval_status === 'approved') {
                const statusToCount = d.processing_status;
                if (processingStatusStepsForLogic.includes(statusToCount)) {
                    counts[statusToCount] = (counts[statusToCount] || 0) + d.requested_qty;
                } else {
                    // หากยังไม่มีการดำเนินการ (สถานะเริ่มต้นสำหรับ approved)
                    // หรือไม่ทราบสถานะ ควรนับเป็น approved_in_queue
                    if (!statusToCount || statusToCount === null || statusToCount === undefined) {
                         counts['approved_in_queue'] = (counts['approved_in_queue'] || 0) + d.requested_qty;
                    } else {
                        counts['unknown_processing_state'] = (counts['unknown_processing_state'] || 0) + d.requested_qty;
                    }
                }
            }
        });
        return counts;
    }, [details, pendingProcessingStatus]);

    const hasPendingChanges = useMemo(() => {
        return Object.keys(pendingProcessingStatus).some(detailId => {
            const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
            const originalDbStatus = originalDetail?.processing_status || (originalDetail?.approval_status === 'approved' ? 'approved_in_queue' : null);
            const currentPendingStatus = pendingProcessingStatus[detailId];

            return currentPendingStatus !== originalDbStatus;
        });
    }, [pendingProcessingStatus, details]);

    if (loading)
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loading}>กำลังโหลดข้อมูล...</p>
            </div>
        );

    if (!requestInfo && !loading) {
        return (
            <div className={styles.container}>
                <h2 className={styles.heading}>รายละเอียดคำขอ #{request_id}</h2>
                <p className={styles.noData}>
                    ไม่พบรายละเอียดสำหรับคำขอ #{request_id} หรือคำขอนี้ไม่มีอยู่จริง
                </p>
                <button className={styles.backBtn} onClick={() => router.push('/manage/request-status-manager')}>
                    ← กลับหน้ารวม
                </button>
            </div>
        );
    }

    const isOverallRequestProcessingImmutable = nonRelevantOverallStatusesForProgress.includes(requestInfo?.request_status);

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>
                รายละเอียดคำขอ #{requestInfo?.request_code ?? request_id}
            </h2>

            <div className={styles.topSummarySection}>
                {requestInfo && (
                    <div className={styles.requestSummaryCard}>
                        <div className={styles.summaryItem}>
                            <MdPersonOutline size={20} className={styles.summaryIcon} />
                            <p><strong>ผู้ขอ:</strong> {requestInfo.user_name}</p>
                        </div>
                        <div className={styles.summaryItem}>
                            <MdCalendarToday size={20} className={styles.summaryIcon} />
                            <p>
                                <strong>วันที่สร้าง:</strong>{' '}
                                {new Date(requestInfo.request_date).toLocaleString('th-TH', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </p>
                        </div>
                        <div className={styles.summaryItem}>
                            <MdHistory size={20} className={styles.summaryIcon} />
                            <p>
                                <strong>วันที่อัปเดตล่าสุด:</strong>{' '}
                                {requestInfo.updated_at ? new Date(requestInfo.updated_at).toLocaleString('th-TH', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                }) : '-'}
                            </p>
                        </div>
                        <div className={styles.summaryItem}>
                            <MdInfoOutline size={20} className={styles.summaryIcon} />
                            <p>
                                <strong>สถานะอนุมัติรวม:</strong>{' '}
                                <span className={`${styles.statusBadgeSmall} ${styles[requestInfo?.request_status] || styles.defaultStatus}`}>
                                    {translateStatus(requestInfo?.request_status || 'N/A')}
                                </span>
                            </p>
                        </div>
                        <div className={styles.summaryItem}>
                            <MdInfoOutline size={20} className={styles.summaryIcon} />
                            <p>
                                <strong>สถานะดำเนินการรวม:</strong>{' '}
                                <span className={`${styles.statusBadgeSmall} ${styles[getOverallProcessingStatus] || styles.defaultStatus}`}>
                                    {translateStatus(getOverallProcessingStatus || 'N/A')}
                                </span>
                            </p>
                        </div>
                    </div>
                )}

                <div className={styles.summaryTotalsCard}>
                    <h3 className={styles.summaryTotalsHeading}>สรุปจำนวนรวม</h3>
                    <div className={styles.totalQtyDisplay}>
                        <p>
                            <strong>จำนวนรวมทั้งหมด:</strong>{' '}
                            <span className={styles.totalQtyValue}>{totalRequestedQty}</span> ชิ้น
                        </p>
                    </div>
                    <ul className={styles.statusQtyList}>
                        {Object.entries(countByStatus).map(([status, qty]) => (
                            <li key={`sum-${status}`} className={styles.statusQtyItem}>
                                <span className={`${styles.statusBadgeSmall} ${styles[status] || styles.defaultStatus}`}>
                                    {translateStatus(status)}
                                </span>
                                <span className={styles.statusQtyValue}>{qty} ชิ้น</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <StatusTrack
                currentStatus={getOverallProcessingStatus}
                statusIconMapConfig={statusIconMap}
            />

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>ลำดับ</th>
                            <th>ชื่อพัสดุ</th>
                            <th>จำนวน</th>
                            <th>หน่วย</th>
                            <th>สถานะการอนุมัติ</th>
                            <th>สถานะการดำเนินการ</th>
                            <th>หมายเหตุ</th>
                            <th>วันที่อัปเดตล่าสุด</th>
                            <th>อัปเดตสถานะการดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((d, index) => {
                            const isProcessingSelectDisabled =
                                // ปิดใช้งานถ้า approval_status ไม่ใช่ 'approved'
                                d.approval_status !== 'approved' ||
                                // ปิดใช้งานระหว่างกำลังบันทึก
                                isSavingAll ||
                                // ปิดใช้งานถ้าสถานะการดำเนินการปัจจุบันเป็น 'completed'
                                pendingProcessingStatus[d.request_detail_id] === 'completed' ||
                                d.processing_status === 'completed';


                            // สถานะที่แสดงใน Dropdown
                            const actualProcessingStatus = pendingProcessingStatus[d.request_detail_id] !== undefined
                                ? pendingProcessingStatus[d.request_detail_id]
                                : (d.processing_status || (d.approval_status === 'approved' ? 'approved_in_queue' : null));

                            const dropdownOptions = (() => {
                                const options = [];
                                const allowedOptionsSet = new Set(); // ใช้ Set เพื่อป้องกันค่าซ้ำ

                                // เพิ่มสถานะปัจจุบันเข้าไปใน Set เสมอ
                                if (actualProcessingStatus) {
                                    allowedOptionsSet.add(actualProcessingStatus);
                                } else {
                                    // ถ้าไม่มีสถานะปัจจุบัน (เช่น รายการไม่อนุมัติ)
                                    // ให้เพิ่มค่าว่างเข้าไปเพื่อเป็นตัวเลือก "N/A" หรือ "เลือกสถานะ..."
                                    allowedOptionsSet.add('');
                                }


                                if (!isProcessingSelectDisabled) {
                                    const currentStatusIndex = processingStatusStepsForLogic.indexOf(actualProcessingStatus);

                                    if (currentStatusIndex !== -1) {
                                        const nextPossibleIndex = currentStatusIndex + 1;

                                        if (nextPossibleIndex < processingStatusStepsForLogic.length) {
                                            const nextStatus = processingStatusStepsForLogic[nextPossibleIndex];

                                            // กฎการอนุญาตใน Dropdown:
                                            // 1. ถ้าสถานะปัจจุบันคือ 'approved_in_queue' ต้องไป 'pending' เท่านั้น
                                            if (actualProcessingStatus === 'approved_in_queue' && nextStatus === 'pending') {
                                                allowedOptionsSet.add(nextStatus);
                                            }
                                            // 2. ถ้าสถานะปัจจุบันคือ 'pending' จะไม่มีตัวเลือกถัดไปให้ผู้ใช้เลือก
                                            //    เพราะต้องรอ stock_cut จากหน้าตัดสต็อก
                                            else if (actualProcessingStatus === 'pending') {
                                                // ไม่มีการเพิ่มสถานะใดๆ
                                            }
                                            // 3. ถ้าสถานะปัจจุบันคือ 'stock_cut' ต้องไป 'preparing'
                                            else if (actualProcessingStatus === 'stock_cut' && nextStatus === 'preparing') {
                                                allowedOptionsSet.add(nextStatus);
                                            }
                                            // 4. สถานะอื่นๆ ที่เป็นไปตามลำดับถัดไป 1 ขั้น
                                            //    และต้องไม่ใช่ 'stock_cut' ที่มาจากการเลือกใน Dropdown นี้
                                            else if (actualProcessingStatus !== 'approved_in_queue' && actualProcessingStatus !== 'pending' && actualProcessingStatus !== 'stock_cut' && nextStatus !== 'stock_cut') {
                                                 allowedOptionsSet.add(nextStatus);
                                            }
                                        }
                                    }
                                }

                                // แปลง Set เป็น Array ของ options
                                let finalOptions = Array.from(allowedOptionsSet).map(statusValue => ({
                                    value: statusValue,
                                    label: translateStatus(statusValue)
                                }));

                                // จัดเรียงตาม processingStatusStepsForLogic เพื่อให้ลำดับถูกต้องใน dropdown
                                finalOptions.sort((a, b) => {
                                    // กำหนดลำดับพิเศษสำหรับค่าว่าง/null ให้อยู่ด้านบนสุด
                                    if (a.value === '') return -1;
                                    if (b.value === '') return 1;
                                    return processingStatusStepsForLogic.indexOf(a.value) - processingStatusStepsForLogic.indexOf(b.value);
                                });

                                // ตรวจสอบและเพิ่ม option สำหรับค่าว่าง/N/A ที่ด้านบนสุด
                                const hasEmptyOption = finalOptions.some(opt => opt.value === '');
                                if (!hasEmptyOption) {
                                    if (!actualProcessingStatus) { // ถ้าไม่มีสถานะปัจจุบัน (เช่น รายการไม่อนุมัติ)
                                        finalOptions.unshift({ value: "", label: "N/A", disabled: true });
                                    } else {
                                        finalOptions.unshift({ value: "", label: "เลือกสถานะ...", disabled: true });
                                    }
                                }


                                return finalOptions;
                            })();

                            const rowClass = d.approval_status === 'approved'
                                ? styles.approvedRow
                                : d.approval_status === 'rejected'
                                    ? styles.rejectedRow
                                    : d.approval_status === 'waiting_approval_detail'
                                        ? styles.waitingApprovalRow
                                        : '';

                            return (
                                <tr key={d.request_detail_id} className={rowClass}>
                                    <td data-label="ลำดับ">{index + 1}</td>
                                    <td data-label="ชื่อพัสดุ">{d.item_name}</td>
                                    <td data-label="จำนวน">{d.requested_qty}</td>
                                    <td data-label="หน่วย">{d.unit_name}</td>
                                    <td data-label="สถานะการอนุมัติ">
                                        <span className={`${styles.statusBadgeSmall} ${styles[d.approval_status] || styles.defaultStatus}`}>
                                            {translateStatus(d.approval_status)}
                                        </span>
                                    </td>
                                    <td data-label="สถานะการดำเนินการ">
                                        <span className={`${styles.statusBadgeSmall} ${styles[actualProcessingStatus] || styles.defaultStatus}`}>
                                            {translateStatus(actualProcessingStatus)}
                                        </span>
                                    </td>
                                    <td data-label="หมายเหตุ">{d.note || '-'}</td>
                                    <td data-label="วันที่อัปเดตล่าสุด">
                                        {/* **แก้ไขตรงนี้**: ตรวจสอบว่า `d.updated_at_detail` มีค่าหรือไม่ */}
                                        {d.updated_at
                                            ? new Date(d.updated_at).toLocaleString('th-TH', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })
                                            : '-'}
                                    </td>
                                    <td data-label="อัปเดตสถานะการดำเนินการ">
                                        <select
                                            className={styles.statusDropdown}
                                            value={actualProcessingStatus || ''}
                                            onChange={(e) => handleDropdownChange(e, d.request_detail_id)}
                                            disabled={isProcessingSelectDisabled}
                                        >
                                            {dropdownOptions.map(option => (
                                                <option
                                                    key={option.value === '' ? 'empty-option' : option.value} // ใช้ key ที่ไม่ซ้ำกันสำหรับค่าว่าง
                                                    value={option.value}
                                                    disabled={option.disabled}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className={styles.actionButtons}>
                <button className={styles.backBtn} onClick={() => router.push('/manage/request-status-manager')}>
                    ← กลับหน้ารวม
                </button>
                <button
                    className={styles.saveAllBtn}
                    onClick={handleSaveAllChanges}
                    disabled={!hasPendingChanges || isSavingAll || isOverallRequestProcessingImmutable}
                >
                    {isSavingAll ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}
                </button>
            </div>
        </div>
    );
}