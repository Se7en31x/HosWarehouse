'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import styles from '../../../rfq/page.module.css';

/** ผู้ขายจำลอง */
const MOCK_SUPPLIERS = [
  { id: 101, name: 'หจก.สุขภาพดี' },
  { id: 102, name: 'บจก.เมดิคอลพลัส' },
  { id: 103, name: 'บจก.ฟาร์มาพลัส' },
];

/** RFQ items จำลอง (สำหรับกรอกราคา) */
const MOCK_RFQ_ITEMS = [
  { code: 'MED001', name: 'ยาพาราเซตามอล 500mg', qty: 50, unit: 'กล่อง' },
  { code: 'MED010', name: 'แอลกอฮอล์ 70%', qty: 30, unit: 'ขวด' },
];

export default function QuotationEntryPage() {
  const { rfqId } = useParams();
  const router = useRouter();

  const [supplierId, setSupplierId] = useState(MOCK_SUPPLIERS[0].id);
  const [quotationNo, setQuotationNo] = useState('');
  const [quotationDate, setQuotationDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [creditTerm, setCreditTerm] = useState(30);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [warrantyMonths, setWarrantyMonths] = useState(6);
  const [fileName, setFileName] = useState('');
  const [remark, setRemark] = useState('');

  const [priceRows, setPriceRows] = useState(
    MOCK_RFQ_ITEMS.map(x => ({ ...x, unit_price: 0, discount: 0 }))
  );

  const totals = useMemo(() => {
    const sub = priceRows.reduce((acc, r) => acc + (r.unit_price * r.qty) * (1 - (r.discount || 0)/100), 0);
    const vat = sub * 0.07;
    const grand = sub + vat;
    return { sub, vat, grand };
  }, [priceRows]);

  const onChangeCell = (idx, field, value) => {
    const next = [...priceRows];
    next[idx] = { ...next[idx], [field]: Number(value) || 0 };
    setPriceRows(next);
  };

  const saveQuote = () => {
    if (!quotationNo || !quotationDate) {
      alert('กรุณากรอก เลขที่ใบเสนอราคา และ วันที่ออกใบเสนอราคา');
      return;
    }
    alert(`(Mock) บันทึกใบเสนอราคา สำหรับผู้ขาย ${supplierId} รวม: ${totals.grand.toFixed(2)}`);
    // ของจริง: POST /quotation แล้วเก็บลง list quotes ของ RFQ นี้
  };

  const [quotes, setQuotes] = useState([]); // mock: เก็บ quotes ที่บันทึกใน session นี้

  const addToQuotes = () => {
    saveQuote();
    setQuotes(q => ([
      ...q,
      {
        supplierId,
        supplierName: MOCK_SUPPLIERS.find(s=>s.id===supplierId)?.name || 'Unknown',
        total: totals.grand,
        creditTerm,
        deliveryDays,
        quotationNo,
      }
    ]));
    // reset เบา ๆ
    setQuotationNo('');
    setFileName('');
  };

  const chooseWinner = (supplierId) => {
    const win = quotes.find(q => q.supplierId === supplierId);
    if (!win) return alert('ยังไม่มีใบเสนอราคาของผู้ขายรายนี้');
    alert(`(Mock) เลือกผู้ชนะ: ${win.supplierName} → สร้าง PO จากใบเสนอราคานี้`);
    // ของจริง: POST /rfq/{rfqId}/select-winner → สร้าง PO → redirect /purchasing/po/[newId]
    // router.push(`/purchasing/po/PO-NEW-ID`);
  };

  return (
    <main className={styles.container}>
      <div className={styles.breadcrumb}>
        <a href="/purchasing/rfq">RFQ</a> <span>/</span> <a href={`/purchasing/rfq/${rfqId}`}>{`RFQ-${rfqId}`}</a> <span>/</span> <span>Quotation</span>
      </div>

      <h1 className={styles.title}>Quotation Entry</h1>
      <p className={styles.subtitle}>กรอกใบเสนอราคาจากผู้ขาย (เวอร์ชันง่าย)</p>

      {/* ฟอร์มส่วนหัว */}
      <section className={styles.card}>
        <div className={styles.gridThreeCols}>
          <div>
            <label className={styles.label}>ผู้ขาย</label>
            <select className={styles.input} value={supplierId} onChange={e=>setSupplierId(Number(e.target.value))}>
              {MOCK_SUPPLIERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={styles.label}>เลขที่ใบเสนอราคา</label>
            <input className={styles.input} value={quotationNo} onChange={e=>setQuotationNo(e.target.value)} placeholder="QT-xxxx" />
          </div>
          <div>
            <label className={styles.label}>วันที่ออก</label>
            <input type="date" className={styles.input} value={quotationDate} onChange={e=>setQuotationDate(e.target.value)} />
          </div>
          <div>
            <label className={styles.label}>วันหมดอายุราคา</label>
            <input type="date" className={styles.input} value={expireDate} onChange={e=>setExpireDate(e.target.value)} />
          </div>
          <div>
            <label className={styles.label}>เครดิต (วัน)</label>
            <input type="number" className={styles.input} value={creditTerm} onChange={e=>setCreditTerm(Number(e.target.value)||0)} />
          </div>
          <div>
            <label className={styles.label}>ระยะเวลาส่งของ (วัน)</label>
            <input type="number" className={styles.input} value={deliveryDays} onChange={e=>setDeliveryDays(Number(e.target.value)||0)} />
          </div>
          <div>
            <label className={styles.label}>การรับประกัน (เดือน)</label>
            <input type="number" className={styles.input} value={warrantyMonths} onChange={e=>setWarrantyMonths(Number(e.target.value)||0)} />
          </div>
          <div className={styles.colSpan2}>
            <label className={styles.label}>ไฟล์แนบ (PDF)</label>
            <div className={styles.rowGap}>
              <input className={styles.input} placeholder="(mock) พิมพ์ชื่อไฟล์แทนการอัปโหลด" value={fileName} onChange={e=>setFileName(e.target.value)} />
              <button className={styles.ghost} onClick={()=>alert('(Mock) แนบไฟล์')}>แนบ</button>
            </div>
          </div>
          <div className={styles.colSpan3}>
            <label className={styles.label}>เงื่อนไข/หมายเหตุ</label>
            <textarea rows={2} className={styles.input} value={remark} onChange={e=>setRemark(e.target.value)} placeholder="ใส่รายละเอียดเงื่อนไข..."/>
          </div>
        </div>
      </section>

      {/* ตารางราคา */}
      <section className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h3>กำหนดราคา (ต่อรายการ)</h3>
          <span className={styles.muted}>* ราคาจะคำนวณราคารวม + VAT 7% อัตโนมัติ</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ชื่อสินค้า</th>
                <th>จำนวน</th>
                <th>หน่วย</th>
                <th>ราคา/หน่วย</th>
                <th>ส่วนลด (%)</th>
                <th>รวมสุทธิ</th>
              </tr>
            </thead>
            <tbody>
              {priceRows.map((r, idx) => {
                const net = (r.unit_price * r.qty) * (1 - (r.discount || 0)/100);
                return (
                  <tr key={r.code}>
                    <td className={styles.mono}>{r.code}</td>
                    <td>{r.name}</td>
                    <td>{r.qty}</td>
                    <td>{r.unit}</td>
                    <td>
                      <input type="number" className={styles.inputSm}
                        value={r.unit_price}
                        onChange={e=>onChangeCell(idx, 'unit_price', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className={styles.inputSm}
                        value={r.discount}
                        onChange={e=>onChangeCell(idx, 'discount', e.target.value)} />
                    </td>
                    <td className={styles.number}>{net.toFixed(2)}</td>
                  </tr>
                );
              })}
              {priceRows.length === 0 && <tr><td className={styles.empty} colSpan={7}>ไม่มีรายการ</td></tr>}
            </tbody>
          </table>
        </div>

        <div className={styles.totalBox}>
          <div><b>Subtotal:</b> {totals.sub.toFixed(2)}</div>
          <div><b>VAT 7%:</b> {totals.vat.toFixed(2)}</div>
          <div className={styles.totalGrand}><b>Grand Total:</b> {totals.grand.toFixed(2)}</div>
        </div>

        <div className={styles.actions}>
          <button className={styles.secondary} onClick={addToQuotes}>บันทึกใบเสนอราคา</button>
        </div>
      </section>

      {/* โซนเลือกผู้ชนะ (จาก quotes ที่บันทึกไว้ในหน้านี้) */}
      <section className={styles.card}>
        <div className={styles.cardTitleRow}>
          <h3>เลือกรายผู้ชนะ</h3>
          <span className={styles.muted}>(mock) แสดงเฉพาะใบเสนอราคาที่บันทึกในหน้านี้</span>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ผู้ขาย</th>
              <th>ใบเสนอราคา</th>
              <th>เครดิต</th>
              <th>ส่งของใน</th>
              <th>ราคารวม</th>
              <th>เลือก</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q, idx) => (
              <tr key={idx}>
                <td>{q.supplierName}</td>
                <td className={styles.mono}>{q.quotationNo || '-'}</td>
                <td>{q.creditTerm} วัน</td>
                <td>{q.deliveryDays} วัน</td>
                <td className={styles.number}>{q.total.toFixed(2)}</td>
                <td><button className={styles.primary} onClick={()=>chooseWinner(q.supplierId)}>เลือกผู้ชนะ</button></td>
              </tr>
            ))}
            {quotes.length === 0 && <tr><td className={styles.empty} colSpan={6}>ยังไม่มีใบเสนอราคาที่บันทึก</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
