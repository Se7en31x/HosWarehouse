// app/manageReturn/page.jsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';

const STATUS_OPTS = [
  { value: 'due_soon', label: 'ใกล้ครบกำหนด' },
  { value: 'overdue', label: 'เกินกำหนด' },
  { value: 'all', label: 'ทั้งหมดที่ค้างคืน' },
];

// helper: format date TH
const fdate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return '-';
  return dt.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function ManageReturnPage() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const limit = 12;
  const abortRef = useRef(null);

  // debounce ค้นหา 400ms
  const dq = useMemo(() => q.trim().toLowerCase(), [q]);
  const [debouncedQ, setDebouncedQ] = useState(dq);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(dq), 400);
    return () => clearTimeout(t);
  }, [dq]);

  const fetchData = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErr('');
    try {
      const res = await axiosInstance.get('/manage/returns/queue', {
        params: { q: debouncedQ, status, page, limit },
        signal: controller.signal,
      });

      // โครงสร้างใหม่จาก API
      setRows(Array.isArray(res?.data?.rows) ? res.data.rows : []);
      setTotalPages(Number(res?.data?.totalPages) || 1);
    } catch (e) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return;
      console.error(e);
      setErr('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchData();
  }, [debouncedQ, status, page]);

  const onSubmitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setDebouncedQ(dq);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.heading}>คำขอที่มีการยืม (สำหรับตรวจรับคืน)</h1>
          <form className={styles.controls} onSubmit={onSubmitSearch}>
            <input
              className={styles.input}
              placeholder="ค้นหา: รหัสคำขอ / ผู้ขอ / รายการพัสดุ"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
            <select
              className={styles.select}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button type="button" className={styles.refreshBtn} onClick={fetchData}>รีเฟรช</button>
          </form>
        </div>

        {loading ? (
          <div className={styles.loading}>กำลังโหลด...</div>
        ) : err ? (
          <div className={styles.error}>
            <span>{err}</span>
            <button className={styles.refreshBtn} onClick={fetchData}>ลองใหม่</button>
          </div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>รหัสคำขอ</th>
                    <th>ผู้ขอ</th>
                    <th>แผนก</th>
                    <th>ครบกำหนดเร็วสุด</th>
                    <th>ใกล้ครบกำหนด</th>
                    <th>เกินกำหนด</th>
                    <th>สถานะรวม</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map(r => {
                    const over = Number(r.items_overdue || 0) > 0;
                    const soon = !over && Number(r.items_due_soon || 0) > 0;
                    return (
                      <tr key={r.request_id} className={over ? styles.rowOverdue : (soon ? styles.rowDueSoon : '')}>
                        <td>{r.request_code}</td>
                        <td>{r.requester_name}</td>
                        <td>{r.department}</td>
                        <td>{fdate(r.earliest_due_date)}</td>
                        <td><span className={`${styles.badge} ${styles.badgeWarn}`}>{r.items_due_soon ?? 0}</span></td>
                        <td><span className={`${styles.badge} ${styles.badgeDanger}`}>{r.items_overdue ?? 0}</span></td>
                        <td>{r.overall_status || '-'}</td>
                        <td>
                          <Link href={`/manage/manageReturn/${r.request_id}`} className={styles.actionBtn}>
                            ตรวจสอบ/อนุมัติการคืน
                          </Link>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className={styles.noData}>ไม่พบรายการ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >ก่อนหน้า</button>
                <span>หน้า {page} / {totalPages}</span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >ถัดไป</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
