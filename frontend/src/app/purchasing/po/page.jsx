'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import {
  FaSearch, FaSync, FaChevronLeft, FaChevronRight,
  FaPlus, FaEye
} from 'react-icons/fa';

// ─────────────────────────────────────────────────────────────
// Config
const PAGE_SIZE = 12;

const statusMap = {
  issued: { text: 'บันทึกแล้ว', cls: 'badgeBlue' },
  draft: { text: 'ฉบับร่าง', cls: 'badgeGray' },
  waiting_approval: { text: 'รออนุมัติ', cls: 'badgeYellow' },
  approved: { text: 'อนุมัติแล้ว', cls: 'badgeGreen' },
  rejected: { text: 'ไม่อนุมัติ', cls: 'badgeRed' },
  canceled: { text: 'ยกเลิก', cls: 'badgeRed' },
};

const thb = (v) =>
  (Number(v) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = statusMap[status] || { text: status || '-', cls: 'badgeGray' };
  return <span className={`${styles.badge} ${styles[map.cls]}`}>{map.text}</span>;
}

export default function POListPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // ── filters/state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState(sp.get('q') || '');           // ค้นหาเลขที่ PO / ผู้ขาย
  const [status, setStatus] = useState(sp.get('status') || 'all');         // all | draft | waiting_approval | approved | rejected | canceled
  const [startDate, setStartDate] = useState(sp.get('start') || '');      // YYYY-MM-DD
  const [endDate, setEndDate] = useState(sp.get('end') || '');           // YYYY-MM-DD
  const [page, setPage] = useState(Number(sp.get('page') || 1));          // 1-based

  // ── fetch list
  const fetchList = async (silent = false) => {
    !silent ? setLoading(true) : setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status && status !== 'all') params.set('status', status);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));

      const res = await axiosInstance.get(`/po?${params.toString()}`);

      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'โหลดรายการ PO ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status && status !== 'all') params.set('status', status);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    params.set('page', String(page));
    router.replace(`/purchasing/po?${params.toString()}`);

    fetchList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, startDate, endDate, page]);

  // ── derived
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // ── handlers
  const onResetFilters = () => {
    setQ('');
    setStatus('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const onCreatePO = () => router.push('/purchasing/po/create');

  const onView = (row) => {
    router.push(`/purchasing/po/${row.po_id}`);
  };

  // ── UI
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>รายการใบสั่งซื้อ (PO)</h1>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={onCreatePO}>
            <FaPlus /> สร้าง PO ใหม่
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.card}>
        <h2>ตัวกรอง</h2>
        <div className={styles.filters}>
          <div className={styles.filterRow}>
            <div className={styles.filterItem}>
              <label>ค้นหา</label>
              <div className={styles.inputWithIcon}>
                <FaSearch />
                <input
                  className={styles.input}
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="เลขที่ PO / ชื่อผู้ขาย"
                />
              </div>
            </div>

            <div className={styles.filterItem}>
              <label>สถานะ</label>
              <select
                className={styles.input}
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="all">ทั้งหมด</option>
                <option value="issued">บันทึกแล้ว</option>
                <option value="draft">ฉบับร่าง</option>
                <option value="waiting_approval">รออนุมัติ</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="rejected">ไม่อนุมัติ</option>
                <option value="canceled">ยกเลิก</option>
              </select>
            </div>

            <div className={styles.filterItem}>
              <label>ตั้งแต่วันที่</label>
              <input
                type="date"
                className={styles.input}
                value={startDate}
                onChange={(e) => {
                  setPage(1);
                  setStartDate(e.target.value);
                }}
              />
            </div>

            <div className={styles.filterItem}>
              <label>ถึงวันที่</label>
              <input
                type="date"
                className={styles.input}
                value={endDate}
                onChange={(e) => {
                  setPage(1);
                  setEndDate(e.target.value);
                }}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <button className={styles.btnGhost} onClick={() => fetchList(true)} disabled={refreshing}>
              <FaSync /> รีเฟรช
            </button>
            <button className={styles.btnSecondary} onClick={onResetFilters}>
              ล้างตัวกรอง
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2>ผลการค้นหา</h2>
          <div className={styles.resultInfo}>
            {loading ? 'กำลังโหลด...' : `ทั้งหมด ${total.toLocaleString('th-TH')} รายการ`}
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>เลขที่ PO</th>
                <th>วันที่</th>
                <th>ผู้ขาย</th>
                <th>PR No.</th>
                <th className={styles.center}>สถานะ</th>
                <th className={styles.right}>ยอดรวม (฿)</th>
                <th className={styles.center}>การทำงาน</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.center}>ไม่พบรายการ</td>
                </tr>
              )}

              {rows.map((r) => (
                <tr key={r.po_id}>
                  <td>{r.po_no || '-'}</td>
                  <td>{r.po_date ? new Date(r.po_date).toLocaleDateString('th-TH') : '-'}</td>
                  <td>{r.vendor_name || '-'}</td>
                  <td>{r.pr_no || '-'}</td>
                  <td className={styles.center}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className={styles.right}>{thb(r.total_amount)}</td>
                  <td className={styles.center}>
                    <button className={styles.btnSmall} onClick={() => onView(r)} title="เปิดดู">
                      <FaEye /> ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={7} className={styles.center}>กำลังโหลด...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.pagination}>
          <button
            className={styles.btnGhost}
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <FaChevronLeft /> ก่อนหน้า
          </button>

          <span className={styles.pageInfo}>
            หน้า {page} / {totalPages}
          </span>

          <button
            className={styles.btnGhost}
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            ถัดไป <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}