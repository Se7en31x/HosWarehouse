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
    MdMoreVert,
} from 'react-icons/md';

const processingStatusStepsForUI = ['approved_in_queue', 'pending', 'preparing', 'delivering', 'completed'];
const processingStatusStepsForLogic = [
    'approved_in_queue',
    'pending',
    'stock_cut',
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

function StatusTrack({ currentStatus, statusIconMapConfig }) {
    const steps = processingStatusStepsForUI.map(s => ({
        key: s,
        label: translateStatus(s),
        icon: statusIconMapConfig[`${s}Active`] || statusIconMapConfig[s]
    }));
    let currentIndex = -1;
    const currentStatusLogicIndex = processingStatusStepsForLogic.indexOf(currentStatus);
    if (currentStatusLogicIndex !== -1) {
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('approved_in_queue')) {
            currentIndex = processingStatusStepsForUI.indexOf('approved_in_queue');
        }
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('pending')) {
            currentIndex = processingStatusStepsForUI.indexOf('pending');
        }
        if (currentStatusLogicIndex >= processingStatusStepsForLogic.indexOf('stock_cut')) {
            currentIndex = processingStatusStepsForUI.indexOf('preparing');
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

    let donePercentage = 0;
    if (!isOverlayMessageOnlyStatus && !isNoStatusVisual && !isPartiallyProcessedStatus) {
        if (currentIndex !== -1 && steps.length > 1) {
            donePercentage = (currentIndex / (steps.length - 1)) * 100;
        } else if (currentStatus === 'completed') {
            donePercentage = 100;
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
    const donePercentageForTrack = (isOverlayMessageOnlyStatus || isNoStatusVisual || isPartiallyProcessedStatus) ? 0 : donePercentage;
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
    } else if (isPartiallyProcessedStatus) {
        overlayMessage = 'คำขอนี้อยู่ระหว่างการดำเนินการบางส่วน';
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
                const stepCircleClass = `${styles.stepCircle} ${isOverlayMessageOnlyStatus ? styles.noProgressColor :
                    isPartiallyProcessedStatus ? styles.partiallyProgressColor :
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
            {(isOverlayMessageOnlyStatus || isPartiallyProcessedStatus || currentStatus === 'no_approved_for_processing' || currentStatus === 'unknown_processing_state') && (
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

export default function RequestDetailClient() {
    const router = useRouter();
    const { request_id } = useParams();
    const [requestInfo, setRequestInfo] = useState(null);
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingProcessingStatus, setPendingProcessingStatus] = useState({});
    const [isSavingAll, setIsSavingAll] = useState(false);
    const currentUserId = 1;

    // โค้ดที่แก้ไข: ดึงค่าจาก requestInfo โดยตรง ไม่ใช้ useMemo
    const getOverallProcessingStatusForDisplay = requestInfo?.overall_processing_status || 'N/A';


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

            // **โค้ดส่วนนี้ถูกแก้ไขให้ใช้ค่าจากฐานข้อมูลโดยตรงเท่านั้น**
            setRequestInfo({
                ...fetchedRequest,
                overall_processing_status: fetchedRequest.overall_processing_status || null
            });

            setDetails(fetchedDetails);
            const initialPendingStatuses = {};
            fetchedDetails.forEach(detail => {
                initialPendingStatuses[detail.request_detail_id] = detail.processing_status || (detail.approval_status === 'approved' ? 'approved_in_queue' : null);
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

    // **นำฟังก์ชัน handleSaveAllChanges กลับมาแล้ว**
    const handleSaveAllChanges = async () => {
        const changesToSave = Object.keys(pendingProcessingStatus).filter(detailId => {
            const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
            const originalDbStatus = originalDetail?.processing_status || (originalDetail?.approval_status === 'approved' ? 'approved_in_queue' : null);
            const currentPendingStatus = pendingProcessingStatus[detailId];
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
            const oldStatus = originalDetail?.processing_status || (originalDetail?.approval_status === 'approved' ? 'approved_in_queue' : null);
            const newStatus = change.newStatus;
            const effectiveOldStatus = oldStatus;

            const effectiveNewStatus = newStatus || 'approved_in_queue';
            const oldIndex = processingStatusStepsForLogic.indexOf(effectiveOldStatus);
            const newIndex = processingStatusStepsForLogic.indexOf(effectiveNewStatus);

            // 1. ตรวจสอบการย้อนกลับสถานะ
            if (newIndex < oldIndex) {
                return true;
            }

            // 2. ตรวจสอบสถานะ 'completed'
            if (effectiveOldStatus === 'completed' && effectiveNewStatus !== 'completed') {
                return true;
            }

            // 3. ตรวจสอบการข้ามสถานะ (ที่มากกว่า 1 ขั้น)
            if (newIndex > oldIndex + 1) {
                const isApprovedToStockCut = effectiveOldStatus === 'approved_in_queue' && effectiveNewStatus === 'stock_cut';
                const isPendingToPreparing = effectiveOldStatus === 'pending' && effectiveNewStatus === 'preparing';

                if (!isApprovedToStockCut && !isPendingToPreparing) {
                    return true;
                }
            }
            
            // 4. ตรวจสอบเงื่อนไขการเปลี่ยนสถานะที่ไม่สมเหตุสมผลอื่นๆ
            if (effectiveOldStatus === 'stock_cut' && (effectiveNewStatus === 'pending' || effectiveNewStatus === 'approved_in_queue')) {
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
            Swal.fire('การเปลี่ยนสถานะไม่ถูกต้อง', `ไม่สามารถเปลี่ยนสถานะของรายการเหล่านี้ได้เนื่องจากไม่เป็นไปตามลำดับที่กำหนด หรือพยายามย้อนกลับ/ข้ามสถานะ: ${invalidItems}`, 'warning');
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

    const handleSaveOverallStatus = async (newStatus) => {
        if (!newStatus) {
            Swal.fire('ไม่พบการเปลี่ยนแปลง', 'กรุณาเลือกสถานะที่ต้องการบันทึก', 'info');
            return;
        }

        // Removed the code that created changesToSave from all approved details

        const confirmResult = await Swal.fire({
            title: `<span style="font-size:1.1rem">คุณต้องการบันทึกสถานะรวมเป็น <strong>${translateStatus(newStatus)}</strong> หรือไม่?</span>`,
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
            // Updated API call to a new endpoint specifically for overall status
            // or an existing endpoint with a different payload.
            // This is a hypothetical new API call for demonstration.
            await axiosInstance.put(`/requestStatus/${request_id}/overall-processing-status`, {
                newOverallProcessingStatus: newStatus,
                userId: currentUserId,
            });

            Swal.fire({
                icon: 'success',
                title: 'บันทึกสถานะรวมเรียบร้อย',
                timer: 1500,
                showConfirmButton: false,
            });
            fetchRequestDetails();
        } catch (err) {
            console.error('อัปเดตสถานะรวมล้มเหลว:', err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || err.message || 'ไม่สามารถอัปเดตสถานะรวมได้ ลองใหม่อีกครั้ง',
            });
        } finally {
            setIsSavingAll(false);
        }
    };

    const summaryStatusesToDisplay = useMemo(() => {
        return ['approved_in_queue', 'pending', 'preparing', 'delivering', 'completed'];
    }, []);
    const totalRequestedQty = useMemo(() => {
        return details.reduce((sum, d) => sum + d.requested_qty, 0);
    }, [details]);
    const countByStatus = useMemo(() => {
        const counts = {};
        summaryStatusesToDisplay.forEach(status => {
            counts[status] = 0;
        });

        const combinedDetails = details.map(d => ({
            ...d,
            processing_status: pendingProcessingStatus[d.request_detail_id] !== undefined ? pendingProcessingStatus[d.request_detail_id] : (d.approval_status === 'approved' ? 'approved_in_queue' : null)
        }));

        combinedDetails.forEach((d) => {
            if (d.approval_status === 'approved') {
                const statusToCount = d.processing_status || 'approved_in_queue';
                if (summaryStatusesToDisplay.includes(statusToCount)) {
                    counts[statusToCount] = (counts[statusToCount] || 0) + d.requested_qty;
                }
            }
        });
        return counts;
    }, [details, pendingProcessingStatus, summaryStatusesToDisplay]);
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
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerTitle}>
                        <h1 className={styles.heading}>รายละเอียดคำขอ</h1>
                        <span className={styles.requestCode}>#{requestInfo?.request_code ?? request_id}</span>
                    </div>
                </div>
            </div>

            <div className={styles.mainLayoutGrid}>
                {/* Left Column */}
                <div className={styles.leftColumn}>
                    {/* Request Info Card */}
                    <div className={`${styles.card} ${styles.infoCard}`}>
                        <h3 className={styles.cardHeading}>ข้อมูลคำขอ</h3>
                        <div className={styles.infoGrid}>
                            <div className={styles.infoRow}>
                                <MdPersonOutline size={20} className={styles.infoIcon} />
                                <p><strong>ผู้ขอ:</strong> {requestInfo.user_name}</p>
                            </div>
                            <div className={styles.infoRow}>
                                <MdCalendarToday size={20} className={styles.infoIcon} />
                                <p>
                                    <strong>วันที่สร้าง:</strong>{' '}
                                    {new Date(requestInfo.request_date).toLocaleString('th-TH', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}
                                </p>
                            </div>
                            <div className={styles.infoRow}>
                                <MdHistory size={20} className={styles.infoIcon} />
                                <p>
                                    <strong>วันที่อัปเดตล่าสุด:</strong>{' '}
                                    {requestInfo.updated_at ? new Date(requestInfo.updated_at).toLocaleString('th-TH', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    }) : '-'}
                                </p>
                            </div>
                            <div className={styles.infoRow}>
                                <MdInfoOutline size={20} className={styles.infoIcon} />
                                <p>
                                    <strong>สถานะอนุมัติรวม:</strong>{' '}
                                    <span className={`${styles.statusBadgeSmall} ${styles[requestInfo?.request_status] || styles.defaultStatus}`}>
                                        {translateStatus(requestInfo?.request_status || 'N/A')}
                                    </span>
                                </p>
                            </div>
                            <div className={styles.infoRow}>
                                <MdInfoOutline size={20} className={styles.infoIcon} />
                                <p>
                                    <strong>สถานะดำเนินการรวม:</strong>{' '}
                                    <span className={`${styles.statusBadgeSmall} ${styles[requestInfo?.overall_processing_status] || styles.defaultStatus}`}>
                                        {translateStatus(requestInfo?.overall_processing_status || 'N/A')}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Status Summary Card */}
                    <div className={`${styles.card} ${styles.summaryCard}`}>
                        <h3 className={styles.cardHeading}>สรุปจำนวนรวม</h3>
                        <div className={styles.totalQtyDisplay}>
                            <strong>จำนวนรวมทั้งหมด:</strong>{' '}
                            <span className={styles.totalQtyValue}>{totalRequestedQty}</span> ชิ้น
                        </div>
                        <ul className={styles.statusQtyList}>
                            {summaryStatusesToDisplay.map((status) => (
                                <li key={`sum-${status}`} className={styles.statusQtyItem}>
                                    <div className={styles.statusLabelGroup}>
                                        <span className={`${styles.statusBadgeSmall} ${styles[status] || styles.defaultStatus}`}>
                                            {translateStatus(status)}
                                        </span>
                                    </div>
                                    <span className={styles.statusQtyValue}>{countByStatus[status] || 0} ชิ้น</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.rightColumn}>
                    {/* Progress Tracker Section */}
                    <div className={`${styles.card} ${styles.progressCard}`}>
                        <h3 className={styles.cardHeading}>ความคืบหน้าการดำเนินการ</h3>
                        <StatusTrack
                            currentStatus={getOverallProcessingStatusForDisplay}
                            statusIconMapConfig={statusIconMap}
                        />
                    </div>
                    {/* Overall Status Action Card */}
                    <div className={`${styles.card} ${styles.overallStatusActionCard}`}>
                        <h3 className={styles.cardHeading}>อัปเดตสถานะดำเนินการรวม</h3>
                        <div className={styles.overallStatusDropdownGroup}>
                            <select
                                className={styles.overallStatusDropdown}
                                value={requestInfo?.overall_processing_status || ''}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setRequestInfo(prev => ({
                                        ...prev,
                                        overall_processing_status: newStatus || null
                                    }));
                                }}
                                disabled={isOverallRequestProcessingImmutable || isSavingAll}
                            >
                                <option value="">เลือกสถานะ...</option>
                                {processingStatusStepsForUI.map(status => (
                                    <option key={status} value={status}>
                                        {translateStatus(status)}
                                    </option>
                                ))}
                            </select>
                            <button
                                className={styles.saveOverallStatusBtn}
                                onClick={() => handleSaveOverallStatus(requestInfo?.overall_processing_status)}
                                disabled={isSavingAll || isOverallRequestProcessingImmutable || !requestInfo?.overall_processing_status}
                            >
                                บันทึกสถานะรวม
                            </button>
                        </div>
                    </div>
                </div>

                {/* Details Table Section */}
                <div className={`${styles.card} ${styles.detailsTableCard}`}>
                    <h3 className={styles.cardHeading}>รายการสินค้าในคำขอ</h3>
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
                                    <th>วันที่อัปเดตล่าสุด</th>
                                    <th className={styles.statusActionColumn}>อัปเดตสถานะ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {details.map((d, index) => {
                                    const isProcessingSelectDisabled =
                                        d.approval_status !== 'approved' || isSavingAll || d.processing_status === 'completed';

                                    const actualProcessingStatus = pendingProcessingStatus[d.request_detail_id] !== undefined
                                        ? pendingProcessingStatus[d.request_detail_id]
                                        : (d.processing_status || (d.approval_status === 'approved' ? 'approved_in_queue' : null));
                                    const isStatusChanged = pendingProcessingStatus[d.request_detail_id] !== undefined &&
                                        pendingProcessingStatus[d.request_detail_id] !== (d.processing_status || (d.approval_status === 'approved' ? 'approved_in_queue' : null));

                                    const originalDbStatus = d.processing_status || (d.approval_status === 'approved' ? 'approved_in_queue' : null);
                                    const originalDbStatusIndex = processingStatusStepsForLogic.indexOf(originalDbStatus);

                                    return (
                                        <tr key={d.request_detail_id} className={`${isStatusChanged ? styles.pendingChangeRow : ''}`}>
                                            <td data-label="ลำดับ">{index + 1}</td>
                                            <td data-label="ชื่อพัสดุ">{d.item_name}</td>
                                            <td data-label="จำนวน">{d.requested_qty}</td>
                                            <td data-label="หน่วย">{d.item_unit}</td>
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
                                            <td data-label="วันที่อัปเดตล่าสุด">
                                                {d.updated_at ? new Date(d.updated_at).toLocaleString('th-TH', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                }) : '-'}
                                            </td>
                                            <td data-label="อัปเดตสถานะ" className={styles.statusActionColumn}>
                                                <select
                                                    className={styles.statusDropdown}
                                                    value={actualProcessingStatus || ''}
                                                    onChange={(e) => handleDropdownChange(e, d.request_detail_id)}
                                                    disabled={isProcessingSelectDisabled}
                                                >
                                                    <option value="">
                                                        {d.approval_status !== 'approved' ? 'N/A' : 'เลือกสถานะ...'}
                                                    </option>
                                                    {d.approval_status === 'approved' && processingStatusStepsForUI.map(status => {
                                                        const optionStatusIndex = processingStatusStepsForLogic.indexOf(status);
                                                        if (optionStatusIndex >= originalDbStatusIndex) {
                                                            return (
                                                                <option key={status} value={status}>
                                                                    {translateStatus(status)}
                                                                </option>
                                                            );
                                                        }
                                                        return null;
                                                    })}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Action Buttons Section - Moved inside the main grid */}
                <div className={styles.actionButtonContainer}>
                    <button
                        className={styles.backBtn}
                        onClick={() => router.push('/manage/request-status-manager')}
                    >
                        ← กลับหน้ารวม
                    </button>
                    <button
                        className={styles.saveAllBtn}
                        onClick={handleSaveAllChanges}
                        disabled={!hasPendingChanges || isSavingAll || isOverallRequestProcessingImmutable}
                    >
                        {isSavingAll ? 'กำลังบันทึก...' : 'บันทึกรายการที่แก้ไข'}
                    </button>
                </div>
            </div>
        </div>
    );
}