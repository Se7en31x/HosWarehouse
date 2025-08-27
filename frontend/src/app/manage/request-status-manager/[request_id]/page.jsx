'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import styles from './page.module.css';
import { io } from 'socket.io-client';
import {
    MdInfoOutline,
    MdPersonOutline,
    MdCalendarToday,
    MdHistory,
} from 'react-icons/md';

const MySwal = withReactContent(Swal);

const processingStatusStepsForLogic = [
    'approved_in_queue',
    'pending',
    'preparing',
    'delivering',
    'completed'
];

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
        preparing: 'กำลังจัดเตรียมพัสดุ',
        delivering: 'อยู่ระหว่างการนำส่ง',
        completed: 'เสร็จสิ้น',
        partially_processed: 'ดำเนินการบางส่วน',
        no_approved_for_processing: 'ยังไม่มีรายการอนุมัติให้ดำเนินการ',
        unknown_processing_state: 'สถานะดำเนินการไม่ทราบ',
        '': 'ยังไม่ระบุ',
        'N/A': 'ยังไม่ระบุ',
        null: 'ยังไม่ระบุ',
        unknown_status: 'สถานะไม่ทราบ',
    };
    return map[status] || 'สถานะไม่ทราบ';
};

export default function RequestDetailClient() {
    const router = useRouter();
    const { request_id } = useParams();
    const [requestInfo, setRequestInfo] = useState(null);
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingProcessingStatus, setPendingProcessingStatus] = useState({});
    const [isSavingAll, setIsSavingAll] = useState(false);
    const currentUserId = 1;

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
                initialPendingStatuses[detail.request_detail_id] = detail.processing_status || (detail.approval_status === 'approved' ? 'approved_in_queue' : null);
            });
            setPendingProcessingStatus(initialPendingStatuses);
        } catch (err) {
            console.error('โหลดข้อมูลล้มเหลว', err);
            Swal.fire({
                icon: 'error',
                title: 'ผิดพลาด',
                text: 'โหลดข้อมูลไม่สำเร็จ',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: styles.swalPopup,
                    confirmButton: styles.swalButton,
                },
            });
            setDetails([]);
            setRequestInfo(null);
        } finally {
            setLoading(false);
        }
    };

    const showStockDeductionAlert = () => {
        MySwal.fire({
            icon: 'info',
            title: 'ไม่สามารถเปลี่ยนสถานะได้',
            text: 'กรุณาทำการตัดสต็อกก่อนจึงจะเปลี่ยนเป็นสถานะนี้ได้',
            confirmButtonText: 'รับทราบ',
            customClass: {
                popup: styles.swalPopup,
                confirmButton: styles.swalButton,
            },
        });
    };

    const handleDropdownChange = (e, requestDetailId) => {
        const newValue = e.target.value === "" ? null : e.target.value;
        const currentDetail = details.find(d => d.request_detail_id === requestDetailId);
        const currentStatus = currentDetail?.processing_status || (currentDetail?.approval_status === 'approved' ? 'approved_in_queue' : null);

        if (currentStatus === 'pending' && newValue === 'preparing') {
            showStockDeductionAlert();
            return;
        }

        setPendingProcessingStatus(prev => ({
            ...prev,
            [requestDetailId]: newValue
        }));
    };

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
            Swal.fire({
                icon: 'info',
                title: 'ไม่พบการเปลี่ยนแปลง',
                text: 'ไม่มีรายการใดที่ถูกเลือกเพื่อบันทึก',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: styles.swalPopup,
                    confirmButton: styles.swalButton,
                },
            });
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
            Swal.fire({
                icon: 'warning',
                title: 'ไม่สามารถบันทึกบางรายการได้',
                text: `รายการเหล่านี้ไม่สามารถเปลี่ยนแปลงสถานะการดำเนินการได้: ${invalidItems} (เนื่องจากยังไม่ได้รับการอนุมัติ หรือถูกปฏิเสธแล้ว)`,
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: styles.swalPopup,
                    confirmButton: styles.swalButton,
                },
            });
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

            if (newIndex < oldIndex) {
                return true;
            }
            if (effectiveOldStatus === 'completed' && effectiveNewStatus !== 'completed') {
                return true;
            }
            if (newIndex > oldIndex + 1) {
                const isPendingToPreparing = effectiveOldStatus === 'pending' && effectiveNewStatus === 'preparing';
                if (!isPendingToPreparing) {
                    return true;
                }
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
            Swal.fire({
                icon: 'warning',
                title: 'การเปลี่ยนสถานะไม่ถูกต้อง',
                text: `ไม่สามารถเปลี่ยนสถานะของรายการเหล่านี้ได้เนื่องจากไม่เป็นไปตามลำดับที่กำหนด หรือพยายามย้อนกลับ/ข้ามสถานะ: ${invalidItems}`,
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: styles.swalPopup,
                    confirmButton: styles.swalButton,
                },
            });
            return;
        }

        const confirmResult = await Swal.fire({
            title: `<span style="font-size:1.1rem">คุณต้องการบันทึกการเปลี่ยนแปลงสถานะการดำเนินการทั้งหมด <strong>${changesToSave.length}</strong> รายการหรือไม่?</span>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<span style="min-width: 120px; display: inline-block;">✅ ใช่, บันทึก</span>',
            cancelButtonText: '<span style="min-width: 120px; display: inline-block;">❌ ยกเลิก</span>',
            customClass: {
                popup: styles.swalPopup,
                confirmButton: styles.swalButton,
                cancelButton: styles.swalCancelButton,
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
                customClass: {
                    popup: styles.swalPopup,
                },
            });
            fetchRequestDetails();
        } catch (err) {
            console.error('อัปเดตสถานะการดำเนินการล้มเหลว:', err);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: err.response?.data?.message || err.message || 'ไม่สามารถอัปเดตสถานะการดำเนินการได้ ลองใหม่อีกครั้ง',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: styles.swalPopup,
                    confirmButton: styles.swalButton,
                },
            });
        } finally {
            setIsSavingAll(false);
        }
    };

    const summaryStatusesToDisplay = useMemo(() => {
        return ['approved_in_queue', 'pending', 'preparing', 'delivering', 'completed'];
    }, []);

    const totalRequestedQty = useMemo(() => {
        return details
            .filter(d => d.approval_status === 'approved')
            .reduce((sum, d) => sum + d.requested_qty, 0);
    }, [details]);

    const countByStatus = useMemo(() => {
        const counts = {};
        summaryStatusesToDisplay.forEach(status => {
            counts[status] = 0;
        });

        details
            .filter(d => d.approval_status === 'approved')
            .forEach(d => {
                const effectiveStatus = pendingProcessingStatus[d.request_detail_id] ??
                    (d.processing_status || 'approved_in_queue');
                if (summaryStatusesToDisplay.includes(effectiveStatus)) {
                    counts[effectiveStatus] += d.requested_qty;
                }
            });

        return counts;
    }, [details, pendingProcessingStatus, summaryStatusesToDisplay]);

    const sortedDetails = useMemo(() => {
        if (!Array.isArray(details)) return [];
        const order = {
            approved: 1,
            waiting_approval: 2,
            rejected: 3
        };
        return [...details].sort((a, b) => {
            const aOrder = order[a.approval_status] || 99;
            const bOrder = order[b.approval_status] || 99;
            if (aOrder !== bOrder) return aOrder - bOrder;
            return a.request_detail_id - b.request_detail_id;
        });
    }, [details]);

    const hasPendingChanges = useMemo(() => {
        return Object.keys(pendingProcessingStatus).some(detailId => {
            const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
            const originalDbStatus = originalDetail?.processing_status || (originalDetail?.approval_status === 'approved' ? 'approved_in_queue' : null);
            const currentPendingStatus = pendingProcessingStatus[detailId];
            return currentPendingStatus !== originalDbStatus;
        });
    }, [pendingProcessingStatus, details]);

    const getStatusClass = (status) => {
        if (!status || status === '' || status === 'N/A' || status === null) {
            return 'defaultStatus';
        }
        return status;
    };

    if (loading)
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>กำลังโหลดข้อมูล...</p>
            </div>
        );

    if (!requestInfo && !loading) {
        return (
            <div className={styles.container}>
                <h2 className={styles.pageTitle}>รายละเอียดคำขอ #{request_id}</h2>
                <p className={styles.noDataMessage}>
                    ไม่พบรายละเอียดสำหรับคำขอ #{request_id} หรือคำขอนี้ไม่มีอยู่จริง
                </p>
                <button className={styles.backButton} onClick={() => router.push('/manage/request-status-manager')}>
                    ← กลับหน้ารวม
                </button>
            </div>
        );
    }

    return (
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <div className={styles.pageBar}>
                    <h1 className={styles.pageTitle}>
                        <span aria-hidden="true">📋</span> รายละเอียดคำขอ #{requestInfo?.request_code ?? request_id}
                    </h1>
                </div>
                <div className={styles.contentGrid}>
                    {/* Left Column */}
                    <section className={styles.leftPanel}>
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>ข้อมูลคำขอ</h3>
                            <div className={styles.infoGrid}>
                                <div className={styles.infoRow}>
                                    <MdPersonOutline size={20} className={styles.infoIcon} aria-hidden="true" />
                                    <p><strong>ผู้ขอ:</strong> {requestInfo.user_name}</p>
                                </div>
                                <div className={styles.infoRow}>
                                    <MdCalendarToday size={20} className={styles.infoIcon} aria-hidden="true" />
                                    <p>
                                        <strong>วันที่สร้าง:</strong>{' '}
                                        {new Date(requestInfo.request_date).toLocaleString('th-TH', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        })}
                                    </p>
                                </div>
                                <div className={styles.infoRow}>
                                    <MdHistory size={20} className={styles.infoIcon} aria-hidden="true" />
                                    <p>
                                        <strong>วันที่อัปเดตล่าสุด:</strong>{' '}
                                        {requestInfo.updated_at ? new Date(requestInfo.updated_at).toLocaleString('th-TH', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        }) : '-'}
                                    </p>
                                </div>
                                <div className={styles.infoRow}>
                                    <MdInfoOutline size={20} className={styles.infoIcon} aria-hidden="true" />
                                    <p>
                                        <strong>สถานะอนุมัติรวม:</strong>{' '}
                                        <span className={`${styles.statusBadge} ${styles[getStatusClass(requestInfo?.request_status)]}`}>
                                            {translateStatus(requestInfo?.request_status)}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>สรุปจำนวนรวม</h3>
                            <div className={styles.totalQtyDisplay}>
                                <strong>จำนวนรวมทั้งหมด:</strong>{' '}
                                <span className={styles.totalQtyValue}>{totalRequestedQty}</span> ชิ้น
                            </div>
                            <ul className={styles.statusQtyList}>
                                {summaryStatusesToDisplay.map((status) => (
                                    <li key={`sum-${status}`} className={styles.statusQtyItem}>
                                        <div className={styles.statusLabelGroup}>
                                            <span className={`${styles.statusBadge} ${styles[status]}`}>
                                                {translateStatus(status)}
                                            </span>
                                        </div>
                                        <span className={styles.statusQtyValue}>{countByStatus[status] || 0} ชิ้น</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                    {/* Right Column */}
                    <section className={styles.rightPanel}>
                        <div className={styles.card}>
                            <h3 className={styles.cardTitle}>รายการสินค้าในคำขอ</h3>
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
                                            <th>อัปเดตสถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDetails.map((d, index) => {
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
                                                        <span className={`${styles.statusBadge} ${styles[getStatusClass(d.approval_status)]}`}>
                                                            {translateStatus(d.approval_status)}
                                                        </span>
                                                    </td>
                                                    <td data-label="สถานะการดำเนินการ">
                                                        <span className={`${styles.statusBadge} ${styles[getStatusClass(actualProcessingStatus)]}`}>
                                                            {translateStatus(actualProcessingStatus)}
                                                        </span>
                                                    </td>
                                                    <td data-label="วันที่อัปเดตล่าสุด">
                                                        {d.updated_at ? new Date(d.updated_at).toLocaleString('th-TH', {
                                                            dateStyle: 'medium',
                                                            timeStyle: 'short',
                                                        }) : '-'}
                                                    </td>
                                                    <td data-label="อัปเดตสถานะ">
                                                        <select
                                                            className={styles.statusDropdown}
                                                            value={actualProcessingStatus || ''}
                                                            onChange={(e) => handleDropdownChange(e, d.request_detail_id)}
                                                            disabled={isProcessingSelectDisabled}
                                                            aria-label={`อัปเดตสถานะการดำเนินการสำหรับ ${d.item_name}`}
                                                        >
                                                            {d.approval_status === 'approved' && processingStatusStepsForLogic.map(status => {
                                                                const optionStatusIndex = processingStatusStepsForLogic.indexOf(status);
                                                                if (optionStatusIndex === originalDbStatusIndex || optionStatusIndex === originalDbStatusIndex + 1) {
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
                        <div className={styles.actionButtonContainer}>
                            <button
                                className={styles.backButton}
                                onClick={() => router.push('/manage/request-status-manager')}
                                aria-label="กลับไปหน้ารายการคำขอทั้งหมด"
                            >
                                ยกเลิก
                            </button>
                            <button
                                className={styles.saveAllButton}
                                onClick={handleSaveAllChanges}
                                disabled={!hasPendingChanges || isSavingAll}
                                aria-label="บันทึกการเปลี่ยนแปลงสถานะทั้งหมด"
                            >
                                {isSavingAll ? 'กำลังบันทึก...' : 'บันทึก'}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
