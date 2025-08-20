'use client';

import { useEffect, useMemo, useState } from 'react';

/** ───── MOCK ข้อมูลในไฟล์เดียว ───── */
const INIT = [
  { id:'SUP-001', name:'หจก.สุขภาพดี',   phone:'02-123-4567', email:'sale@sukkhap.org',     address:'เชียงใหม่',   tax_id:'0105551234567', payment_terms:'เครดิต 30 วัน', is_active:true },
  { id:'SUP-002', name:'บจก.เมดิคอลพลัส', phone:'02-987-6543', email:'contact@medplus.co.th', address:'กรุงเทพฯ',   tax_id:'0105537654321', payment_terms:'เครดิต 15 วัน', is_active:true },
  { id:'SUP-003', name:'บจก.ฟาร์มาพลัส',  phone:'02-111-2222', email:'info@pharmaplus.co.th', address:'นนทบุรี',    tax_id:'0105559999999', payment_terms:'เงินสด',        is_active:false },
];
/** ─────────────────────────────── */

export default function SuppliersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all'); // all | active | inactive

  // Modal state (โหมดเดียว หน้าตาเดียว แต่ toggle disabled)
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('view'); // view | edit | create
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const t = setTimeout(() => { setRows(INIT); setLoading(false); }, 200);
    return () => clearTimeout(t);
  }, []);

  // ค้นหา/กรอง
  const filtered = useMemo(() => {
    let data = [...rows];
    if (status !== 'all') data = data.filter(r => status === 'active' ? r.is_active : !r.is_active);
    const s = q.trim().toLowerCase();
    if (s) {
      data = data.filter(r =>
        r.id.toLowerCase().includes(s) ||
        r.name.toLowerCase().includes(s) ||
        (r.phone||'').toLowerCase().includes(s) ||
        (r.email||'').toLowerCase().includes(s) ||
        (r.tax_id||'').toLowerCase().includes(s)
      );
    }
    return data;
  }, [rows, q, status]);

  // Helpers
  function blank() {
    return { id:'', name:'', phone:'', email:'', address:'', tax_id:'', payment_terms:'เครดิต 30 วัน', is_active:true };
  }
  function genId() {
    const nums = rows.map(r => Number((r.id||'').replace('SUP-',''))).filter(n=>Number.isFinite(n));
    const next = (nums.length ? Math.max(...nums)+1 : 1).toString().padStart(3,'0');
    return `SUP-${next}`;
  }

  const openCreate = () => {
    setMode('create');
    setForm({ ...blank(), id: genId() });
    setErrors({});
    setOpen(true);
  };
  const openView = (r) => {
    setMode('view');
    setForm({ ...r });
    setErrors({});
    setOpen(true);
  };
  const openEdit = (r) => {
    setMode('edit');
    setForm({ ...r });
    setErrors({});
    setOpen(true);
  };
  const closeModal = () => {
    setOpen(false);
    setMode('view');
    setForm(blank());
    setErrors({});
  };

  const validate = (payload, isEdit) => {
    const e = {};
    if (!payload.id.trim()) e.id = 'กรุณารหัสผู้ขาย';
    if (!payload.name.trim()) e.name = 'กรุณาชื่อผู้ขาย';
    if (payload.email && !/^\S+@\S+\.\S+$/.test(payload.email)) e.email = 'อีเมลไม่ถูกต้อง';
    if (!isEdit && mode === 'create') {
      if (rows.some(r => r.id === payload.id)) e.id = 'รหัสผู้ขายซ้ำ';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    const isEdit = mode === 'edit';
    if (!validate(form, isEdit)) return;

    if (mode === 'create') {
      setRows(prev => [{ ...form }, ...prev]);
      alert('เพิ่มผู้ขายแล้ว');
      closeModal();
      return;
    }
    if (mode === 'edit') {
      setRows(prev => prev.map(r => r.id === form.id ? { ...form } : r));
      alert('บันทึกการแก้ไขแล้ว');
      // หลังบันทึก กลับไปโหมด view แต่ยังคงเปิด popup เดิม (หน้าตาเหมือนเดิม)
      setMode('view');
      setErrors({});
      return;
    }
  };

  const toggleActive = (id) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
  };

  const remove = (id) => {
    if (!confirm('ยืนยันลบผู้ขายนี้?')) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const isReadOnly = mode === 'view'; // ใช้ตัวนี้คุม disabled ทั้งฟอร์ม

  return (
    <main style={wrap}>
      <h1 style={title}>ผู้ขายทั้งหมด (Suppliers)</h1>
      <p style={muted}>หน้ารวมผู้ขาย ค้นหา/เพิ่ม/แก้ไข และดูรายละเอียดผ่าน Popup เดียวกัน</p>

      {/* Toolbar */}
      <div style={toolbar}>
        <input
          placeholder="ค้นหา รหัส/ชื่อ/โทร/อีเมล/เลขภาษี"
          value={q}
          onChange={(e)=>setQ(e.target.value)}
          style={{...input, flex:'1 1 260px'}}
        />
        <select value={status} onChange={e=>setStatus(e.target.value)} style={input}>
          <option value="all">ทั้งหมด</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
        <div style={{flex:1}}/>
        <button style={ghostBtn} onClick={openCreate}>+ เพิ่มผู้ขาย</button>
      </div>

      {/* Table */}
      <section style={card}>
        <div style={{ overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1000 }}>
            <thead>
              <tr style={theadRow}>
                <th style={th}>รหัส</th>
                <th style={th}>ชื่อ</th>
                <th style={th}>โทร</th>
                <th style={th}>อีเมล</th>
                <th style={th}>เครดิต</th>
                <th style={th}>สถานะ</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{...td, textAlign:'center'}}>Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{...td, textAlign:'center', color:'#6b7280'}}>ไม่พบรายการ</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td style={tdMono}>{r.id}</td>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.phone || '-'}</td>
                  <td style={td}>{r.email || '-'}</td>
                  <td style={td}>{r.payment_terms}</td>
                  <td style={td}>{r.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</td>
                  <td style={td}>
                    <button style={linkBtn} onClick={()=>openView(r)}>ดู</button>
                    <span> · </span>
                    <button style={linkBtn} onClick={()=>openEdit(r)}>แก้ไข</button>
                    <span> · </span>
                    <button style={linkBtn} onClick={()=>toggleActive(r.id)}>{r.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}</button>
                    <span> · </span>
                    <button style={{...linkBtn, color:'#b91c1c'}} onClick={()=>remove(r.id)}>ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: ใช้ฟอร์มชุดเดียว ดู/แก้ไข/เพิ่ม */}
      {open && (
        <div style={modalOverlay} onClick={(e)=>{ if (e.target === e.currentTarget) closeModal(); }}>
          <div style={modal}>
            <div style={modalHeader}>
              <h3 style={h3}>
                {mode === 'create' ? 'เพิ่มผู้ขาย' : mode === 'edit' ? 'แก้ไขผู้ขาย' : 'รายละเอียดผู้ขาย'}
              </h3>
              <button style={linkBtn} onClick={closeModal}>✕</button>
            </div>

            <div style={grid2}>
              {/* รหัส: แก้ได้เฉพาะตอน create */}
              <Input label="รหัสผู้ขาย" value={form.id} onChange={v=>setForm({...form, id:v})}
                     disabled={mode!=='create'} error={!isReadOnly ? errors.id : ''} />

              <Input label="ชื่อผู้ขาย" value={form.name} onChange={v=>setForm({...form, name:v})}
                     disabled={isReadOnly} error={!isReadOnly ? errors.name : ''} />

              <Input label="เบอร์โทร" value={form.phone} onChange={v=>setForm({...form, phone:v})}
                     disabled={isReadOnly} />

              <Input label="อีเมล" value={form.email} onChange={v=>setForm({...form, email:v})}
                     disabled={isReadOnly} error={!isReadOnly ? errors.email : ''} />

              <Input label="เลขผู้เสียภาษี" value={form.tax_id} onChange={v=>setForm({...form, tax_id:v})}
                     disabled={isReadOnly} />

              <Input label="เครดิต" value={form.payment_terms} onChange={v=>setForm({...form, payment_terms:v})}
                     disabled={isReadOnly} />

              <Input label="ที่อยู่" value={form.address} onChange={v=>setForm({...form, address:v})}
                     disabled={isReadOnly} full />

              <div>
                <label style={labelStyle}>สถานะ</label>
                <select style={{...input, ...(isReadOnly?inputRO:{})}}
                        value={form.is_active ? '1':'0'}
                        onChange={e=>setForm({...form, is_active: e.target.value==='1'})}
                        disabled={isReadOnly}>
                  <option value="1">ใช้งาน</option>
                  <option value="0">ปิดใช้งาน</option>
                </select>
              </div>
            </div>

            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:12, flexWrap:'wrap' }}>
              {mode === 'view' ? (
                <>
                  <button style={ghostBtn} onClick={()=>setMode('edit')}>แก้ไข</button>
                  <button style={primaryBtn} onClick={closeModal}>ปิด</button>
                </>
              ) : mode === 'edit' ? (
                <>
                  <button style={darkBtn} onClick={()=>{ setMode('view'); setErrors({}); }}>ยกเลิก</button>
                  <button style={primaryBtn} onClick={save}>บันทึก</button>
                </>
              ) : (
                // create
                <>
                  <button style={darkBtn} onClick={closeModal}>ยกเลิก</button>
                  <button style={primaryBtn} onClick={save}>บันทึก</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** ───── Components ───── */
function Input({ label, value, onChange, disabled, error, full }) {
  return (
    <div style={full ? { gridColumn:'1 / span 2' } : null}>
      <label style={labelStyle}>{label}</label>
      <input
        style={{
          ...input,
          ...(disabled ? inputRO : {}),
          borderColor: error ? '#ef4444' : (disabled ? '#e5e7eb' : '#e5e7eb')
        }}
        value={value || ''}
        onChange={e=>onChange(e.target.value)}
        disabled={disabled}
      />
      {error && <div style={{ color:'#b91c1c', fontSize:12, marginTop:4 }}>{error}</div>}
    </div>
  );
}

/** ───── styles ───── */
const wrap   = { padding:20, background:'#f9fafb', minHeight:'100vh', position:'relative' };
const title  = { fontSize:'1.4rem', fontWeight:700, margin:0 };
const muted  = { color:'#6b7280', marginBottom:12 };
const toolbar= { display:'flex', gap:10, alignItems:'center', marginBottom:12, flexWrap:'wrap' };
const input  = { padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8, width:'100%' };
const inputRO= { background:'#f9fafb', color:'#6b7280', pointerEvents:'none' }; // read-only look
const card   = { background:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' };
const h3     = { margin:'0 0 8px 0' };
const labelStyle = { display:'block', marginBottom:6, color:'#374151' };
const primaryBtn = { background:'#2563eb', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const darkBtn    = { background:'#111827', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const ghostBtn   = { background:'#fff', color:'#111827', border:'1px solid #d1d5db', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const linkBtn    = { background:'transparent', color:'#2563eb', border:'none', cursor:'pointer', padding:0 };
const theadRow   = { background:'#f3f4f6' };
const th         = { textAlign:'left', padding:10, borderBottom:'1px solid #e5e7eb' };
const td         = { padding:10, borderBottom:'1px solid #f1f5f9' };
const tdMono     = { ...td, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };

/* Modal */
const modalOverlay = {
  position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
  display:'grid', placeItems:'center', padding:16, zIndex:100
};
const modal = {
  width:'min(760px, 100%)',
  background:'#fff', borderRadius:12, boxShadow:'0 10px 30px rgba(0,0,0,0.2)',
  padding:16, display:'grid', gap:12, maxHeight:'90vh', overflow:'auto'
};
const modalHeader = { display:'flex', justifyContent:'space-between', alignItems:'center' };
const grid2  = { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 };
