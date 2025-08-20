'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

/** ───────── Mock อยู่ในไฟล์นี้ ───────── */
const PO_LIST = [
  { id: 'PO-2025-001', po_no: 'PO-2025-001', date: '2025-08-21', supplier: 'บจก.เมดิคอลพลัส', total: 9800.00,  status: 'waiting_approval' },
  { id: 'PO-2025-002', po_no: 'PO-2025-002', date: '2025-08-22', supplier: 'หจก.สุขภาพดี',     total: 15200.00, status: 'approved' },
  { id: 'PO-2025-003', po_no: 'PO-2025-003', date: '2025-08-23', supplier: 'บจก.ฟาร์มาพลัส',   total: 2200.00,  status: 'completed' },
];

const STATUS_TEXT = {
  waiting_approval: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  completed: 'เสร็จสิ้น',
};

const badgeStyle = (s) => ({
  display: 'inline-block',
  padding: '3px 8px',
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background:
    s === 'waiting_approval' ? '#fffbeb' :
    s === 'approved' ? '#dcfce7' :
    '#e5e7eb',
  color:
    s === 'waiting_approval' ? '#92400e' :
    s === 'approved' ? '#14532d' :
    '#374151',
});
/** ───────────────────────────────────── */

export default function PoListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('All');

  useEffect(() => {
    // จำลองโหลด
    const t = setTimeout(() => {
      setRows(PO_LIST);
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
        r.po_no.toLowerCase().includes(s) ||
        r.supplier.toLowerCase().includes(s)
      );
    }
    return data;
  }, [rows, q, status]);

  return (
    <main style={{ padding: 20, background: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>PO List</h1>
      <p style={{ color: '#6b7280', marginBottom: 12 }}>รายการใบสั่งซื้อ</p>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="ค้นหา PO/ผู้ขาย"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8, flex: '1 1 260px' }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}
        >
          <option>All</option>
          <option value="waiting_approval">waiting_approval</option>
          <option value="approved">approved</option>
          <option value="completed">completed</option>
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => alert('(Mock) สร้าง PO ใหม่')}
          style={{ background: '#fff', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}
        >
          + สร้าง PO
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>ไม่พบรายการ</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={th}>เลขที่ PO</th>
                <th style={th}>วันที่</th>
                <th style={th}>ผู้ขาย</th>
                <th style={{ ...th, textAlign: 'right' }}>ยอดรวม</th>
                <th style={th}>สถานะ</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td style={tdMono}>{r.po_no}</td>
                  <td style={td}>{r.date}</td>
                  <td style={td}>{r.supplier}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={td}>
                    <span style={badgeStyle(r.status)}>{STATUS_TEXT[r.status] || r.status}</span>
                  </td>
                  <td style={td}>
                    <Link href={`/purchasing/po/${r.id}`}>ดูรายละเอียด</Link>
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

const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' };
const td = { padding: 10, borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tdMono = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
