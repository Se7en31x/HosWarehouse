'use client';

import { useMemo, useState } from 'react';

/** ───── MOCK DATA ───── */
const RFQ_ROWS = [
  { id:'RFQ-2025-001', date:'2025-08-19', requester:'พีระพัฒน์', status:'waiting_quotation' },
  { id:'RFQ-2025-002', date:'2025-08-20', requester:'สุรีรัตน์',  status:'closed' },
];
const PO_ROWS = [
  { id:'PO-2025-001', date:'2025-08-21', supplier:'บจก.เมดิคอลพลัส', total:9800.00, status:'approved' },
  { id:'PO-2025-002', date:'2025-08-22', supplier:'หจก.สุขภาพดี',    total:15200.00, status:'completed' },
];
const GR_ROWS = [
  { id:'GR-2025-001', date:'2025-08-25', po_no:'PO-2025-001', receiver:'คลัง A', good:50, damaged:0, returned:0 },
  { id:'GR-2025-002', date:'2025-08-26', po_no:'PO-2025-002', receiver:'คลัง A', good:25, damaged:2, returned:3 },
];
/** ───────────────────── */

export default function ReportsPage() {
  const [type, setType] = useState('PO'); // RFQ | PO | GR
  const [from, setFrom] = useState('2025-08-01');
  const [to, setTo]     = useState('2025-08-31');
  const [q, setQ]       = useState('');

  const data = useMemo(() => {
    const rows = type === 'RFQ' ? RFQ_ROWS : type === 'PO' ? PO_ROWS : GR_ROWS;
    const ql = q.trim().toLowerCase();
    return rows.filter(r => inRange(r.date, from, to) && (!ql || JSON.stringify(r).toLowerCase().includes(ql)));
  }, [type, from, to, q]);

  const summary = useMemo(() => {
    if (type === 'PO') {
      const total = data.reduce((a,r)=>a + (r.total||0), 0);
      return `PO ${data.length} รายการ • มูลค่ารวม ${fmt(total)} บาท`;
    }
    if (type === 'GR') {
      const g = data.reduce((a,r)=>a + (r.good||0), 0);
      const d = data.reduce((a,r)=>a + (r.damaged||0), 0);
      const r = data.reduce((a,rw)=>a + (rw.returned||0), 0);
      return `GR ${data.length} รายการ • Good ${g} • Damaged ${d} • Returned ${r}`;
    }
    return `RFQ ${data.length} รายการ`;
  }, [data, type]);

  const exportCsv = () => {
    if (data.length === 0) return alert('ไม่มีข้อมูลให้ส่งออก');
    const header = Object.keys(data[0]);
    const csv = [
      header.join(','),
      ...data.map(r => header.map(h => csvSafe(String(r[h] ?? ''))).join(',')),
    ].join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-report.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={wrap}>
      <h1 style={title}>Reports</h1>
      <p style={muted}>สรุป RFQ / PO / GR ตามช่วงวันที่ ค้นหา และส่งออก CSV</p>

      {/* ฟิลเตอร์ */}
      <section style={card}>
        <div style={toolbar}>
          <select value={type} onChange={e=>setType(e.target.value)} style={input}>
            <option value="RFQ">RFQ</option>
            <option value="PO">PO</option>
            <option value="GR">GR</option>
          </select>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={input}/>
          <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={input}/>
          <input placeholder="พิมพ์คำค้น..." value={q} onChange={e=>setQ(e.target.value)} style={{...input, flex:'1 1 260px'}}/>
          <div style={{flex:1}}/>
          <button style={ghostBtn} onClick={exportCsv} disabled={data.length===0}>ส่งออก CSV</button>
        </div>

        <div style={{marginTop:6, color:'#374151'}}>{summary}</div>
      </section>

      {/* ตารางผลลัพธ์ */}
      <section style={card}>
        <div style={{overflow:'auto'}}>
          {type === 'PO' && (
            <table style={table}>
              <thead><tr style={theadRow}>
                <th style={th}>เลขที่ PO</th>
                <th style={th}>วันที่</th>
                <th style={th}>ผู้ขาย</th>
                <th style={{...th, textAlign:'right'}}>มูลค่า</th>
                <th style={th}>สถานะ</th>
              </tr></thead>
              <tbody>
                {data.length===0 ? emptyRow(5) : data.map(r=>(
                  <tr key={r.id}>
                    <td style={tdMono}>{r.id}</td>
                    <td style={td}>{r.date}</td>
                    <td style={td}>{r.supplier}</td>
                    <td style={{...td, textAlign:'right'}}>{fmt(r.total)}</td>
                    <td style={td}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'RFQ' && (
            <table style={table}>
              <thead><tr style={theadRow}>
                <th style={th}>เลขที่ RFQ</th>
                <th style={th}>วันที่</th>
                <th style={th}>ผู้ขอ</th>
                <th style={th}>สถานะ</th>
              </tr></thead>
              <tbody>
                {data.length===0 ? emptyRow(4) : data.map(r=>(
                  <tr key={r.id}>
                    <td style={tdMono}>{r.id}</td>
                    <td style={td}>{r.date}</td>
                    <td style={td}>{r.requester}</td>
                    <td style={td}>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {type === 'GR' && (
            <table style={table}>
              <thead><tr style={theadRow}>
                <th style={th}>เลขที่ GR</th>
                <th style={th}>วันที่</th>
                <th style={th}>PO อ้างอิง</th>
                <th style={th}>ผู้รับ</th>
                <th style={{...th, textAlign:'right'}}>Good</th>
                <th style={{...th, textAlign:'right'}}>Damaged</th>
                <th style={{...th, textAlign:'right'}}>Returned</th>
              </tr></thead>
              <tbody>
                {data.length===0 ? emptyRow(7) : data.map(r=>(
                  <tr key={r.id}>
                    <td style={tdMono}>{r.id}</td>
                    <td style={td}>{r.date}</td>
                    <td style={td}>{r.po_no}</td>
                    <td style={td}>{r.receiver}</td>
                    <td style={{...td, textAlign:'right'}}>{r.good}</td>
                    <td style={{...td, textAlign:'right'}}>{r.damaged}</td>
                    <td style={{...td, textAlign:'right'}}>{r.returned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

/** helpers */
function inRange(d, from, to) {
  if (!from && !to) return true;
  const t = new Date(d).getTime();
  const f = from ? new Date(from).getTime() : -Infinity;
  const e = to ? new Date(to).getTime()   :  Infinity;
  return t >= f && t <= e;
}
function fmt(n) { return Number(n||0).toLocaleString(undefined,{ minimumFractionDigits:2, maximumFractionDigits:2 }); }
function csvSafe(s) { return `"${s.replace(/"/g,'""')}"`; }
function emptyRow(colspan) {
  return (<tr><td colSpan={colspan} style={{...td, textAlign:'center', color:'#6b7280'}}>ไม่มีข้อมูล</td></tr>);
}

/** styles */
const wrap   = { padding:20, background:'#f9fafb', minHeight:'100vh' };
const title  = { fontSize:'1.4rem', fontWeight:700, margin:0 };
const muted  = { color:'#6b7280', marginBottom:12 };
const card   = { background:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', marginBottom:12 };
const toolbar= { display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' };
const input  = { padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 };
const table  = { width:'100%', borderCollapse:'collapse', minWidth:900 };
const theadRow = { background:'#f3f4f6' };
const th     = { textAlign:'left', padding:10, borderBottom:'1px solid #e5e7eb' };
const td     = { padding:10, borderBottom:'1px solid #f1f5f9' };
const tdMono = { ...td, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
const ghostBtn = { background:'#fff', color:'#111827', border:'1px solid #d1d5db', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
