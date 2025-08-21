// src/app/purchasing/goods-receipt/page.jsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from '@/app/purchasing/po/page.module.css'; // Reuse CSS file
import { FaSearch, FaSync, FaChevronLeft, FaChevronRight, FaPlus, FaEye } from 'react-icons/fa';

const PAGE_SIZE = 12;

// ✅ Map สถานะ
const statusMap = {
  draft: { label: 'ฉบับร่าง', className: styles.draft },
  submitted: { label: 'รอดำเนินการ', className: styles.submitted },
  completed: { label: 'สำเร็จ', className: styles.approved },
  canceled: { label: 'ยกเลิก', className: styles.rejected }
};

export default function GRListPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState(sp.get('q') || '');
  const [startDate, setStartDate] = useState(sp.get('start') || '');
  const [endDate, setEndDate] = useState(sp.get('end') || '');
  const [page, setPage] = useState(Number(sp.get('page') || 1));

  const fetchList = async (silent = false) => {
    !silent ? setLoading(true) : setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));

      const res = await axiosInstance.get(`/gr?${params.toString()}`);
      setRows(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'โหลดรายการเอกสารรับของไม่สำเร็จ', 'error');
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
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    params.set('page', String(page));
    router.replace(`/purchasing/goods-receipt?${params.toString()}`);

    fetchList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, startDate, endDate, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const onResetFilters = () => {
    setQ('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const onCreateGR = () => router.push('/purchasing/goods-receipt/create');
  const onView = (row) => router.push(`/purchasing/goods-receipt/${row._id}`);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>รายการเอกสารรับของเข้า (GR)</h1>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={onCreateGR}>
            <FaPlus /> สร้าง GR ใหม่
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
                  onChange={(e) => { setPage(1); setQ(e.target.value); }}
                  placeholder="เลขที่ GR / ผู้ขาย"
                />
              </div>
            </div>
            <div className={styles.filterItem}>
              <label>ตั้งแต่วันที่</label>
              <input
                type="date"
                className={styles.input}
                value={startDate}
                onChange={(e) => { setPage(1); setStartDate(e.target.value); }}
              />
            </div>
            <div className={styles.filterItem}>
              <label>ถึงวันที่</label>
              <input
                type="date"
                className={styles.input}
                value={endDate}
                onChange={(e) => { setPage(1); setEndDate(e.target.value); }}
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
                <th>เลขที่ GR</th>
                <th>เลขที่ PO</th>
                <th>วันที่รับของ</th>
                <th>ผู้ขาย</th>
                <th>เลขที่ใบส่งของ</th>
                <th>สถานะ</th> {/* ✅ เพิ่มคอลัมน์สถานะ */}
                <th className={styles.center}>การทำงาน</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.center}>ไม่พบรายการ</td>
                </tr>
              )}

              {rows.map((r) => {
                const st = statusMap[r.status] || { label: r.status || '-', className: styles.defaultStatus };
                return (
                  <tr key={r._id}>
                    <td>{r.gr_no || '-'}</td>
                    <td>{r.po_id?.po_no || '-'}</td>
                    <td>{r.gr_date ? new Date(r.gr_date).toLocaleDateString('th-TH') : '-'}</td>
                    <td>{r.vendor_name || '-'}</td>
                    <td>{r.delivery_note || '-'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className={styles.center}>
                      <button className={styles.btnSmall} onClick={() => onView(r)} title="เปิดดู">
                        <FaEye /> ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                );
              })}

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
          <span className={styles.pageInfo}>หน้า {page} / {totalPages}</span>
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
