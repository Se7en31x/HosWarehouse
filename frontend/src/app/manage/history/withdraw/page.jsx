'use client';

import { useState, useEffect } from 'react';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

// ✅ แผนที่สถานะรวม (คำขอ)
const statusMap = {
  draft: 'ร่าง',
  waiting_approval: 'รอการอนุมัติ',
  approved_all: 'อนุมัติทั้งหมด',
  approved_partial: 'อนุมัติบางส่วน',
  approved_partial_and_rejected_partial : 'อนุมัติบางส่วน',
  rejected_all: 'ปฏิเสธทั้งหมด',
  canceled: 'ยกเลิก',

};

// ✅ แผนที่สถานะของแต่ละรายการ
const detailStatusMap = {
  approved: 'อนุมัติแล้ว',
  waiting_approval_detail: 'รอการอนุมัติ',
  rejected: 'ปฏิเสธ',
};

// ✅ แผนที่สถานะการดำเนินการ
const processingStatusMap = {
  pending: 'รอดำเนินการ',
  approved_in_queue: 'รอจัดเตรียม',
  preparing: 'กำลังจัดเตรียม',
  processing: 'กำลังดำเนินการ',
  completed: 'เสร็จสิ้น',
  returned: 'คืนเรียบร้อย',
};

// ✅ แผนที่การเร่งด่วน
const urgentMap = {
  true: 'ด่วน',
  false: 'ปกติ',
};

// ✅ ฟังก์ชันแปลงวันที่
const formatThaiDate = (isoString, type = 'short') => {
  if (!isoString) return 'ไม่ระบุ';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'ไม่ระบุ';

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

export default function WithdrawHistory() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔹 State ตัวกรอง
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterUrgent, setFilterUrgent] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 🔹 โหลดข้อมูล
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get('/history/withdraw');
        setData(Array.isArray(res.data) ? res.data.filter((item) => item && item.request_id) : []);
      } catch (err) {
        console.error('❌ Error fetching withdraw history:', err);
        Swal.fire({
          icon: 'error',
          title: 'ข้อผิดพลาด',
          text: 'ไม่สามารถโหลดประวัติการเบิกได้',
          confirmButtonText: 'ตกลง',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🔹 กรองข้อมูล
  const filteredData = data.filter((req) => {
    let matchStatus = filterStatus === 'all' || req.request_status === filterStatus;
    let matchUrgent =
      filterUrgent === 'all' ||
      (filterUrgent === 'urgent' && req.is_urgent) ||
      (filterUrgent === 'normal' && !req.is_urgent);

    // ✅ การค้นหาจากข้อความ
    const searchLower = searchText.toLowerCase();
    let matchSearch =
      req.request_code?.toLowerCase().includes(searchLower) ||
      req.department?.toLowerCase().includes(searchLower) ||
      req.requester_name?.toLowerCase().includes(searchLower);

    // ✅ การกรองวันที่
    let matchDate = true;
    if (startDate) {
      matchDate = new Date(req.request_date) >= new Date(startDate);
    }
    if (endDate) {
      matchDate = matchDate && new Date(req.request_date) <= new Date(endDate + 'T23:59:59');
    }

    return matchStatus && matchUrgent && matchSearch && matchDate;
  });

  // 🔹 Popup แสดงรายละเอียด
  const showDetail = (row) => {
    const itemList = (row.details || []).map((i) => {
      const detailStatus = detailStatusMap[i.status] || i.status;
      const processingStatus = processingStatusMap[i.processing_status] || '❓ ไม่ทราบสถานะ';
      const requestType = i.request_detail_type === 'borrow' ? 'ยืม' : 'เบิก';

      return `
        <tr>
          <td style="word-break: break-word; max-width: 150px">${i.item_name || 'ไม่ระบุ'}</td>
          <td class="text-right">${i.approved_qty ?? 0}/${i.requested_qty ?? 0} ${i.unit || '-'}</td>
          <td style="color:${i.status === 'approved'
            ? 'green'
            : i.status === 'waiting_approval_detail'
            ? 'orange'
            : 'red'}">${detailStatus}</td>
          <td>${requestType}</td>
          <td>${processingStatus}</td>
        </tr>`;
    }).join('');

    Swal.fire({
      title: `รายละเอียดคำขอ ${row.request_code}`,
      html: `
        <div class="modal-header">
          <div><b>ผู้ขอ:</b> ${row.requester_name || 'ไม่ระบุ'} | <b>แผนก:</b> ${row.department || 'ไม่ระบุ'}</div>
          <div><b>วันที่ขอ:</b> ${formatThaiDate(row.request_date, 'long')}</div>
          <div><b>ผู้อนุมัติ:</b> ${row.approved_by_name || '-'} | <b>เมื่อ:</b> ${formatThaiDate(row.approved_at, 'long')}</div>
          <div><b>ความเร่งด่วน:</b> ${row.is_urgent ? urgentMap.true : urgentMap.false}</div>
        </div>
        <hr class="modal-divider" />
        <div class="modal-details">
          <table class="detail-table">
            <thead>
              <tr>
                <th>ชื่อสินค้า</th>
                <th class="text-right">จำนวน (อนุมัติ/ขอ)</th>
                <th>สถานะ</th>
                <th>ประเภท</th>
                <th>สถานะการดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              ${itemList || '<tr><td colspan="5">ไม่มีรายการ</td></tr>'}
            </tbody>
          </table>
        </div>
      `,
      showCloseButton: true,
      confirmButtonText: 'ปิด',
      customClass: {
        popup: styles.swalPopup,
        confirmButton: styles.swalBtn,
        closeButton: styles.swalClose,
      },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>📦 ประวัติการเบิก/ยืม</h2>
        <p className={styles.subtitle}>บันทึกคำขอเบิกและยืมพัสดุทั้งหมด พร้อมรายละเอียดและสถานะ</p>
      </div>

      {/* ✅ Dashboard summary */}
      <div className={styles.summaryCards}>
        <div className={styles.card}><h4>ทั้งหมด</h4><p>{data.length}</p></div>
        <div className={styles.card}><h4>อนุมัติแล้ว</h4><p>{data.filter(d => d.request_status === 'approved_all').length}</p></div>
        <div className={styles.card}><h4>รออนุมัติ</h4><p>{data.filter(d => d.request_status === 'waiting_approval').length}</p></div>
        <div className={styles.card}><h4>ปฏิเสธ/ยกเลิก</h4><p>{data.filter(d => ['canceled', 'rejected_all'].includes(d.request_status)).length}</p></div>
      </div>

      {/* ✅ Filters */}
      <div className={styles.filters}>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">ทุกสถานะ</option>
          <option value="waiting_approval">รอการอนุมัติ</option>
          <option value="approved_all">อนุมัติทั้งหมด</option>
          <option value="approved_partial">อนุมัติบางส่วน</option>
          <option value="rejected_all">ปฏิเสธ</option>
          <option value="canceled">ยกเลิก</option>
        </select>

        <select value={filterUrgent} onChange={(e) => setFilterUrgent(e.target.value)}>
          <option value="all">เร่งด่วน/ปกติ</option>
          <option value="urgent">เฉพาะเร่งด่วน</option>
          <option value="normal">เฉพาะปกติ</option>
        </select>

        {/* ✅ ค้นหา */}
        <input
          type="text"
          placeholder="ค้นหา: รหัสคำขอ / แผนก / ผู้ใช้งาน"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.searchInput}
        />

        {/* ✅ ฟิลเตอร์วันที่ */}
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      {/* ✅ Table */}
      <div className={styles.tableWrapper}>
        {isLoading ? (
          <div className={styles.loadingContainer}>กำลังโหลดข้อมูล...</div>
        ) : filteredData.length === 0 ? (
          <div className={styles.noDataMessage}>ไม่พบประวัติการเบิก/ยืม</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>เลขที่คำขอ</th>
                <th>แผนก</th>
                <th>ผู้ขอ</th>
                <th>จำนวนรายการ</th>
                <th>รวมจำนวน</th>
                <th>สถานะรวม</th>
                <th>ด่วน</th>
                <th>รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((req) => (
                <tr key={req.request_id}>
                  <td>{formatThaiDate(req.request_date, 'short')}</td>
                  <td>{req.request_code || '-'}</td>
                  <td>{req.department || 'ไม่ระบุ'}</td>
                  <td>{req.requester_name || 'ไม่ระบุ'}</td>
                  <td className="text-right">{req.total_items ?? 0}</td>
                  <td className="text-right">{req.total_qty ?? 0}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      req.request_status === 'approved_all'
                        ? styles.approved
                        : req.request_status === 'approved_partial'
                        ? styles.partial
                        : req.request_status === 'waiting_approval'
                        ? styles.waiting
                        : styles.rejected
                    }`}>
                      {statusMap[req.request_status] || req.request_status}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${req.is_urgent ? styles.urgent : styles.normal}`}>
                      {req.is_urgent ? urgentMap.true : urgentMap.false}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => showDetail(req)} className={styles.btn}>
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
