'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

/** ───────── Mock อยู่ในไฟล์นี้ ───────── */
const PO_DETAIL = {
  'PO-2025-001': {
    po_no: 'PO-2025-001',
    date: '2025-08-21',
    supplier: { id: 102, name: 'บจก.เมดิคอลพลัส', phone: '02-123-4567', address: 'กทม.' },
    status: 'waiting_approval',
    terms: { credit_days: 30, delivery_days: 7, warranty_months: 6, note: 'ส่งภายใน 7 วัน' },
    rfq_ref: 'RFQ-2025-003',
    quote_ref: 'QT-12345',
    items: [
      { code: 'MED001', name: 'ยาพาราเซตามอล 500mg', qty: 50, unit: 'กล่อง', unit_price: 196, discount: 2 },
    ],
  },
  'PO-2025-002': {
    po_no: 'PO-2025-002',
    date: '2025-08-22',
    supplier: { id: 101, name: 'หจก.สุขภาพดี', phone: '02-987-6543', address: 'เชียงใหม่' },
    status: 'approved',
    terms: { credit_days: 15, delivery_days: 5, warranty_months: 3, note: '' },
    rfq_ref: 'RFQ-2025-002',
    quote_ref: 'QT-22222',
    items: [
      { code: 'MED010', name: 'แอลกอฮอล์ 70%', qty: 30, unit: 'ขวด', unit_price: 120, discount: 0 },
      { code: 'GEN005', name: 'กระดาษทิชชู่ 2 ชั้น', qty: 20, unit: 'แพ็ค', unit_price: 580, discount: 5 },
    ],
  },
};

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

export default function PoDetailPage() {
  const { id } = useParams(); // "PO-2025-001"
  const router = useRouter();
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);

  // จำลองโหลด
  useEffect(() => {
    const t = setTimeout(() => {
      setPo(PO_DETAIL[id] || null);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [id]);

  const itemsWithNet = useMemo(() => {
    if (!po?.items) return [];
    return po.items.map((r) => {
      const net = (r.unit_price * r.qty) * (1 - (r.discount || 0) / 100);
      return { ...r, net };
    });
  }, [po]);

  const totals = useMemo(() => {
    const sub = itemsWithNet.reduce((a, r) => a + r.net, 0);
    const vat = sub * 0.07;
    const grand = sub + vat;
    return { sub, vat, grand };
  }, [itemsWithNet]);

  const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const approve = () => {
    if (!po) return;
    if (po.status !== 'waiting_approval') return alert('สถานะปัจจุบันไม่อยู่ในขั้นรออนุมัติ');
    alert('(Mock) อนุมัติสำเร็จ');
    setPo({ ...po, status: 'approved' });
  };

  const gotoGR = () => {
    // ถ้ายังไม่มีหน้ารับของ ให้เปลี่ยนเป็น alert ก่อน
    // router.push(`/purchasing/gr/${id}`);
    alert('(Mock) ไปหน้ารับของ (GR) จากใบสั่งซื้อ ' + po.po_no);
  };

  /** 🔸 ส่งออก PDF แบบ client-side (เปิดหน้าต่างใหม่แล้วสั่งพิมพ์) */
  const exportPdf = () => {
    if (!po) return;
    const win = window.open('', '_blank', 'noopener,noreferrer');
    if (!win) {
      alert('โปรดอนุญาต popup เพื่อส่งออก PDF');
      return;
    }

    const rowsHtml = itemsWithNet.map((r) => `
      <tr>
        <td class="mono">${r.code}</td>
        <td>${r.name}</td>
        <td class="num">${r.qty}</td>
        <td>${r.unit}</td>
        <td class="num">${fmt(r.unit_price)}</td>
        <td class="num">${r.discount || 0}</td>
        <td class="num">${fmt(r.net)}</td>
      </tr>
    `).join('');

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${po.po_no}.pdf</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: ui-sans-serif, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", sans-serif; margin: 24px; color:#111827; }
    h1 { margin: 0 0 4px 0; font-size: 20px; }
    .muted { color:#6b7280; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
    .card { border:1px solid #e5e7eb; padding:12px; border-radius:8px; margin: 10px 0; }
    table { width:100%; border-collapse: collapse; }
    th, td { border:1px solid #e5e7eb; padding:8px; font-size: 12px; }
    th { background:#f3f4f6; text-align:left; }
    .num { text-align:right; }
    .totals { margin-top: 10px; display:grid; justify-content: end; gap:4px; }
    .totals .grand { font-weight:700; }
    .footer { margin-top: 20px; display:flex; justify-content: space-between; font-size: 12px; color:#6b7280; }
    @media print {
      @page { size: A4; margin: 16mm; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="display:flex; justify-content:flex-end; margin-bottom:10px;">
    <button onclick="window.print()" style="padding:6px 10px; border:1px solid #d1d5db; border-radius:8px; cursor:pointer;">พิมพ์ / บันทึกเป็น PDF</button>
  </div>

  <h1>Purchase Order (PO)</h1>
  <div class="muted">เลขที่: ${po.po_no} • วันที่: ${po.date}</div>
  <div class="muted">อ้างอิง: RFQ ${po.rfq_ref || '-'} • Quotation ${po.quote_ref || '-'}</div>

  <div class="grid">
    <div class="card">
      <strong>ผู้ขาย</strong><br/>
      ชื่อ: ${po.supplier.name}<br/>
      เบอร์: ${po.supplier.phone || '-'}<br/>
      ที่อยู่: ${po.supplier.address || '-'}
    </div>
    <div class="card">
      <strong>เงื่อนไข</strong><br/>
      เครดิต: ${po.terms.credit_days} วัน<br/>
      ส่งของใน: ${po.terms.delivery_days} วัน<br/>
      รับประกัน: ${po.terms.warranty_months} เดือน<br/>
      หมายเหตุ: ${po.terms.note || '-'}
    </div>
  </div>

  <div class="card">
    <table>
      <thead>
        <tr>
          <th>รหัส</th>
          <th>ชื่อสินค้า</th>
          <th class="num">จำนวน</th>
          <th>หน่วย</th>
          <th class="num">ราคา/หน่วย</th>
          <th class="num">ส่วนลด (%)</th>
          <th class="num">รวมสุทธิ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div>Subtotal: ${fmt(totals.sub)}</div>
      <div>VAT 7%: ${fmt(totals.vat)}</div>
      <div class="grand">Grand Total: ${fmt(totals.grand)}</div>
    </div>
  </div>

  <div class="footer">
    <div>ผู้จัดทำ: ระบบจัดซื้อ (Mock)</div>
    <div>สถานะ: ${STATUS_TEXT[po.status] || po.status}</div>
  </div>
</body>
</html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
    // บางครั้ง Chrome ต้องรอให้ render เสร็จก่อนค่อยสั่ง print อัตโนมัติ
    setTimeout(() => {
      try { win.print(); } catch(e) {}
    }, 300);
  };

  if (loading) {
    return <main style={pageWrap}><div style={emptyBox}>Loading...</div></main>;
  }

  if (!po) {
    return (
      <main style={pageWrap}>
        <div style={card}>
          <h1 style={title}>ไม่พบ PO</h1>
          <p style={{ color: '#6b7280' }}>รหัส: {id}</p>
          <button onClick={() => router.push('/purchasing/po')} style={primaryBtn}>← กลับรายการ PO</button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      {/* Header */}
      <section style={card}>
        <div style={headRow}>
          <h1 style={title}>{po.po_no}</h1>
          <span style={badgeStyle(po.status)}>{STATUS_TEXT[po.status] || po.status}</span>
        </div>
        <div style={twoCols}>
          <div>
            <p><b>วันที่:</b> {po.date}</p>
            <p><b>อ้างอิง:</b> RFQ {po.rfq_ref || '-'} • Quotation {po.quote_ref || '-'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
            <button onClick={exportPdf} style={outlineBtn}>ส่งออก PDF</button>
            {po.status === 'waiting_approval' && (
              <button onClick={approve} style={primaryBtn}>อนุมัติ</button>
            )}
            <button onClick={gotoGR} style={darkBtn}>รับของ (GR)</button>
          </div>
        </div>
      </section>

      {/* Supplier & Terms */}
      <section style={{ ...card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <h3 style={h3}>ผู้ขาย</h3>
          <p><b>ชื่อ:</b> {po.supplier.name}</p>
          <p><b>เบอร์:</b> {po.supplier.phone || '-'}</p>
          <p><b>ที่อยู่:</b> {po.supplier.address || '-'}</p>
        </div>
        <div>
          <h3 style={h3}>เงื่อนไข</h3>
          <p><b>เครดิต:</b> {po.terms.credit_days} วัน</p>
          <p><b>ส่งของใน:</b> {po.terms.delivery_days} วัน</p>
          <p><b>รับประกัน:</b> {po.terms.warranty_months} เดือน</p>
          <p><b>หมายเหตุ:</b> {po.terms.note || '-'}</p>
        </div>
      </section>

      {/* Items */}
      <section style={card}>
        <h3 style={h3}>รายการสินค้า</h3>
        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={th}>รหัส</th>
                <th style={th}>ชื่อสินค้า</th>
                <th style={{ ...th, textAlign: 'right' }}>จำนวน</th>
                <th style={th}>หน่วย</th>
                <th style={{ ...th, textAlign: 'right' }}>ราคา/หน่วย</th>
                <th style={{ ...th, textAlign: 'right' }}>ส่วนลด (%)</th>
                <th style={{ ...th, textAlign: 'right' }}>รวมสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {itemsWithNet.map((r) => (
                <tr key={r.code}>
                  <td style={tdMono}>{r.code}</td>
                  <td style={td}>{r.name}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{r.qty}</td>
                  <td style={td}>{r.unit}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(r.unit_price)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(r.discount || 0)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmt(r.net)}</td>
                </tr>
              ))}
              {itemsWithNet.length === 0 && (
                <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#6b7280' }}>ไม่มีรายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ display: 'grid', justifyContent: 'end', gap: 4, marginTop: 12 }}>
          <div><b>Subtotal:</b> {fmt(totals.sub)}</div>
          <div><b>VAT 7%:</b> {fmt(totals.vat)}</div>
          <div style={{ fontSize: '1.05rem' }}><b>Grand Total:</b> {fmt(totals.grand)}</div>
        </div>
      </section>
    </main>
  );
}

/** ───────── styles ───────── */
const pageWrap = { padding: 20, background: '#f9fafb', minHeight: '100vh' };
const card = { background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 16 };
const title = { fontSize: '1.4rem', fontWeight: 700, margin: 0 };
const headRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 };
const twoCols = { display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' };
const h3 = { margin: '0 0 8px 0' };
const primaryBtn = { background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' };
const darkBtn = { background: '#111827', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' };
const outlineBtn = { background: '#fff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' };
const emptyBox = { padding: 16, textAlign: 'center', color: '#6b7280', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' };
const td = { padding: 10, borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tdMono = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };