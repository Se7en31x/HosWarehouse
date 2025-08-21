// src/app/goods-receipt/create/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from '@/app/purchasing/po/create/page.module.css'; // Reuse CSS file
import { FaChevronLeft, FaSave, FaBan } from 'react-icons/fa';
import Autocomplete from '@/app/components/Autocomplete';

// Helper component for Number Input, integrated directly into this file
function NumberInput({ value, onChange, min, max, step = 1, className, ...props }) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseFloat(val);
    if (!isNaN(num) && (min === undefined || num >= min) && (max === undefined || num <= max)) {
      onChange(num);
    } else if (val === '') {
      onChange(0);
    }
  };

  return (
    <input
      type="number"
      value={inputValue}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      className={`${styles.input} ${className}`}
      {...props}
    />
  );
}

// Helper function to format currency (THB)
const thb = (v) => (Number(v) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const initialGr = {
  gr_date: new Date().toISOString().substring(0, 10),
  delivery_note: '',
  po_id: '',
  po_no: '',
  vendor_name: '',
  items: [],
};

export default function GRCreatePage() {
  const router = useRouter();
  const [gr, setGr] = useState(initialGr);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to fetch PO details and its items
  const fetchPOItems = async (poId) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/po/${poId}`);
      const po = res.data;
      if (!po) throw new Error('ไม่พบ PO');

      setGr(prev => ({
        ...prev,
        po_id: po._id,
        po_no: po.po_no,
        vendor_name: po.vendor?.name,
        // Filter for items that still need to be received
        items: po.items
          .filter(item => item.qty_received < item.qty_ordered)
          .map(item => ({
            item_id: item._id,
            name: item.name,
            unit: item.unit,
            qty_ordered: item.qty_ordered,
            qty_received: item.qty_received,
            qty_to_receive: item.qty_ordered - item.qty_received, // Remaining quantity
            qty: 0, // Quantity to receive (user input)
          }))
      }));
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'โหลดรายละเอียด PO ไม่สำเร็จ', 'error');
      setGr(initialGr);
    } finally {
      setLoading(false);
    }
  };

  // Function to search for POs that are ready to receive
  const poSearch = async (term) => {
    try {
        const res = await axiosInstance.get(`/po/po-list-to-receive?q=${term}`);
        return res.data.map(po => ({
          value: po._id,
          label: `${po.po_no} (${po.vendor_name})`,
          po_no: po.po_no,
          vendor_name: po.vendor_name,
        }));
    } catch (err) {
        console.error("Error searching POs:", err);
        return [];
    }
  };

  // Handler for when a PO is selected from the autocomplete
  const onSelectItem = (selectedOption) => {
    if (selectedOption) {
      fetchPOItems(selectedOption.value);
    } else {
      setGr(initialGr);
    }
  };

  // Handler for item quantity change
  const handleItemChange = (index, field, value) => {
    const newItems = [...gr.items];
    const item = newItems[index];

    if (field === 'qty') {
      const parsedValue = Number(value);
      if (parsedValue > item.qty_to_receive) {
        Swal.fire('จำนวนเกิน', 'จำนวนที่รับเข้าต้องไม่เกินจำนวนคงเหลือ', 'warning');
        return;
      }
      if (parsedValue < 0) return;
      newItems[index].qty = parsedValue;
    }
    setGr({ ...gr, items: newItems });
  };

  // Handler for saving the GR document
  const onSave = async () => {
    if (isSubmitting) return;

    const { gr_date, delivery_note, po_id, items } = gr;
    if (!po_id) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกใบสั่งซื้อ (PO)', 'warning');
      return;
    }
    const receivedItems = items.filter(item => item.qty > 0);
    if (receivedItems.length === 0) {
      Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุจำนวนสินค้าที่ได้รับอย่างน้อย 1 รายการ', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        gr_date,
        delivery_note,
        po_id,
        items: receivedItems.map(item => ({
          item_id: item.item_id,
          qty: item.qty
        }))
      };

      await axiosInstance.post('/gr', data);
      Swal.fire('สำเร็จ', 'บันทึกเอกสารรับของแล้ว', 'success');
      router.push('/goods-receipt');
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'บันทึกเอกสารรับของไม่สำเร็จ', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.btnGhost} onClick={() => router.push('/goods-receipt')}>
          <FaChevronLeft/> กลับ
        </button>
        <h1>สร้างเอกสารรับของเข้า (GR)</h1>
      </div>

      <div className={styles.card}>
        <div className={styles.grid2}>
          <div>
            <label className={styles.label}>อ้างอิงใบสั่งซื้อ (PO)</label>
            <Autocomplete
              fetchOptions={poSearch}
              onSelect={onSelectItem}
              placeholder="ค้นหาเลขที่ PO หรือชื่อผู้ขาย"
            />
          </div>
          <div>
            <label className={styles.label}>เลขที่ใบส่งของ (จากผู้ขาย)</label>
            <input
              className={styles.input}
              type="text"
              value={gr.delivery_note}
              onChange={(e) => setGr({ ...gr, delivery_note: e.target.value })}
            />
          </div>
          <div>
            <label className={styles.label}>วันที่รับของ</label>
            <input
              className={styles.input}
              type="date"
              value={gr.gr_date}
              onChange={(e) => setGr({ ...gr, gr_date: e.target.value })}
            />
          </div>
          <div>
            <label className={styles.label}>ผู้ขาย</label>
            <input className={styles.input} type="text" value={gr.vendor_name} readOnly />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>รายการสินค้า</h2>
        {loading ? (
          <div className={styles.loading}>กำลังโหลดรายการสินค้า...</div>
        ) : gr.items.length === 0 ? (
          <div className={styles.muted}>
            {!gr.po_id ? 'กรุณาเลือกใบสั่งซื้อ (PO) ก่อน' : 'ไม่มีรายการสินค้าที่ต้องรับเข้า'}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ชื่อพัสดุ</th>
                  <th>หน่วย</th>
                  <th className={styles.center}>จำนวนที่สั่ง</th>
                  <th className={styles.center}>จำนวนที่ได้รับแล้ว</th>
                  <th className={styles.center}>จำนวนที่คงเหลือ</th>
                  <th className={styles.center}>จำนวนที่รับเข้า</th>
                </tr>
              </thead>
              <tbody>
                {gr.items.map((item, index) => (
                  <tr key={item.item_id}>
                    <td className={styles.center}>{index + 1}</td>
                    <td>{item.name}</td>
                    <td className={styles.center}>{item.unit}</td>
                    <td className={styles.center}>{item.qty_ordered}</td>
                    <td className={styles.center}>{item.qty_received}</td>
                    <td className={styles.center}>{item.qty_to_receive}</td>
                    <td className={styles.center}>
                      <NumberInput
                        value={item.qty}
                        onChange={(v) => handleItemChange(index, 'qty', v)}
                        min={0}
                        max={item.qty_to_receive}
                        step={1}
                        className={styles.input}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className={styles.footer}>
        <button className={styles.btnSecondary} onClick={() => router.push('/goods-receipt')}>
          <FaBan /> ยกเลิก
        </button>
        <button
          className={styles.btnPrimary}
          onClick={onSave}
          disabled={isSubmitting || !gr.po_id || gr.items.every(item => item.qty <= 0)}
        >
          <FaSave /> บันทึกเอกสารรับของ
        </button>
      </div>

    </div>
  );
}
