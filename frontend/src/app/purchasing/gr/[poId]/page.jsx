'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

/** ─────── Mock PO สำหรับอ้างอิง (ในไฟล์นี้) ─────── */
const PO_FOR_GR = {
  'PO-2025-001': {
    po_no: 'PO-2025-001',
    date: '2025-08-21',
    supplier: { name: 'บจก.เมดิคอลพลัส' },
    items: [
      { code:'MED001', name:'ยาพาราเซตามอล 500mg', unit:'กล่อง', qty_ordered:50, qty_received_before:0 },
    ],
    status: 'approved',
  },
  'PO-2025-002': {
    po_no: 'PO-2025-002',
    date: '2025-08-22',
    supplier: { name: 'หจก.สุขภาพดี' },
    items: [
      { code:'MED010', name:'แอลกอฮอล์ 70%', unit:'ขวด',  qty_ordered:30, qty_received_before:0 },
      { code:'GEN005', name:'กระดาษทิชชู่ 2 ชั้น', unit:'แพ็ค', qty_ordered:20, qty_received_before:5 }, // เคยรับไปแล้ว 5
    ],
    status: 'approved',
  },
};
/** ───────────────────────────────────────────── */

export default function GrFormPage() {
  const { poId } = useParams(); // เช่น "PO-2025-001"
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState(null);

  // ฟอร์มหัว GR
  const [grDate, setGrDate] = useState(() => new Date().toISOString().slice(0,10));
  const [receiver, setReceiver] = useState('เจ้าหน้าที่คลัง');
  const [docNo, setDocNo] = useState('');
  const [attachments, setAttachments] = useState([]); // รายชื่อไฟล์ (mock)
  const [shortClose, setShortClose] = useState(false);
  const [shortCloseReason, setShortCloseReason] = useState('');

  // ปริมาณต่อบรรทัด
  const [rows, setRows] = useState([]);

  // สถานะแก้ไข เพื่อเตือนออกจากหน้า
  const dirtyRef = useRef(false);
  const setDirty = () => { dirtyRef.current = true; };

  // โหลดข้อมูล + กู้ร่างถ้ามี
  useEffect(() => {
    const t = setTimeout(() => {
      const data = PO_FOR_GR[poId] || null;
      setPo(data);

      // default rows
      let baseRows = [];
      if (data) {
        baseRows = data.items.map(x => {
          const outstanding = Math.max(0, (x.qty_ordered ?? 0) - (x.qty_received_before ?? 0));
          return {
            code: x.code,
            name: x.name,
            unit: x.unit,
            qty_ordered: x.qty_ordered,
            qty_received_before: x.qty_received_before || 0,
            // เวอร์ชันอัปเกรด: แยก 3 ช่อง
            qty_good_now: 0,
            qty_damaged_now: 0,
            qty_return_now: 0,
            reason: '',         // เหตุผลกรณีชำรุด/ส่งคืน
            error: '',          // ข้อความ error ต่อบรรทัด
            outstanding,        // เหลือคงค้าง ณ ตอนโหลด
          };
        });
      }

      // กู้ Draft ถ้ามี
      const draftKey = draftStorageKey(poId);
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const d = JSON.parse(saved);
          if (d?.rows?.length) baseRows = d.rows;
          if (d?.grDate) setGrDate(d.grDate);
          if (d?.receiver) setReceiver(d.receiver);
          if (d?.docNo) setDocNo(d.docNo);
          if (Array.isArray(d.attachments)) setAttachments(d.attachments);
          if (typeof d.shortClose === 'boolean') setShortClose(d.shortClose);
          if (typeof d.shortCloseReason === 'string') setShortCloseReason(d.shortCloseReason);
        } catch (_) {}
      }

      setRows(baseRows);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [poId]);

  // เตือนออกจากหน้าเมื่อยังไม่บันทึก
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // สรุปผลรวม
  const totals = useMemo(() => {
    const ordered = rows.reduce((a,r)=>a + num(r.qty_ordered), 0);
    const before  = rows.reduce((a,r)=>a + num(r.qty_received_before), 0);
    const goodNow = rows.reduce((a,r)=>a + num(r.qty_good_now), 0);
    const dmgNow  = rows.reduce((a,r)=>a + num(r.qty_damaged_now), 0);
    const rtvNow  = rows.reduce((a,r)=>a + num(r.qty_return_now), 0);
    const outstanding = ordered - before - goodNow - dmgNow - rtvNow;
    return { ordered, before, goodNow, dmgNow, rtvNow, outstanding };
  }, [rows]);

  const editable = po?.status === 'approved';

  // ── Helpers
  function draftStorageKey(id) { return `gr_draft_${id}`; }
  function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  const clamp = (val, min, max) => Math.min(Math.max(num(val), min), max);

  // ตรวจค่าบรรทัด (รวมแล้วต้องไม่เกิน outstanding ของบรรทัด)
  const validateRow = (r) => {
    const max = Math.max(0, r.qty_ordered - r.qty_received_before);
    const sum = num(r.qty_good_now) + num(r.qty_damaged_now) + num(r.qty_return_now);
    if (sum > max) return `ปริมาณรวม (${sum}) เกินคงเหลือ (${max})`;
    if ((num(r.qty_damaged_now) > 0 || num(r.qty_return_now) > 0) && !r.reason?.trim()) {
      return 'กรุณาระบุเหตุผลเมื่อมี ชำรุด/ส่งคืน';
    }
    return '';
  };

  // ตั้งค่า 3 ช่องกรอก
  const setGoodQty = (idx, val) => {
    setDirty();
    setRows(prev => {
      const r = prev[idx];
      const max = Math.max(0, r.qty_ordered - r.qty_received_before);
      const other = num(r.qty_damaged_now) + num(r.qty_return_now);
      const safe = clamp(val, 0, Math.max(0, max - other));
      const next = [...prev];
      next[idx] = { ...r, qty_good_now: safe };
      next[idx].error = validateRow(next[idx]);
      return next;
    });
  };
  const setDamagedQty = (idx, val) => {
    setDirty();
    setRows(prev => {
      const r = prev[idx];
      const max = Math.max(0, r.qty_ordered - r.qty_received_before);
      const other = num(r.qty_good_now) + num(r.qty_return_now);
      const safe = clamp(val, 0, Math.max(0, max - other));
      const next = [...prev];
      next[idx] = { ...r, qty_damaged_now: safe };
      next[idx].error = validateRow(next[idx]);
      return next;
    });
  };
  const setReturnQty = (idx, val) => {
    setDirty();
    setRows(prev => {
      const r = prev[idx];
      const max = Math.max(0, r.qty_ordered - r.qty_received_before);
      const other = num(r.qty_good_now) + num(r.qty_damaged_now);
      const safe = clamp(val, 0, Math.max(0, max - other));
      const next = [...prev];
      next[idx] = { ...r, qty_return_now: safe };
      next[idx].error = validateRow(next[idx]);
      return next;
    });
  };
  const setReason = (idx, val) => {
    setDirty();
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...prev[idx], reason: val };
      next[idx].error = validateRow(next[idx]);
      return next;
    });
  };

  // ปุ่มช่วย
  const receiveAllRemaining = () => {
    if (!editable) return;
    setDirty();
    setRows(prev => prev.map(r => {
      const max = Math.max(0, r.qty_ordered - r.qty_received_before);
      const next = { ...r, qty_good_now: max, qty_damaged_now: 0, qty_return_now: 0 };
      next.error = '';
      return next;
    }));
  };
  const clearThisRound = () => {
    setDirty();
    setRows(prev => prev.map(r => ({ ...r, qty_good_now: 0, qty_damaged_now: 0, qty_return_now: 0, error: '' })));
  };

  // Draft
  const saveDraft = () => {
    const draft = {
      grDate, receiver, docNo, rows, attachments, shortClose, shortCloseReason,
      saved_at: new Date().toISOString(),
    };
    localStorage.setItem(draftStorageKey(poId), JSON.stringify(draft));
    dirtyRef.current = false;
    alert('บันทึกฉบับร่างแล้ว');
  };
  const clearDraft = () => {
    localStorage.removeItem(draftStorageKey(poId));
    alert('ลบฉบับร่างแล้ว');
  };

  // แนบไฟล์ (mock เก็บชื่อไฟล์)
  const onAttachFiles = (e) => {
    setDirty();
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachments(prev => [...prev, ...files.map(f => f.name)]);
    e.target.value = ''; // reset
  };
  const removeAttachment = (idx) => {
    setDirty();
    setAttachments(prev => prev.filter((_,i)=>i!==idx));
  };

  // Submit
  const submitGr = () => {
    if (!po) return;
    if (po.status !== 'approved') return alert('PO นี้ยังไม่พร้อมรับของ (ไม่ใช่สถานะ approved)');
    if (!grDate) return alert('กรุณาเลือกวันที่รับของ');
    if (!receiver.trim()) return alert('กรุณากรอกชื่อผู้รับ');

    const hasAny = rows.some(r => (num(r.qty_good_now) + num(r.qty_damaged_now) + num(r.qty_return_now)) > 0);
    if (!hasAny) return alert('ยังไม่มีปริมาณรับ/ชำรุด/ส่งคืน');

    // ตรวจรายบรรทัด
    const invalid = rows.find(r => validateRow(r));
    if (invalid) return alert(`พบข้อผิดพลาด: ${invalid.error}`);

    // ถ้ายังเหลือคงค้าง และติ๊ก short close ต้องมีเหตุผล
    if (totals.outstanding > 0 && shortClose && !shortCloseReason.trim()) {
      return alert('กรุณาระบุเหตุผลการปิดยอดที่เหลือ (Short Close)');
    }

    const payload = {
      po_no: po.po_no,
      header: { date: grDate, receiver, doc_no: docNo, attachments },
      lines: rows.map(r => ({
        code: r.code,
        good_qty: num(r.qty_good_now),
        damaged_qty: num(r.qty_damaged_now),
        return_qty: num(r.qty_return_now),
        reason: r.reason || '',
      })),
      short_close: shortClose ? { enabled: true, reason: shortCloseReason } : { enabled: false },
    };

    // (Mock) สรุป
    const totalGood = payload.lines.reduce((a,r)=>a+r.good_qty,0);
    const totalDmg  = payload.lines.reduce((a,r)=>a+r.damaged_qty,0);
    const totalRtv  = payload.lines.reduce((a,r)=>a+r.return_qty,0);
    const willComplete = totals.outstanding === 0 || (shortClose && totals.outstanding > 0);

    alert(`(Mock) บันทึก GR สำเร็จ
PO: ${payload.po_no}
รับดี: ${totalGood}
ชำรุด: ${totalDmg}
ส่งคืน: ${totalRtv}
สถานะ PO หลังบันทึก: ${willComplete ? 'completed' : 'partially_received'}`);

    // ของจริง:
    // 1) POST /gr  (good → +stock, damaged → quarantine, return → สร้าง/รอ RTV)
    // 2) ถ้า return_qty > 0 → POST /rtv สร้างใบส่งคืนอ้างอิง GR นี้
    // 3) อัปเดตยอดสะสมใน PO + สถานะ (partially_received/completed/short_closed)
    // 4) บันทึกไฟล์แนบ
    localStorage.removeItem(draftStorageKey(poId));
    dirtyRef.current = false;
    router.push('/purchasing/gr');
  };

  if (loading) {
    return <main style={wrap}><div style={empty}>Loading...</div></main>;
  }

  if (!po) {
    return (
      <main style={wrap}>
        <div style={card}>
          <h1 style={title}>ไม่พบ PO</h1>
          <p style={{ color:'#6b7280' }}>PO: {poId}</p>
          <button style={primaryBtn} onClick={()=>router.push('/purchasing/gr')}>← กลับหน้ารายการ GR</button>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <section style={card}>
        <div style={headRow}>
          <h1 style={title}>บันทึกรับของ (GR)</h1>
          <div style={{ color:'#6b7280' }}>
            PO: {po.po_no} • วันที่ PO: {po.date} • ผู้ขาย: {po.supplier.name} • สถานะ PO: {po.status}
          </div>
        </div>

        {/* ฟอร์มหัว */}
        <div style={grid3}>
          <div>
            <label style={label}>วันที่รับ</label>
            <input disabled={!editable} type="date" value={grDate} onChange={e=>{setGrDate(e.target.value); setDirty();}} style={input} />
          </div>
          <div>
            <label style={label}>ผู้รับ</label>
            <input disabled={!editable} value={receiver} onChange={e=>{setReceiver(e.target.value); setDirty();}} style={input} />
          </div>
          <div>
            <label style={label}>เลขที่เอกสารขนส่ง</label>
            <input disabled={!editable} value={docNo} onChange={e=>{setDocNo(e.target.value); setDirty();}} style={input} placeholder="(เช่น INV/DO เลขที่)"/>
          </div>
        </div>

        {/* แนบไฟล์ (mock เก็บชื่อไฟล์) */}
        <div style={{ marginTop: 12 }}>
          <label style={label}>แนบไฟล์ (ใบส่งของ/DO, ใบกำกับภาษี ฯลฯ)</label>
          <input disabled={!editable} type="file" multiple onChange={onAttachFiles} />
          {!!attachments.length && (
            <ul style={{ marginTop:8 }}>
              {attachments.map((n,i)=>(
                <li key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span>📎 {n}</span>
                  {editable && <button style={linkBtn} onClick={()=>removeAttachment(i)}>ลบ</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ตารางรายการรับของ */}
      <section style={card}>
        <div style={rowBetween}>
          <h3 style={h3}>รายการตาม PO</h3>
          <div style={{ display:'flex', gap:8 }}>
            <button disabled={!editable} style={ghostBtn} onClick={receiveAllRemaining}>รับทั้งหมดที่เหลือ</button>
            <button disabled={!editable} style={ghostBtn} onClick={clearThisRound}>ล้างค่ารอบนี้</button>
          </div>
        </div>

        <div style={{ overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1100 }}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>รหัส</th>
                <th style={th}>ชื่อสินค้า</th>
                <th style={{ ...th, textAlign:'right' }}>จำนวนสั่ง</th>
                <th style={{ ...th, textAlign:'right' }}>รับแล้ว</th>
                <th style={{ ...th, textAlign:'right' }}>ของดี (รับรอบนี้)</th>
                <th style={{ ...th, textAlign:'right' }}>ชำรุด</th>
                <th style={{ ...th, textAlign:'right' }}>ส่งคืน</th>
                <th style={th}>หน่วย</th>
                <th style={th}>เหตุผล (ถ้ามี)</th>
                <th style={{ ...th, textAlign:'right' }}>คงเหลือใน PO</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const max = Math.max(0, r.qty_ordered - r.qty_received_before);
                const sum = num(r.qty_good_now) + num(r.qty_damaged_now) + num(r.qty_return_now);
                const remaining = Math.max(0, max - sum);
                const rowError = r.error;

                return (
                  <tr key={r.code} style={rowError ? { background:'#fff7ed' } : undefined}>
                    <td style={tdMono}>{r.code}</td>
                    <td style={td}>{r.name}</td>
                    <td style={{ ...td, textAlign:'right' }}>{r.qty_ordered}</td>
                    <td style={{ ...td, textAlign:'right' }}>{r.qty_received_before}</td>
                    <td style={{ ...td, textAlign:'right' }}>
                      <input
                        disabled={!editable}
                        type="number"
                        min="0"
                        max={max}
                        value={r.qty_good_now}
                        onChange={(e)=>setGoodQty(idx, e.target.value)}
                        onFocus={setDirty}
                        style={inputSm}
                      />
                    </td>
                    <td style={{ ...td, textAlign:'right' }}>
                      <input
                        disabled={!editable}
                        type="number"
                        min="0"
                        max={max}
                        value={r.qty_damaged_now}
                        onChange={(e)=>setDamagedQty(idx, e.target.value)}
                        onFocus={setDirty}
                        style={inputSm}
                      />
                    </td>
                    <td style={{ ...td, textAlign:'right' }}>
                      <input
                        disabled={!editable}
                        type="number"
                        min="0"
                        max={max}
                        value={r.qty_return_now}
                        onChange={(e)=>setReturnQty(idx, e.target.value)}
                        onFocus={setDirty}
                        style={inputSm}
                      />
                    </td>
                    <td style={td}>{r.unit}</td>
                    <td style={td}>
                      <input
                        disabled={!editable}
                        placeholder="เช่น ชำรุด, ผิดสเปค, ใกล้หมดอายุ"
                        value={r.reason}
                        onChange={(e)=>setReason(idx, e.target.value)}
                        style={inputSmWide}
                      />
                      {rowError && <div style={{ color:'#b45309', fontSize:12, marginTop:4 }}>{rowError}</div>}
                    </td>
                    <td style={{ ...td, textAlign:'right', color: remaining === 0 ? '#14532d' : '#111827' }}>
                      {remaining}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td style={{ ...td, textAlign:'center', color:'#6b7280' }} colSpan={10}>ไม่มีรายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* สรุปรวม */}
        <div style={{ display:'grid', justifyContent:'end', gap:4, marginTop:10, color:'#374151' }}>
          <div><b>รวมจำนวนสั่ง:</b> {totals.ordered}</div>
          <div><b>รวมรับแล้วก่อนหน้า:</b> {totals.before}</div>
          <div><b>รับรอบนี้ (ของดี):</b> {totals.goodNow}</div>
          <div><b>ชำรุดรอบนี้:</b> {totals.dmgNow}</div>
          <div><b>ส่งคืนรอบนี้:</b> {totals.rtvNow}</div>
          <div style={{ color: totals.outstanding < 0 ? '#b91c1c' : '#111827' }}>
            <b>คงเหลือหลังรับ: {Math.max(0, totals.outstanding)}</b>
          </div>
        </div>

        {/* Short Close */}
        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px dashed #e5e7eb', display:'grid', gap:8 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox" disabled={!editable} checked={shortClose} onChange={e=>{ setShortClose(e.target.checked); setDirty(); }} />
            ปิดยอดที่เหลือ (Short Close) — ใช้เมื่อผู้ขายไม่ชดเชยของที่ขาด
          </label>
          {shortClose && (
            <input
              disabled={!editable}
              value={shortCloseReason}
              onChange={e=>{ setShortCloseReason(e.target.value); setDirty(); }}
              placeholder="เหตุผลการปิดยอดที่เหลือ"
              style={input}
            />
          )}
        </div>

        {/* ปุ่ม */}
        <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:8 }}>
            <button style={ghostBtn} onClick={saveDraft} disabled={!editable}>บันทึกร่าง</button>
            <button style={ghostBtn} onClick={clearDraft}>ลบฉบับร่าง</button>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={darkBtn} onClick={()=>router.push('/purchasing/gr')}>ยกเลิก</button>
            <button style={primaryBtn} onClick={submitGr} disabled={!editable}>บันทึกรับของ</button>
          </div>
        </div>
      </section>
    </main>
  );
}

/** styles */
const wrap    = { padding:20, background:'#f9fafb', minHeight:'100vh' };
const card    = { background:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', marginBottom:16 };
const title   = { fontSize:'1.4rem', fontWeight:700, margin:0 };
const headRow = { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 };
const h3      = { margin:'0 0 8px 0' };
const label   = { display:'block', marginBottom:6, color:'#374151' };
const input   = { width:'100%', padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 };
const inputSm = { width:120, padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:6 };
const inputSmWide = { width:260, padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:6 };
const grid3   = { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginTop:12 };
const rowBetween = { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 };
const empty   = { padding:16, textAlign:'center', color:'#6b7280', background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' };
const primaryBtn = { background:'#2563eb', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const darkBtn    = { background:'#111827', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const ghostBtn   = { background:'#fff', color:'#111827', border:'1px solid #d1d5db', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const linkBtn    = { background:'transparent', color:'#2563eb', border:'none', cursor:'pointer', padding:0 };
const theadRow = { background:'#f3f4f6' };
const th      = { textAlign:'left', padding:10, borderBottom:'1px solid #e5e7eb' };
const td      = { padding:10, borderBottom:'1px solid #f1f5f9', verticalAlign:'top' };
const tdMono  = { ...td, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
