'use client';

import React, { useMemo, useState } from 'react';

/** ───── MOCK DATA (อยู่ในไฟล์นี้) ───── */
const GR_HISTORY = [
  {
    id:'GR-2025-001',
    date:'2025-08-25',
    po_no:'PO-2025-001',
    supplier:'บจก.เมดิคอลพลัส',
    receiver:'คลัง A',
    doc_no:'DO-88991',
    attachments:['DO-88991.pdf'],
    good:50, damaged:0, returned:0,
    lines:[{ code:'MED001', name:'ยาพาราเซตามอล 500mg', unit:'กล่อง', good:50, damaged:0, returned:0, reason:'' }]
  },
  {
    id:'GR-2025-002',
    date:'2025-08-26',
    po_no:'PO-2025-002',
    supplier:'หจก.สุขภาพดี',
    receiver:'คลัง A',
    doc_no:'DO-77012',
    attachments:['DO-77012.pdf','INV-77012.pdf'],
    good:25, damaged:2, returned:3,
    lines:[
      { code:'MED010', name:'แอลกอฮอล์ 70%', unit:'ขวด', good:20, damaged:2, returned:3, reason:'บรรจุภัณฑ์บุบ/รั่ว' },
      { code:'GEN005', name:'กระดาษทิชชู่ 2 ชั้น', unit:'แพ็ค', good:5,  damaged:0, returned:0, reason:'' },
    ]
  },
  {
    id:'GR-2025-003',
    date:'2025-08-28',
    po_no:'PO-2025-003',
    supplier:'บจก.ฟาร์มาพลัส',
    receiver:'คลัง B',
    doc_no:'DO-55221',
    attachments:[],
    good:10, damaged:0, returned:0,
    lines:[
      { code:'MED020', name:'หน้ากากอนามัย 3 ชั้น', unit:'กล่อง', good:10, damaged:0, returned:0, reason:'' },
    ]
  },
];
/** ────────────────────────────── */

export default function GrHistoryPage() {
  // ฟิลเตอร์
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('2025-08-01');
  const [to, setTo]     = useState('2025-08-31');
  const [onlyIssues, setOnlyIssues] = useState(false); // เฉพาะเคสมีชำรุด/ส่งคืน

  // แถวเปิดดูรายละเอียด
  const [openId, setOpenId] = useState(null);

  // คำนวณผลลัพธ์
  const data = useMemo(() => {
    const s = q.trim().toLowerCase();
    return GR_HISTORY.filter(r => {
      const passRange = inRange(r.date, from, to);
      const passSearch = !s || [r.id, r.po_no, r.supplier, r.receiver, r.doc_no].join(' ').toLowerCase().includes(s);
      const passIssue = !onlyIssues || (Number(r.damaged||0) > 0 || Number(r.returned||0) > 0);
      return passRange && passSearch && passIssue;
    });
  }, [q, from, to, onlyIssues]);

  const summary = useMemo(() => {
    const g = data.reduce((a,r)=>a + Number(r.good||0), 0);
    const d = data.reduce((a,r)=>a + Number(r.damaged||0), 0);
    const rv= data.reduce((a,r)=>a + Number(r.returned||0), 0);
    return `GR ${data.length} รายการ • Good ${g} • Damaged ${d} • Returned ${rv}`;
  }, [data]);

  // ส่งออก CSV (สรุปหัวแถว)
  const exportCsv = () => {
    if (data.length === 0) return alert('ไม่มีข้อมูลให้ส่งออก');
    const rows = data.map(r => ({
      GR: r.id, Date: r.date, PO: r.po_no, Supplier: r.supplier, Receiver: r.receiver,
      DocNo: r.doc_no || '', Good: r.good, Damaged: r.damaged, Returned: r.returned
    }));
    downloadCsv(rows, 'GR-summary.csv');
  };

  // ส่งออก CSV (รายละเอียดต่อบรรทัดสินค้า)
  const exportCsvLines = () => {
    const lines = data.flatMap(r => r.lines.map(l => ({
      GR: r.id, Date: r.date, PO: r.po_no, Supplier: r.supplier,
      Code: l.code, Name: l.name, Unit: l.unit,
      Good: l.good, Damaged: l.damaged, Returned: l.returned,
      Reason: l.reason || ''
    })));
    if (lines.length === 0) return alert('ไม่มีรายละเอียดรายการให้ส่งออก');
    downloadCsv(lines, 'GR-lines.csv');
  };

  return (
    <main style={wrap}>
      <h1 style={title}>ประวัติการรับของ (GR History)</h1>
      <p style={muted}>ค้นหา + กรองช่วงวันที่ และกดแถวเพื่อดูรายละเอียดแต่ละรอบ</p>

      {/* ฟิลเตอร์ */}
      <section style={card}>
        <div style={toolbar}>
          <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={input}/>
          <input type="date" value={to}   onChange={e=>setTo(e.target.value)} style={input}/>
          <input placeholder="ค้นหา GR/PO/ผู้ขาย/ผู้รับ/เลขเอกสาร" value={q} onChange={e=>setQ(e.target.value)} style={{...input, flex:'1 1 260px'}}/>
          <label style={{ display:'flex', alignItems:'center', gap:6 }}>
            <input type="checkbox" checked={onlyIssues} onChange={e=>setOnlyIssues(e.target.checked)}/>
            เฉพาะที่มีชำรุด/ส่งคืน
          </label>
          <div style={{flex:1}}/>
          <button style={ghostBtn} onClick={exportCsv} disabled={data.length===0}>CSV (สรุป)</button>
          <button style={ghostBtn} onClick={exportCsvLines} disabled={data.length===0}>CSV (รายการ)</button>
        </div>
        <div style={{marginTop:6, color:'#374151'}}>{summary}</div>
      </section>

      {/* ตาราง */}
      <section style={card}>
        <div style={{overflow:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', minWidth:980}}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>เลขที่ GR</th>
                <th style={th}>วันที่</th>
                <th style={th}>PO</th>
                <th style={th}>ผู้ขาย</th>
                <th style={th}>ผู้รับ</th>
                <th style={th}>เลขเอกสารขนส่ง</th>
                <th style={{...th, textAlign:'right'}}>Good</th>
                <th style={{...th, textAlign:'right'}}>Damaged</th>
                <th style={{...th, textAlign:'right'}}>Returned</th>
                <th style={th}>แนบไฟล์</th>
                <th style={th}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={11} style={{...td, textAlign:'center', color:'#6b7280'}}>ไม่มีข้อมูล</td></tr>
              ) : data.map(r => (
                <React.Fragment key={r.id}>
                  <tr>
                    <td style={tdMono}>{r.id}</td>
                    <td style={td}>{r.date}</td>
                    <td style={td}>{r.po_no}</td>
                    <td style={td}>{r.supplier}</td>
                    <td style={td}>{r.receiver}</td>
                    <td style={td}>{r.doc_no || '-'}</td>
                    <td style={{...td, textAlign:'right'}}>{r.good}</td>
                    <td style={{...td, textAlign:'right', color: r.damaged>0 ? '#b45309' : undefined }}>{r.damaged}</td>
                    <td style={{...td, textAlign:'right', color: r.returned>0 ? '#b91c1c' : undefined }}>{r.returned}</td>
                    <td style={td}>
                      {r.attachments?.length ? r.attachments.map((n,i)=>(<span key={i}>📎 {n}{i<r.attachments.length-1?', ':''}</span>)) : '-'}
                    </td>
                    <td style={td}>
                      <button style={linkBtn} onClick={()=>setOpenId(openId===r.id?null:r.id)}>
                        {openId === r.id ? 'ซ่อน' : 'ดูรายละเอียด'}
                      </button>
                    </td>
                  </tr>

                  {openId === r.id && (
                    <tr>
                      <td colSpan={11} style={{...td, background:'#f9fafb'}}>
                        <div style={{ overflow:'auto' }}>
                          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
                            <thead>
                              <tr style={theadRow}>
                                <th style={th}>รหัส</th>
                                <th style={th}>ชื่อสินค้า</th>
                                <th style={{...th, textAlign:'right'}}>Good</th>
                                <th style={{...th, textAlign:'right'}}>Damaged</th>
                                <th style={{...th, textAlign:'right'}}>Returned</th>
                                <th style={th}>เหตุผล</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.lines.map(l => (
                                <tr key={l.code}>
                                  <td style={tdMono}>{l.code}</td>
                                  <td style={td}>{l.name}</td>
                                  <td style={{...td, textAlign:'right'}}>{l.good}</td>
                                  <td style={{...td, textAlign:'right', color: l.damaged>0 ? '#b45309' : undefined }}>{l.damaged}</td>
                                  <td style={{...td, textAlign:'right', color: l.returned>0 ? '#b91c1c' : undefined }}>{l.returned}</td>
                                  <td style={td}>{l.reason || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/** ───── helpers ───── */
function inRange(d, from, to) {
  const t = new Date(d).getTime();
  const f = from ? new Date(from).getTime() : -Infinity;
  const e = to ? new Date(to).getTime()   :  Infinity;
  return t >= f && t <= e;
}
function downloadCsv(arr, filename) {
  const header = Object.keys(arr[0] || {});
  const csv = [
    header.join(','),
    ...arr.map(r => header.map(h => `"${String(r[h] ?? '').replace(/"/g,'""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** ───── styles ───── */
const wrap   = { padding:20, background:'#f9fafb', minHeight:'100vh' };
const title  = { fontSize:'1.4rem', fontWeight:700, margin:0 };
const muted  = { color:'#6b7280', marginBottom:12 };
const card   = { background:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', marginBottom:12 };
const toolbar= { display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' };
const input  = { padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 };
const ghostBtn = { background:'#fff', color:'#111827', border:'1px solid #d1d5db', padding:'8px 10px', borderRadius:8, cursor:'pointer' };
const table  = { width:'100%', borderCollapse:'collapse', minWidth:900 };
const theadRow = { background:'#f3f4f6' };
const th     = { textAlign:'left', padding:10, borderBottom:'1px solid #e5e7eb' };
const td     = { padding:10, borderBottom:'1px solid #f1f5f9' };
const tdMono = { ...td, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
const linkBtn= { background:'transparent', color:'#2563eb', border:'none', cursor:'pointer', padding:0 };
