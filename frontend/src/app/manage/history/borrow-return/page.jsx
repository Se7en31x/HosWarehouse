'use client';

import { useState, useEffect } from 'react';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

// ✅ สถานะการอนุมัติ (request_status)
const approvalStatusMap = {
  waiting_approval: '⏳ รอการอนุมัติ',
  approved_all: '✅ อนุมัติทั้งหมด',
  approved_partial: '🟡 อนุมัติบางส่วน',
  rejected: '❌ ถูกปฏิเสธ',
  canceled: '🚫 ยกเลิก',
  completed: '📦 ดำเนินการเสร็จสิ้น',
};

// ✅ สถานะการยืม/คืน
const borrowStatusMap = {
  not_returned: '⏳ ยังไม่คืน',
  partially_returned: '🟡 คืนบางส่วน',
  returned: '🟢 คืนครบแล้ว',
};

// ✅ สถานะการคืนของแต่ละ record
const returnStatusMap = {
  normal: '📦 คืนปกติ',
  damaged: '⚠️ ชำรุด',
  lost: '💔 สูญหาย',
};

// ✅ format วันที่ (รองรับ short / long)
const formatThaiDate = (isoString, type = 'long') => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '-';

  if (type === 'short') {
    return date.toLocaleString('th-TH', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BorrowHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterReturn, setFilterReturn] = useState('all');
  const [filterUrgent, setFilterUrgent] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get('/history/borrow');
        setData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('❌ Error fetching borrow history:', err);
        Swal.fire({ icon: 'error', title: 'โหลดข้อมูลผิดพลาด' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔹 กรองข้อมูล
  const filteredData = data.filter((req) => {
    let matchStatus = filterStatus === 'all' || req.request_status === filterStatus;
    let matchReturn =
      filterReturn === 'all' ||
      req.details?.some((d) => d.returns?.some((r) => r.condition === filterReturn));
    let matchUrgent =
      filterUrgent === 'all' ||
      (filterUrgent === 'urgent' && req.is_urgent) ||
      (filterUrgent === 'normal' && !req.is_urgent);

    return matchStatus && matchReturn && matchUrgent;
  });

  // 🔹 Dashboard summary
  const total = data.length;

  const returnedComplete = data.filter((d) => {
    if (!d.details || d.details.length === 0) return false;
    return d.details.every((i) => {
      const approved = i.approved_qty ?? 0;
      const returned =
        i.returns?.reduce((sum, r) => sum + (r.return_qty ?? 0), 0) || 0;
      return returned >= approved;
    });
  }).length;

  const partiallyReturned = data.filter((d) => {
    if (!d.details || d.details.length === 0) return false;
    let hasReturnedSome = false;
    let hasRemaining = false;
    d.details.forEach((i) => {
      const approved = i.approved_qty ?? 0;
      const returned =
        i.returns?.reduce((sum, r) => sum + (r.return_qty ?? 0), 0) || 0;
      if (returned > 0 && returned < approved) hasReturnedSome = true;
      if (returned < approved) hasRemaining = true;
    });
    return hasReturnedSome && hasRemaining;
  }).length;

  let damaged = 0,
    lost = 0;
  data.forEach((d) => {
    d.details?.forEach((i) => {
      i.returns?.forEach((r) => {
        if (r.condition === 'damaged') damaged += r.return_qty ?? 1;
        if (r.condition === 'lost') lost += r.return_qty ?? 1;
      });
    });
  });

  // 🔹 Popup รายละเอียด
  const showDetail = (row) => {
    const itemList = (row.details || [])
      .map((i) => {
        const totalReturned =
          i.returns?.reduce((sum, r) => sum + r.return_qty, 0) || 0;
        const remaining = (i.approved_qty ?? 0) - totalReturned;

        const returnTable =
          (i.returns || []).length > 0
            ? `
          <table class="${styles.returnTable}">
            <thead><tr>
              <th>วันที่คืน</th><th>จำนวน</th><th>สถานะ</th><th>ผู้ตรวจรับ</th>
            </tr></thead>
            <tbody>
              ${i.returns
                .map(
                  (r) => `
                <tr>
                  <td>${formatThaiDate(r.return_date, 'long')}</td>
                  <td>${r.return_qty} ${i.unit || '-'}</td>
                  <td>${returnStatusMap[r.condition] || r.condition}</td>
                  <td>${r.inspected_by_name || '-'}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>`
            : '<p style="color:gray;">ยังไม่มีการคืน</p>';

        return `
          <div class="${styles.detailItem}">
            <div class="${styles.detailItemHeader}">
              <span>${i.item_name || '-'}</span>
            </div>
            <ul class="${styles.detailListHorizontal}">
              <li><b>จำนวนอนุมัติ:</b> ${i.approved_qty ?? 0} ${i.unit || '-'}</li>
              <li><b>คืนแล้ว:</b> ${totalReturned} ${i.unit || '-'}</li>
              <li><b>คงค้าง:</b> ${remaining} ${i.unit || '-'}</li>
              <li><b>กำหนดคืน:</b> ${formatThaiDate(i.expected_return_date, 'short')}</li>
            </ul>
            <div><b>ประวัติการคืน:</b> ${returnTable}</div>
          </div>`;
      })
      .join('');

    Swal.fire({
      title: `รายละเอียดคำขอ ${row.request_code}`,
      html: `
        <div class="${styles.modalHeader}">
          <div><b>ผู้ยืม:</b> ${row.requester_name || '-'}</div>
          <div><b>แผนก:</b> ${row.department || '-'}</div>
          <div><b>วันที่ยืม:</b> ${formatThaiDate(row.request_date, 'long')}</div>
          <div><b>กำหนดคืน:</b> ${formatThaiDate(row.request_due_date, 'long')}</div>
          <div><b>ผู้อนุมัติ:</b> ${row.approved_by_name || '-'}</div>
          <div><b>อนุมัติเมื่อ:</b> ${formatThaiDate(row.approved_at, 'long')}</div>
        </div>
        <hr class="${styles.modalDivider}" />
        <div class="${styles.modalDetails}">
          ${itemList || '<p>ไม่พบรายการ</p>'}
        </div>`,
      showCloseButton: true,
      confirmButtonText: 'ปิด',
      customClass: { popup: styles.swalPopup },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>📚 ประวัติการยืม-คืน</h2>
      </div>

      {/* Dashboard */}
      <div className={styles.summaryCards}>
        <div className={styles.card}><h4>ทั้งหมด</h4><p>{total}</p></div>
        <div className={styles.card}><h4>คืนครบ</h4><p>{returnedComplete}</p></div>
        <div className={styles.card}><h4>คืนบางส่วน</h4><p>{partiallyReturned}</p></div>
        <div className={styles.card}><h4>ชำรุด</h4><p>{damaged}</p></div>
        <div className={styles.card}><h4>สูญหาย</h4><p>{lost}</p></div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">สถานะอนุมัติทั้งหมด</option>
          <option value="waiting_approval">รอการอนุมัติ</option>
          <option value="approved_all">อนุมัติทั้งหมด</option>
          <option value="approved_partial">อนุมัติบางส่วน</option>
          <option value="rejected">ถูกปฏิเสธ</option>
        </select>
        <select value={filterReturn} onChange={(e) => setFilterReturn(e.target.value)}>
          <option value="all">การคืนทั้งหมด</option>
          <option value="normal">คืนปกติ</option>
          <option value="damaged">คืนชำรุด</option>
          <option value="lost">สูญหาย</option>
        </select>
        <select value={filterUrgent} onChange={(e) => setFilterUrgent(e.target.value)}>
          <option value="all">เร่งด่วน/ปกติ</option>
          <option value="urgent">เร่งด่วน</option>
          <option value="normal">ปกติ</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.loadingContainer}>กำลังโหลด...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>วันที่ยืม</th>
                <th>เลขที่คำขอ</th>
                <th>ผู้ยืม</th>
                <th>แผนก</th>
                <th>กำหนดคืน</th>
                <th>เร่งด่วน</th>
                <th>สถานะอนุมัติ</th>
                <th>สถานะการยืม</th>
                <th>จำนวนรายการ</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((req) => {
                let overallBorrow = 'not_returned';
                const statuses = req.details?.map((d) => d.borrow_status) || [];
                if (statuses.length > 0) {
                  if (statuses.every((s) => s === 'returned')) {
                    overallBorrow = 'returned';
                  } else if (
                    statuses.some((s) => s === 'returned' || s === 'partially_returned')
                  ) {
                    overallBorrow = 'partially_returned';
                  }
                }

                return (
                  <tr key={req.request_id}>
                    <td>{formatThaiDate(req.request_date, 'short')}</td>
                    <td>{req.request_code}</td>
                    <td>{req.requester_name}</td>
                    <td>{req.department}</td>
                    <td>{formatThaiDate(req.request_due_date, 'short')}</td>
                    <td>
                      {req.is_urgent ? (
                        <span className={`${styles.badge} ${styles.urgent}`}>🔴 ด่วน</span>
                      ) : (
                        <span className={`${styles.badge} ${styles.normal}`}>⚪ ปกติ</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          req.request_status === 'approved_all'
                            ? styles.approved
                            : req.request_status === 'approved_partial'
                            ? styles.partial
                            : req.request_status === 'waiting_approval'
                            ? styles.waiting
                            : styles.rejected
                        }`}
                      >
                        {approvalStatusMap[req.request_status] || req.request_status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          overallBorrow === 'returned'
                            ? styles.borrowComplete
                            : overallBorrow === 'partially_returned'
                            ? styles.borrowPartial
                            : styles.borrowWaiting
                        }`}
                      >
                        {borrowStatusMap[overallBorrow]}
                      </span>
                    </td>
                    <td>{req.details?.length ?? 0}</td>
                    <td>
                      <button onClick={() => showDetail(req)} className={styles.btn}>
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
