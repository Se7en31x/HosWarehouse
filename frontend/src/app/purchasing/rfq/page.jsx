'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

/** Mock data */
const MOCK_RFQ = [
  { id: 1, rfq_no: 'RFQ-2025-001', date: '2025-08-20', creator: 'Admin', status: 'Sent', items_count: 2, suppliers_invited: 3, note: 'เติมสต็อกเดือนนี้' },
  { id: 2, rfq_no: 'RFQ-2025-002', date: '2025-08-21', creator: 'Admin', status: 'Draft', items_count: 1, suppliers_invited: 0, note: 'รายการเบื้องต้น' },
  { id: 3, rfq_no: 'RFQ-2025-003', date: '2025-08-22', creator: 'NurseA', status: 'Selected', items_count: 3, suppliers_invited: 2, note: 'เร่งด่วน' },
  { id: 4, rfq_no: 'RFQ-2025-004', date: '2025-08-23', creator: 'Admin', status: 'Closed', items_count: 2, suppliers_invited: 1, note: '' },
];

const STATUS_OPTIONS = ['All', 'Draft', 'Sent', 'Selected', 'Closed'];

const StatusBadge = ({ value }) => {
  const map = {
    Draft: { c: styles.badgeGray, label: 'Draft' },
    Sent: { c: styles.badgeBlue, label: 'Sent' },
    Selected: { c: styles.badgeGreen, label: 'Selected' },
    Closed: { c: styles.badgeDark, label: 'Closed' },
  };
  const s = map[value] || { c: styles.badgeGray, label: value };
  return <span className={`${styles.badge} ${s.c}`}>{s.label}</span>;
};

export default function RfqListPage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');
  const [sortBy, setSortBy] = useState('date'); // date | rfq_no | status
  const [sortDir, setSortDir] = useState('desc'); // asc | desc
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    setRows(MOCK_RFQ);
  }, []);

  const filtered = useMemo(() => {
    let data = [...rows];
    if (status !== 'All') data = data.filter(r => r.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter(r =>
        r.rfq_no.toLowerCase().includes(s) ||
        r.creator.toLowerCase().includes(s) ||
        (r.note || '').toLowerCase().includes(s)
      );
    }
    data.sort((a,b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'date') return (a.date > b.date ? 1 : -1) * dir;
      if (sortBy === 'rfq_no') return (a.rfq_no > b.rfq_no ? 1 : -1) * dir;
      if (sortBy === 'status') return (a.status > b.status ? 1 : -1) * dir;
      return 0;
    });
    return data;
  }, [rows, q, status, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page-1)*pageSize, page*pageSize);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('asc'); }
  };

  return (
    <main className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>RFQ List</h1>
          <p className={styles.subtitle}>รายการคำขอใบเสนอราคา</p>
        </div>
        <div className={styles.actionsRow}>
          {/* ปุ่มนี้ mock ไว้ก่อน — ของจริงจะมาจาก Inventory */}
          <button className={styles.primary} onClick={()=>alert('(Mock) สร้าง RFQ ใหม่จาก Inventory')}>
            + สร้าง RFQ
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input className={styles.input} placeholder="ค้นหา RFQ/ผู้สร้าง/หมายเหตุ" value={q} onChange={e=>{setQ(e.target.value); setPage(1);}} />
        <select className={styles.select} value={status} onChange={e=>{setStatus(e.target.value); setPage(1);}}>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className={styles.spacer} />
        <label className={styles.sortLabel}>เรียงโดย</label>
        <select className={styles.select} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="date">วันที่</option>
          <option value="rfq_no">เลขที่</option>
          <option value="status">สถานะ</option>
        </select>
        <button className={styles.ghost} onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>
          {sortDir === 'asc' ? '↑ asc' : '↓ desc'}
        </button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={()=>toggleSort('rfq_no')} className={styles.thBtn}>เลขที่</th>
              <th onClick={()=>toggleSort('date')} className={styles.thBtn}>วันที่</th>
              <th>ผู้สร้าง</th>
              <th>จำนวนรายการ</th>
              <th>เชิญผู้ขาย</th>
              <th onClick={()=>toggleSort('status')} className={styles.thBtn}>สถานะ</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((r) => (
              <tr key={r.id} className={styles.clickRow} onClick={()=>location.assign(`/purchasing/rfq/${r.id}`)}>
                <td className={styles.mono}>{r.rfq_no}</td>
                <td>{r.date}</td>
                <td>{r.creator}</td>
                <td>{r.items_count}</td>
                <td>{r.suppliers_invited}</td>
                <td><StatusBadge value={r.status} /></td>
                <td className={styles.muted}>{r.note || '-'}</td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr><td className={styles.empty} colSpan={7}>ไม่พบรายการ</td></tr>
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button>
          <span>หน้า {page} / {totalPages}</span>
          <button disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>›</button>
        </div>
      </div>
    </main>
  );
}
