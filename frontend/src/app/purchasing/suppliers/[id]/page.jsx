'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/** Mock detail/activities ในไฟล์นี้ */
const SUPPLIERS = {
  'SUP-001': {
    id:'SUP-001', name:'หจก.สุขภาพดี', phone:'02-123-4567', email:'sale@sukkhap.org',
    address:'123 ถ.สันกำแพง เชียงใหม่', tax_id:'0105551234567', payment_terms:'เครดิต 30 วัน', is_active:true,
    contacts:[ {name:'คุณเอ', role:'Sales', phone:'081-000-0001', email:'ae@sukkhap.org'} ],
    notes:'ผู้ขายหลักสำหรับสินค้ากลุ่มยา OTC',
  },
  'SUP-002': {
    id:'SUP-002', name:'บจก.เมดิคอลพลัส', phone:'02-987-6543', email:'contact@medplus.co.th',
    address:'99 ถ.พหลโยธิน กรุงเทพฯ', tax_id:'0105537654321', payment_terms:'เครดิต 15 วัน', is_active:true,
    contacts:[ {name:'คุณบี', role:'Account', phone:'089-111-2222', email:'b@medplus.co.th'} ],
    notes:'',
  },
};

const ACTIVITY = {
  'SUP-001': {
    po_recent: [
      { po_no:'PO-2025-010', date:'2025-08-21', total: 18500.00, status:'completed' },
      { po_no:'PO-2025-006', date:'2025-08-15', total:  9200.00, status:'completed' },
    ],
    rfq_recent: [
      { rfq_no:'RFQ-2025-021', date:'2025-08-10', status:'closed' },
    ],
    gr_recent: [
      { gr_no:'GR-2025-012', date:'2025-08-22', good:120, damaged:2, returned:0 },
    ]
  },
  'SUP-002': {
    po_recent: [
      { po_no:'PO-2025-001', date:'2025-08-21', total: 9800.00, status:'approved' },
    ],
    rfq_recent: [],
    gr_recent: [],
  }
};

export default function SupplierDetailPage() {
  const { id } = useParams(); // SUP-001
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // edit inline state
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const d = SUPPLIERS[id] || null;
      setData(d);
      setForm(d ? {...d} : null);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [id]);

  const activities = useMemo(() => ACTIVITY[id] || { po_recent:[], rfq_recent:[], gr_recent:[] }, [id]);

  const save = () => {
    if (!form.name.trim()) return alert('กรุณากรอกชื่อผู้ขาย');
    if (!form.id.trim())   return alert('รหัสว่างไม่ได้');
    setData({...form});
    setEditing(false);
    alert('บันทึกแล้ว (mock)');
  };

  if (loading) return <main style={wrap}><div style={empty}>Loading...</div></main>;

  if (!data) {
    return (
      <main style={wrap}>
        <div style={card}>
          <h1 style={title}>ไม่พบผู้ขาย</h1>
          <p style={{ color:'#6b7280' }}>รหัส: {id}</p>
          <button style={primaryBtn} onClick={() => router.push('/purchasing/suppliers')}>← กลับหน้ารวมผู้ขาย</button>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      {/* Header */}
      <section style={card}>
        <div style={rowBetween}>
          <div>
            <h1 style={title}>{data.name}</h1>
            <div style={{ color:'#6b7280' }}>รหัส: {data.id} • สถานะ: {data.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {!editing && <button style={ghostBtn} onClick={()=>setEditing(true)}>แก้ไข</button>}
            {editing && (
              <>
                <button style={darkBtn} onClick={()=>{ setForm({...data}); setEditing(false); }}>ยกเลิก</button>
                <button style={primaryBtn} onClick={save}>บันทึก</button>
              </>
            )}
            <button style={ghostBtn} onClick={()=>router.push('/purchasing/suppliers')}>กลับรายการ</button>
          </div>
        </div>

        {/* ข้อมูลหลัก */}
        {!editing ? (
          <div style={grid2}>
            <Field label="รหัสผู้ขาย" value={data.id}/>
            <Field label="เลขผู้เสียภาษี" value={data.tax_id || '-'}/>
            <Field label="อีเมล" value={data.email || '-'}/>
            <Field label="เบอร์โทร" value={data.phone || '-'}/>
            <Field label="เครดิต" value={data.payment_terms || '-'}/>
            <Field label="ที่อยู่" value={data.address || '-'} full />
            <Field label="หมายเหตุ" value={data.notes || '-'} full />
          </div>
        ) : (
          <div style={grid2}>
            <Input label="รหัสผู้ขาย" value={form.id} onChange={v=>setForm({...form, id:v})} disabled />
            <Input label="เลขผู้เสียภาษี" value={form.tax_id} onChange={v=>setForm({...form, tax_id:v})}/>
            <Input label="อีเมล" value={form.email} onChange={v=>setForm({...form, email:v})}/>
            <Input label="เบอร์โทร" value={form.phone} onChange={v=>setForm({...form, phone:v})}/>
            <Input label="เครดิต" value={form.payment_terms} onChange={v=>setForm({...form, payment_terms:v})}/>
            <Input label="ที่อยู่" value={form.address} onChange={v=>setForm({...form, address:v})} full />
            <Input label="หมายเหตุ" value={form.notes} onChange={v=>setForm({...form, notes:v})} full />
            <div>
              <label style={label}>สถานะ</label>
              <select style={input} value={form.is_active ? '1':'0'} onChange={e=>setForm({...form, is_active: e.target.value==='1'})}>
                <option value="1">ใช้งาน</option>
                <option value="0">ปิดใช้งาน</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Contacts */}
      <section style={card}>
        <h3 style={h3}>ผู้ติดต่อ (Contacts)</h3>
        {data.contacts?.length ? (
          <ul style={{ margin:0, paddingLeft:18 }}>
            {data.contacts.map((c, i)=>(
              <li key={i} style={{ marginBottom:6 }}>
                <b>{c.name}</b> — {c.role} • {c.phone} • {c.email}
              </li>
            ))}
          </ul>
        ) : <div style={muted}>-</div>}
      </section>

      {/* Recent activities */}
      <section style={card}>
        <h3 style={h3}>กิจกรรมล่าสุด</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
          <div>
            <h4 style={h4}>PO ล่าสุด</h4>
            <TableSmall
              headers={['เลขที่', 'วันที่', 'มูลค่า', 'สถานะ']}
              rows={activities.po_recent.map(x=>[x.po_no, x.date, fmt(x.total), x.status])}
            />
          </div>
          <div>
            <h4 style={h4}>RFQ ล่าสุด</h4>
            <TableSmall
              headers={['เลขที่', 'วันที่', 'สถานะ']}
              rows={activities.rfq_recent.map(x=>[x.rfq_no, x.date, x.status])}
            />
          </div>
          <div>
            <h4 style={h4}>GR ล่าสุด</h4>
            <TableSmall
              headers={['เลขที่', 'วันที่', 'Good', 'Damaged', 'Returned']}
              rows={activities.gr_recent.map(x=>[x.gr_no, x.date, x.good, x.damaged, x.returned])}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

/** Small components */
function Field({ label, value, full }) {
  return (
    <div style={full ? { gridColumn:'1 / span 2' } : null}>
      <div style={{ color:'#6b7280', fontSize:12 }}>{label}</div>
      <div style={{ padding:'6px 0' }}>{value}</div>
    </div>
  );
}
function Input({ label, value, onChange, disabled, full }) {
  return (
    <div style={full ? { gridColumn:'1 / span 2' } : null}>
      <label style={label}>{label}</label>
      <input style={input} value={value||''} onChange={e=>onChange(e.target.value)} disabled={disabled}/>
    </div>
  );
}
function TableSmall({ headers, rows }) {
  return (
    <div style={{ overflow:'auto' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:420 }}>
        <thead>
          <tr style={theadRow}>{headers.map((h,i)=><th key={i} style={th}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length===0 ? (
            <tr><td colSpan={headers.length} style={{...td, textAlign:'center', color:'#6b7280'}}>ไม่มีข้อมูล</td></tr>
          ) : rows.map((r,i)=>(
            <tr key={i}>{r.map((c,j)=><td key={j} style={td}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** helpers & styles */
function fmt(n) { return Number(n||0).toLocaleString(undefined, { minimumFractionDigits:2, maximumFractionDigits:2 }); }

const wrap   = { padding:20, background:'#f9fafb', minHeight:'100vh' };
const card   = { background:'#fff', padding:16, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', marginBottom:16 };
const title  = { fontSize:'1.4rem', fontWeight:700, margin:0 };
const rowBetween = { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 };
const label  = { display:'block', marginBottom:6, color:'#374151' };
const input  = { width:'100%', padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:8 };
const h3     = { margin:'0 0 8px 0' };
const h4     = { margin:'0 0 6px 0', fontWeight:600 };
const grid2  = { display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12 };
const primaryBtn = { background:'#2563eb', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const darkBtn    = { background:'#111827', color:'#fff', border:'none', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const ghostBtn   = { background:'#fff', color:'#111827', border:'1px solid #d1d5db', padding:'8px 12px', borderRadius:8, cursor:'pointer' };
const theadRow = { background:'#f3f4f6' };
const th     = { textAlign:'left', padding:10, borderBottom:'1px solid #e5e7eb' };
const td     = { padding:10, borderBottom:'1px solid #f1f5f9' };
// เพิ่มสองบรรทัดนี้
const empty  = { padding:16, textAlign:'center', color:'#6b7280', background:'#fff', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.05)' };
const muted  = { color:'#6b7280' };
