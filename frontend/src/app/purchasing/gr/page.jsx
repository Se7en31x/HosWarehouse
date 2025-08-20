'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/** ─────── Mock ในไฟล์นี้ ─────── */
const PO_READY_FOR_GR = [
  { id: 'PO-2025-001', date: '2025-08-21', supplier: 'บจก.เมดิคอลพลัส', status: 'approved',  total: 9800.00 },
  { id: 'PO-2025-002', date: '2025-08-22', supplier: 'หจก.สุขภาพดี',    status: 'approved',  total: 15200.00 },
  { id: 'PO-2025-003', date: '2025-08-23', supplier: 'บจก.ฟาร์มาพลัส',  status: 'completed', total: 2200.00 }, // ตัวอย่างที่ทำ GR ไปแล้ว
];
/** ─────────────────────────────── */

export default function GrEntryListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');

  useEffect(() => {
    const t = setTimeout(() => {
      setRows(PO_READY_FOR_GR);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let data = [...rows];
    if (status !== 'All') data = data.filter(r => r.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      data = data.filter(r =>
        r.id.toLowerCase().includes(s) ||
        r.supplier.toLowerCase().includes(s)
      );
    }
    return data;
  }, [rows, q, status]);

  return (
    <main style={wrap}>
      <h1 style={title}>Goods Receipt (GR)</h1>
      <p style={muted}>เลือกรายการ PO เพื่อบันทึกรับของ</p>

      <div style={toolbar}>
        <input
          placeholder="ค้นหา PO/ผู้ขาย"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={input}
        />
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={select}>
          <option>All</option>
          <option value="approved">approved</option>
          <option value="completed">completed</option>
        </select>
      </div>

      <div style={card}>
        {loading ? (
          <div style={empty}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={empty}>ไม่พบรายการ</div>
        ) : (
          <table style={table}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>เลขที่ PO</th>
                <th style={th}>วันที่</th>
                <th style={th}>ผู้ขาย</th>
                <th style={{ ...th, textAlign:'right' }}>ยอดรวม</th>
                <th style={th}>สถานะ</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={tdMono}>{r.id}</td>
                  <td style={td}>{r.date}</td>
                  <td style={td}>{r.supplier}</td>
                  <td style={{ ...td, textAlign:'right' }}>{r.total.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                  <td style={td}>{r.status}</td>
                  <td style={td}>
                    <Link href={`/purchasing/gr/${r.id}`}>บันทึกรับของ</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

/** styles */
const wrap   = { padding:20, background:'#f9fafb', minHeight:'100vh' };
const card   = { background:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' };
const title  = { fontSize:'1.4rem', fontWeight:700, margin:0 };
const muted  = { color:'#6b7280', marginTop:6, marginBottom:12 };
const toolbar= { display:'flex', gap:10, alignItems:'center', margin:'10px 0 12px', flexWrap:'wrap' };
const input  = { padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8, flex:'1 1 260px' };
const select = { padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 };
const empty  = { padding:12, textAlign:'center', color:'#6b7280' };
const table  = { width:'100%', borderCollapse:'collapse' };
const theadRow = { background:'#f3f4f6' };
const th     = { textAlign:'left', padding:10, borderBottom:'1px solid #e5e7eb' };
const td     = { padding:10, borderBottom:'1px solid #f1f5f9' };
const tdMono = { ...td, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
