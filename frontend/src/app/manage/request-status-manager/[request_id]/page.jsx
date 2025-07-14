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
} from 'react-icons/md';

// --- Functions ---
const translateStatus = (status) => {
  const map = {
    pending: 'รอดำเนินการ',
    preparing: 'กำลังจัดเตรียม',
    delivering: 'อยู่ระหว่างการนำส่ง',
    completed: 'เสร็จสิ้น',
    approved: 'อนุมัติแล้ว',
    rejected: 'ปฏิเสธแล้ว',
    waiting_approval_detail: 'รออนุมัติ',
    approved_all: 'อนุมัติทั้งหมดแล้ว',
    approved_partial: 'อนุมัติบางส่วน',
    waiting_approval: 'รอการอนุมัติ',
    rejected_all: 'ปฏิเสธทั้งหมดแล้ว',
    rejected_partial: 'ปฏิเสธบางส่วน',
    approved_partial_and_rejected_partial: 'อนุมัติและปฏิเสธบางส่วน',
    canceled: 'ยกเลิกคำขอ',
    unknown_status: 'สถานะไม่ทราบ',
  };
  return map[status] || status;
};

const processingStatusSteps = ['pending', 'preparing', 'delivering', 'completed'];

const approvalStatusSteps = ['waiting_approval_detail', 'approved', 'rejected'];

const terminalOverallRequestStatuses = [
  'rejected_all', 'rejected_partial', 'canceled', 'completed'
];

const immutableOverallApprovalStatuses = [
  'approved_all', 'rejected_all', 'canceled', 'completed', 'approved_partial_and_rejected_partial'
];

const immutableDetailProcessingStatuses = ['rejected', 'waiting_approval_detail'];

const statusIconMap = {
  pending: <MdOutlineAccessTime size={24} />,
  preparing: <MdOutlineBuild size={24} />,
  delivering: <MdOutlineLocalShipping size={24} />,
  completed: <MdOutlineCheckCircle size={24} />,
  pendingActive: <MdAccessTimeFilled size={24} />,
  preparingActive: <MdBuildCircle size={24} />,
  deliveringActive: <MdLocalShipping size={24} />,
  completedActive: <MdDoneAll size={24} />,
};

// --- Components ---
function StatusTrack({ currentStatus, statusStepsConfig, statusIconMapConfig }) {
  const steps = statusStepsConfig || [
    { key: 'pending', label: 'รอดำเนินการ', icon: statusIconMapConfig.pending || <MdOutlineAccessTime /> },
    { key: 'preparing', label: 'กำลังเตรียม', icon: statusIconMapConfig.preparing || <MdOutlineBuild /> },
    { key: 'delivering', label: 'อยู่ระหว่างการนำส่ง', icon: statusIconMapConfig.delivering || <MdOutlineLocalShipping /> },
    { key: 'completed', label: 'เสร็จสิ้น', icon: statusIconMapConfig.completed || <MdOutlineCheckCircle /> }
  ];

  const currentIndex = steps.findIndex(s => s.key === currentStatus);
  const isOverallCompleted = currentStatus === 'completed';
  let donePercentage = '0%';

  if (currentIndex !== -1 && steps.length > 1) {
    donePercentage = `${(currentIndex / (steps.length - 1)) * 100}%`;
  } else if (currentStatus === 'completed') {
    donePercentage = '100%';
  }

  const shouldNotShowTrack = [
    'rejected_all', 'rejected_partial', 'waiting_approval', 'canceled', 'approved_partial_and_rejected_partial'
  ].includes(currentStatus);

  if (shouldNotShowTrack) {
    return (
      <div className={`${styles.progressTracker} ${styles.nonTrackable}`}>
        <p className={styles.noTrackerData}>
          สถานะรวมของคำขอ: <span className={`${styles.statusBadgeSmall} ${styles[currentStatus] || styles.defaultStatus}`}>
            {translateStatus(currentStatus)}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.progressTracker} ${isOverallCompleted ? styles.trackerCompleted : ''}`}
      style={{ '--done-percentage': donePercentage }}
    >
      <div className={styles.lineBackground}></div>
      <div className={styles.lineProgress}></div>

      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isDone = index < currentIndex;
        const iconToDisplay = isDone
          ? (statusIconMapConfig?.[`${step.key}Active`] || step.icon)
          : isActive
            ? (statusIconMapConfig?.[`${step.key}Active`] || step.icon)
            : (statusIconMapConfig?.[step.key] || step.icon);

        return (
          <div key={step.key} className={styles.stepContainer}>
            <div
              className={`${styles.stepCircle} ${isDone ? styles.done : isActive ? styles.active : ''}`}
            >
              <div className={styles.icon}>{iconToDisplay}</div>
            </div>
            <div className={`${styles.stepLabel} ${isActive ? styles.labelActive : ''}`}>
              {step.label}
            </div>
          </div>
        );
      })}
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

  // TODO: Replace with actual logged-in user ID
  const currentUserId = 1;

  const calculateOverallProcessingStatus = (currentDetails) => {
    const approvedAndProcessingDetails = currentDetails.filter(d =>
      d.approval_status === 'approved' && processingStatusSteps.includes(d.processing_status)
    );

    if (approvedAndProcessingDetails.length === 0) {
      const hasApprovedButNotStarted = currentDetails.some(d =>
        d.approval_status === 'approved' && (!d.processing_status || d.processing_status === '')
      );
      if (hasApprovedButNotStarted) return 'pending';

      const allApprovedAreCompleted = currentDetails.every(d =>
        d.approval_status !== 'approved' || d.processing_status === 'completed'
      );
      if (allApprovedAreCompleted) return 'completed';

      return 'pending';
    }

    const minIndex = Math.min(
      ...approvedAndProcessingDetails.map((d) => processingStatusSteps.indexOf(d.processing_status))
    );
    return processingStatusSteps[minIndex];
  };

  const getDisplayOverallStatus = useMemo(() => {
    if (!requestInfo) return 'pending';

    if (['rejected_all', 'rejected_partial', 'waiting_approval', 'canceled', 'approved_partial_and_rejected_partial'].includes(requestInfo.request_status)) {
      return requestInfo.request_status;
    }

    const combinedDetails = details.map(d => ({
      ...d,
      processing_status: pendingProcessingStatus[d.request_detail_id] || d.processing_status
    }));
    return calculateOverallProcessingStatus(combinedDetails);
  }, [requestInfo, details, pendingProcessingStatus]);


  // --- Effects ---
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

  // --- Data Fetching ---
  const fetchRequestDetails = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/requestStatus/${request_id}`, {
        params: { t: Date.now() },
      });

      setRequestInfo(res.data.request || null);
      setDetails(res.data.details && Array.isArray(res.data.details) ? res.data.details : []);

    } catch (err) {
      console.error('โหลดข้อมูลล้มเหลว', err);
      Swal.fire('ผิดพลาด', 'โหลดข้อมูลไม่สำเร็จ', 'error');
      setDetails([]);
      setRequestInfo(null);
    } finally {
      setLoading(false);
      setPendingProcessingStatus({}); // Clear pending status on data load
    }
  };

  // --- Event Handlers ---
  const handleDropdownChange = (e, requestDetailId) => {
    setPendingProcessingStatus(prev => ({
      ...prev,
      [requestDetailId]: e.target.value
    }));
  };

  const handleSaveAllChanges = async () => {
    const changesToSave = Object.keys(pendingProcessingStatus).filter(detailId => {
      const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
      // Only include changes if the new status is different from the current saved status
      return pendingProcessingStatus[detailId] !== (originalDetail?.processing_status || '');
    }).map(detailId => {
      const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
      return {
        request_detail_id: parseInt(detailId, 10),
        newStatus: pendingProcessingStatus[detailId],
        current_approval_status: originalDetail?.approval_status,
      };
    });

    if (changesToSave.length === 0) {
      Swal.fire('ไม่พบการเปลี่ยนแปลง', 'ไม่มีรายการใดที่ถูกเลือกเพื่อบันทึก', 'info');
      return;
    }

    if (requestInfo?.request_status && terminalOverallRequestStatuses.includes(requestInfo.request_status)) {
      Swal.fire('ไม่สามารถแก้ไขได้', 'คำขอนี้อยู่ในสถานะรวมที่ไม่สามารถเปลี่ยนแปลงสถานะการดำเนินการได้', 'warning');
      return;
    }

    // Frontend validation: Check if trying to change processing status for rejected/waiting_approval items
    const invalidChanges = changesToSave.filter(change => {
      const currentDetail = details.find(d => d.request_detail_id === change.request_detail_id);
      return currentDetail && immutableDetailProcessingStatuses.includes(currentDetail.approval_status);
    });

    if (invalidChanges.length > 0) {
      const invalidItems = invalidChanges.map(item => {
        const detail = details.find(d => d.request_detail_id === item.request_detail_id);
        return detail ? `"${detail.item_name}" (สถานะอนุมัติ: ${translateStatus(detail.approval_status)})` : `รายการ ID: ${item.request_detail_id}`;
      }).join(', ');
      Swal.fire('ไม่สามารถบันทึกบางรายการได้', `รายการเหล่านี้ไม่สามารถเปลี่ยนแปลงสถานะการดำเนินการได้: ${invalidItems} (เนื่องจากถูกปฏิเสธแล้ว หรือยังไม่ได้รับการอนุมัติ)`, 'warning');
      return; // Prevent saving if any invalid changes are present
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

      setPendingProcessingStatus({});

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

  // --- Calculated Values ---
  const totalRequestedQty = useMemo(() => {
    return details.reduce((sum, d) => sum + d.requested_qty, 0);
  }, [details]);

  const countByStatus = useMemo(() => {
    const counts = {};
    const combinedDetails = details.map(d => ({
      ...d,
      processing_status: pendingProcessingStatus[d.request_detail_id] || d.processing_status
    }));

    combinedDetails.forEach((d) => {
      if (d.approval_status === 'rejected') {
        counts['rejected'] = (counts['rejected'] || 0) + d.requested_qty;
      } else if (d.approval_status === 'waiting_approval_detail') {
        counts['waiting_approval_detail'] = (counts['waiting_approval_detail'] || 0) + d.requested_qty;
      }
      else {
        const statusToCount = d.processing_status || d.approval_status;
        if (statusToCount) {
          counts[statusToCount] = (counts[statusToCount] || 0) + d.requested_qty;
        }
      }
    });
    return counts;
  }, [details, pendingProcessingStatus]);

  const hasPendingChanges = useMemo(() => {
    return Object.keys(pendingProcessingStatus).some(detailId => {
      const originalDetail = details.find(d => d.request_detail_id === parseInt(detailId, 10));
      return pendingProcessingStatus[detailId] !== (originalDetail?.processing_status || '');
    });
  }, [pendingProcessingStatus, details]);


  // --- Render Logic ---
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

  const isOverallRequestProcessingImmutable = terminalOverallRequestStatuses.includes(requestInfo?.request_status);

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
                {new Date(requestInfo.updated_at || requestInfo.request_date).toLocaleString('th-TH', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
            <div className={styles.summaryItem}>
              <MdInfoOutline size={20} className={styles.summaryIcon} />
              <p>
                <strong>สถานะรวม:</strong>{' '}
                <span className={`${styles.statusBadgeSmall} ${styles[requestInfo?.request_status] || styles.defaultStatus}`}>
                  {translateStatus(requestInfo?.request_status || 'N/A')}
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
        currentStatus={getDisplayOverallStatus}
        statusStepsConfig={processingStatusSteps.map(s => ({
          key: s,
          label: translateStatus(s),
          icon: statusIconMap[`${s}Active`]
        }))}
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
                isOverallRequestProcessingImmutable ||
                immutableDetailProcessingStatuses.includes(d.approval_status) ||
                isSavingAll;

              const displayProcessingStatus = immutableDetailProcessingStatuses.includes(d.approval_status)
                ? ''
                : (pendingProcessingStatus[d.request_detail_id] !== undefined
                  ? pendingProcessingStatus[d.request_detail_id]
                  : d.processing_status || '');

              return (
                <tr
                  key={d.request_detail_id}
                  className={`${styles.tableRow} ${d.approval_status === 'approved'
                    ? styles.approvedRow
                    : d.approval_status === 'rejected'
                      ? styles.rejectedRow
                      : styles.waitingApprovalRow
                    }`}
                >
                  <td data-label="ลำดับ">{index + 1}</td>
                  <td data-label="ชื่อพัสดุ">{d.item_name}</td>
                  <td data-label="จำนวน">{d.requested_qty}</td>
                  <td data-label="หน่วย">{d.item_unit}</td>
                  <td data-label="สถานะการอนุมัติ">
                    <span className={`${styles.statusBadge} ${styles[d.approval_status] || styles.defaultStatus}`}>
                      {translateStatus(d.approval_status)}
                    </span>
                  </td>
                  <td data-label="สถานะการดำเนินการ">
                    {/* *** ปรับปรุงการแสดงผลข้อความตรงนี้: ใช้ "-" *** */}
                    {immutableDetailProcessingStatuses.includes(d.approval_status) ? (
                      <span className={`${styles.statusBadge} ${styles.dashStatus}`}>
                        -
                      </span>
                    ) : (
                      <span className={`${styles.statusBadge} ${styles[d.processing_status] || styles.defaultStatus}`}>
                        {translateStatus(d.processing_status || 'N/A')}
                      </span>
                    )}
                  </td>
                  <td data-label="หมายเหตุ">{d.request_detail_note || '-'}</td>
                  <td data-label="วันที่อัปเดตล่าสุด">
                    {d.updated_at
                      ? new Date(d.updated_at).toLocaleString('th-TH', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                      : '-'}
                  </td>
                  <td data-label="อัปเดตสถานะการดำเนินการ">
                    <div className={styles.statusUpdateControl}>
                      <select
                        value={displayProcessingStatus}
                        onChange={(e) => handleDropdownChange(e, d.request_detail_id)}
                        disabled={isProcessingSelectDisabled}
                        className={`${styles.selectStatus} ${isProcessingSelectDisabled ? styles.selectStatusDisabled : ''}`}
                        aria-label={`เปลี่ยนสถานะการดำเนินการของ ${d.item_name}`}
                      >
                        {/* *** ปรับปรุงออปชั่นเริ่มต้นใน dropdown *** */}
                        {immutableDetailProcessingStatuses.includes(d.approval_status) ? (
                          <option value="" disabled>ไม่ได้ดำเนินการ</option>
                        ) : (
                          <option value="" disabled>
                            {d.processing_status ? translateStatus(d.processing_status) : "เลือกสถานะ"}
                          </option>
                        )}
                        {!immutableDetailProcessingStatuses.includes(d.approval_status) && processingStatusSteps.map((status) => (
                          <option key={status} value={status}>
                            {translateStatus(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}

            {Array.from({ length: Math.max(0, 3 - details.length) }).map((_, idx) => (
              <tr key={`empty-${idx}`} className={styles.emptyRow}>
                <td colSpan="9">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.bottomControls}>
        <button className={styles.backBtn} onClick={() => router.push('/manage/request-status-manager')}>
          ← กลับหน้ารวม
        </button>
        <button
          className={styles.saveAllButton}
          onClick={handleSaveAllChanges}
          disabled={isSavingAll || isOverallRequestProcessingImmutable || !hasPendingChanges}
        >
          {isSavingAll ? 'กำลังบันทึกทั้งหมด...' : 'บันทึกการเปลี่ยนแปลงทั้งหมด'}
        </button>
      </div>
    </div>
  );
}