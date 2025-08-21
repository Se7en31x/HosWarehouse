'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import { FaPlusCircle, FaTrash, FaSave, FaExchangeAlt } from 'react-icons/fa';

// helpers
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const thb = (v) =>
  n(v).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function ItemRow({ row, index, onChange, onRemove }) {
  const lineTotal = n(row.qty) * n(row.unit_price) - n(row.discount);
  return (
    <tr className={styles.tr}>
      <td className={styles.center}>{index + 1}</td>
      <td>
        <input
          className={styles.input}
          value={row.code || ''}
          placeholder="รหัส"
          onChange={(e) => onChange({ ...row, code: e.target.value })}
        />
      </td>
      <td>
        <input
          className={styles.input}
          value={row.name || ''}
          placeholder="ชื่อพัสดุ"
          onChange={(e) => onChange({ ...row, name: e.target.value })}
        />
        {row.item_id ? <div className={styles.subText}>ID: {row.item_id}</div> : null}
      </td>
      <td className={styles.center}>
        <input
          type="number"
          min="1"
          className={styles.inputNumber}
          value={row.qty ?? 1}
          onChange={(e) => onChange({ ...row, qty: Math.max(1, n(e.target.value)) })}
        />
      </td>
      <td className={styles.center}>
        <input
          className={styles.input}
          value={row.unit || ''}
          placeholder="หน่วย"
          onChange={(e) => onChange({ ...row, unit: e.target.value })}
        />
      </td>
      <td className={styles.right}>
        <input
          type="number"
          min="0"
          step="0.01"
          className={styles.inputNumber}
          value={row.unit_price ?? 0}
          onChange={(e) => onChange({ ...row, unit_price: Math.max(0, n(e.target.value)) })}
        />
      </td>
      <td className={styles.right}>
        <input
          type="number"
          min="0"
          step="0.01"
          className={styles.inputNumber}
          value={row.discount ?? 0}
          onChange={(e) => onChange({ ...row, discount: Math.max(0, n(e.target.value)) })}
        />
      </td>
      <td className={`${styles.right} ${styles.totalCell}`}>{thb(lineTotal)}</td>
      <td className={styles.center}>
        <button className={styles.btnDanger} onClick={onRemove} title="ลบรายการ">
          <FaTrash />
        </button>
      </td>
    </tr>
  );
}

export default function CreatePOPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vendorManual, setVendorManual] = useState({
    name: '',
    address: '',
    contact: '',
    phone: '',
    email: '',
    note: '',
  });

  const [refDoc, setRefDoc] = useState({ pr_no: '', rfq_no: '' });

  const [terms, setTerms] = useState({
    credit_days: 30,
    delivery_days: 7,
    warranty_months: 0,
    payment_terms: '',
    shipping_terms: '',
    note: '',
    vat_rate: 7,
  });

  const [items, setItems] = useState([]);

  const summary = useMemo(() => {
    const sub = items.reduce((acc, r) => acc + (n(r.qty) * n(r.unit_price) - n(r.discount)), 0);
    const vat = sub * (n(terms.vat_rate) / 100);
    return { sub, vat, grand: sub + vat };
  }, [items, terms.vat_rate]);

  // New useEffect to handle data from URL
  useEffect(() => {
    const itemsFromQuery = sp.get('items');
    const vendorNameFromQuery = sp.get('vendorName');
    const prNoFromQuery = sp.get('pr_no');

    if (itemsFromQuery) {
      try {
        const parsedItems = JSON.parse(itemsFromQuery);
        setItems(parsedItems.map(item => ({
          ...item,
          qty: n(item.qty),
          unit_price: n(item.unit_price),
          discount: n(item.discount),
        })));
      } catch (e) {
        console.error('Failed to parse items from URL:', e);
        setItems([{ qty: 1, unit_price: 0, discount: 0 }]);
      }
    } else {
      setItems([{ qty: 1, unit_price: 0, discount: 0 }]);
    }
    
    if (vendorNameFromQuery) {
      setVendorManual(prev => ({ ...prev, name: vendorNameFromQuery }));
    }

    if (prNoFromQuery) {
      setRefDoc(prev => ({ ...prev, pr_no: prNoFromQuery }));
    }

    setLoading(false);
  }, [sp]);

  const updateRow = (i, r) => setItems((prev) => prev.map((x, idx) => (idx === i ? r : x)));
  const removeRow = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addRow = () => setItems((prev) => [...prev, { qty: 1, unit_price: 0, discount: 0 }]);

  const validate = () => {
    if (!vendorManual.name) return 'กรุณากรอกชื่อผู้ขาย';
    if (!items.length) return 'กรุณาเพิ่มรายการอย่างน้อย 1 รายการ';
    for (let i = 0; i < items.length; i++) {
      const r = items[i];
      if (!r.name || !r.unit) return `กรอกชื่อ/หน่วยของรายการที่ ${i + 1} ให้ครบถ้วน`;
      if (n(r.qty) <= 0) return `จำนวนของรายการที่ ${i + 1} ต้องมากกว่า 0`;
      if (n(r.unit_price) < 0) return `ราคาต่อหน่วยของรายการที่ ${i + 1} ต้องไม่ติดลบ`;
      if (n(r.discount) < 0) return `ส่วนลดของรายการที่ ${i + 1} ต้องไม่ติดลบ`;
    }
    return null;
  };

  const buildPayload = () => ({
    status: 'issued',
    vendor_id: null, // Always null for manual input
    vendor_manual: {
      name: vendorManual.name,
      address: vendorManual.address || '',
      contact: vendorManual.contact || '',
      phone: vendorManual.phone || '',
      email: vendorManual.email || '',
      note: vendorManual.note || '',
    },
    reference: {
      pr_no: refDoc.pr_no || null,
      rfq_no: refDoc.rfq_no || null,
    },
    terms: {
      credit_days: n(terms.credit_days),
      delivery_days: n(terms.delivery_days),
      warranty_months: n(terms.warranty_months),
      payment_terms: terms.payment_terms || '',
      shipping_terms: terms.shipping_terms || '',
      note: terms.note || '',
      vat_rate: n(terms.vat_rate),
    },
    items: items.map((r) => ({
      item_id: r.item_id || null,
      code: r.code || null,
      name: r.name,
      unit: r.unit,
      qty: n(r.qty),
      unit_price: n(r.unit_price),
      discount: n(r.discount),
      line_total: n(r.qty) * n(r.unit_price) - n(r.discount),
    })),
    summary: {
      sub_total: summary.sub,
      vat: summary.vat,
      grand_total: summary.grand,
    },
  });

  const save = async () => {
    const err = validate();
    if (err) return Swal.fire('ตรวจสอบข้อมูล', err, 'warning');
    setSaving(true);
    try {
      const res = await axiosInstance.post('/po', buildPayload());
      const poId = res.data?.po_id || '';
      Swal.fire('สำเร็จ', 'บันทึกใบสั่งซื้อแล้ว (แก้ไขไม่ได้)', 'success');
      router.push(`/purchasing/po/${poId}`);
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={styles.page}>กำลังโหลด...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>สร้างใบสั่งซื้อ (PO)</h1>
      </div>

      <div className={styles.card}>
        <h2>อ้างอิงเอกสาร</h2>
        <div className={styles.grid3}>
          <div>
            <label>PR No.</label>
            <input
              className={styles.input}
              value={refDoc.pr_no}
              onChange={(e) => setRefDoc({ ...refDoc, pr_no: e.target.value })}
              placeholder="เช่น PR-2025-001"
            />
          </div>
          <div>
            <label>RFQ No.</label>
            <input
              className={styles.input}
              value={refDoc.rfq_no}
              onChange={(e) => setRefDoc({ ...refDoc, rfq_no: e.target.value })}
              placeholder="เช่น RFQ-2025-010"
            />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2>ข้อมูลผู้ขาย</h2>
        </div>
        <>
          <div className={styles.grid2}>
            <div>
              <label>
                ชื่อผู้ขาย <span className={styles.req}>*</span>
              </label>
              <input
                className={styles.input}
                value={vendorManual.name}
                onChange={(e) =>
                  setVendorManual({ ...vendorManual, name: e.target.value })
                }
                placeholder="เช่น บจก.เมดิคอลพลัส"
              />
            </div>
            <div>
              <label>ผู้ติดต่อ</label>
              <input
                className={styles.input}
                value={vendorManual.contact}
                onChange={(e) =>
                  setVendorManual({ ...vendorManual, contact: e.target.value })
                }
                placeholder="ชื่อผู้ติดต่อ"
              />
            </div>
          </div>
          <div className={styles.grid3}>
            <div>
              <label>โทรศัพท์</label>
              <input
                className={styles.input}
                value={vendorManual.phone}
                onChange={(e) =>
                  setVendorManual({ ...vendorManual, phone: e.target.value })
                }
                placeholder="02-xxx-xxxx"
              />
            </div>
            <div>
              <label>อีเมล</label>
              <input
                className={styles.input}
                value={vendorManual.email}
                onChange={(e) =>
                  setVendorManual({ ...vendorManual, email: e.target.value })
                }
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label>ที่อยู่</label>
              <input
                className={styles.input}
                value={vendorManual.address}
                onChange={(e) =>
                  setVendorManual({ ...vendorManual, address: e.target.value })
                }
                placeholder="ที่อยู่ผู้ขาย"
              />
            </div>
          </div>
          <div>
            <label>หมายเหตุผู้ขาย</label>
            <input
              className={styles.input}
              value={vendorManual.note}
              onChange={(e) =>
                setVendorManual({ ...vendorManual, note: e.target.value })
              }
              placeholder="เช่น เงื่อนไขราคาพิเศษ ฯลฯ"
            />
          </div>
        </>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2>รายการพัสดุ</h2>
          <button className={styles.btnGhost} onClick={addRow}>
            <FaPlusCircle /> เพิ่มรายการ
          </button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>รหัส</th>
                <th>ชื่อพัสดุ</th>
                <th>จำนวน</th>
                <th>หน่วย</th>
                <th>ราคาต่อหน่วย</th>
                <th>ส่วนลด</th>
                <th>รวม/รายการ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, idx) => (
                <ItemRow
                  key={idx}
                  row={row}
                  index={idx}
                  onChange={(r) => updateRow(idx, r)}
                  onRemove={() => removeRow(idx)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h2>เงื่อนไข</h2>
          <div className={styles.grid3}>
            <div>
              <label>เครดิต (วัน)</label>
              <input
                type="number"
                min="0"
                className={styles.input}
                value={terms.credit_days}
                onChange={(e) =>
                  setTerms({ ...terms, credit_days: n(e.target.value) })
                }
              />
            </div>
            <div>
              <label>ส่งของภายใน (วัน)</label>
              <input
                type="number"
                min="0"
                className={styles.input}
                value={terms.delivery_days}
                onChange={(e) =>
                  setTerms({ ...terms, delivery_days: n(e.target.value) })
                }
              />
            </div>
            <div>
              <label>รับประกัน (เดือน)</label>
              <input
                type="number"
                min="0"
                className={styles.input}
                value={terms.warranty_months}
                onChange={(e) =>
                  setTerms({ ...terms, warranty_months: n(e.target.value) })
                }
              />
            </div>
          </div>
          <div>
            <label>Payment Terms</label>
            <input
              className={styles.input}
              value={terms.payment_terms}
              onChange={(e) =>
                setTerms({ ...terms, payment_terms: e.target.value })
              }
              placeholder="เช่น โอนหลังรับของ 30 วัน"
            />
          </div>
          <div>
            <label>Shipping Terms</label>
            <input
              className={styles.input}
              value={terms.shipping_terms}
              onChange={(e) =>
                setTerms({ ...terms, shipping_terms: e.target.value })
              }
              placeholder="เช่น ส่งฟรีในพื้นที่"
            />
          </div>
          <div>
            <label>หมายเหตุ</label>
            <textarea
              rows={3}
              className={styles.textarea}
              value={terms.note}
              onChange={(e) => setTerms({ ...terms, note: e.target.value })}
              placeholder="รายละเอียดเพิ่มเติม"
            />
          </div>
          <div>
            <label>VAT (%)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={styles.input}
              value={terms.vat_rate}
              onChange={(e) =>
                setTerms({ ...terms, vat_rate: n(e.target.value) })
              }
            />
          </div>
        </div>

        <div className={styles.card}>
          <h2>สรุปยอด</h2>
          <div className={styles.summaryRow}>
            <span>ยอดก่อนภาษี</span>
            <strong>{thb(summary.sub)} THB</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>VAT {n(terms.vat_rate)}%</span>
            <strong>{thb(summary.vat)} THB</strong>
          </div>
          <div className={`${styles.summaryRow} ${styles.grand}`}>
            <span>รวมทั้งสิ้น</span>
            <strong>{thb(summary.grand)} THB</strong>
          </div>
          <div className={styles.actionsBottom}>
            <button className={styles.btnPrimary} onClick={save} disabled={saving}>
              <FaSave /> บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}