"use client";

import { useState } from "react";
import styles from './page.module.css';

// ข้อมูลตัวอย่างสำหรับคำสั่งซื้อที่รอรับสินค้า (สมมติจาก PO ที่สถานะ 'บันทึกแล้ว')
const initialPurchaseOrders = [
  {
    id: 'PO-001',
    date: '2025-08-26',
    supplier: 'บริษัท A',
    totalAmount: 5000,
    status: 'บันทึกแล้ว',
    items: [
      { id: '001', name: 'ยาแก้ปวด', quantity: 100, unit: 'ขวด', received: 0, status: 'รอรับ' },
      { id: '002', name: 'ผ้าก๊อซ', quantity: 50, unit: 'ม้วน', received: 0, status: 'รอรับ' },
    ],
    receiptStatus: 'รอรับ', // 'รอรับ', 'รับบางส่วน', 'รับครบ', 'ปฏิเสธ'
    notes: '',
  },
  {
    id: 'PO-002',
    date: '2025-08-27',
    supplier: 'บริษัท B',
    totalAmount: 3000,
    status: 'บันทึกแล้ว',
    items: [
      { id: '003', name: 'เครื่องวัดความดัน', quantity: 5, unit: 'ชิ้น', received: 0, status: 'รอรับ' },
    ],
    receiptStatus: 'รอรับ',
    notes: '',
  },
];

const GoodsReceiptPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [selectedPO, setSelectedPO] = useState(null);
  const [formData, setFormData] = useState({
    items: [],
    receiptStatus: 'รอรับ',
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const handleViewDetails = (po) => {
    setSelectedPO(po);
    setFormData({
      items: po.items.map(item => ({ ...item })),
      receiptStatus: po.receiptStatus,
      notes: po.notes,
    });
    setErrors({});
  };

  const handleReceivedChange = (itemId, value) => {
    const received = parseInt(value) || 0;
    const newItems = formData.items.map(item => {
      if (item.id === itemId) {
        let status = 'รับครบ';
        if (received < item.quantity) status = 'รับบางส่วน';
        if (received > item.quantity) status = 'ของเกิน';
        if (received === 0) status = 'ปฏิเสธ';
        return { ...item, received, status };
      }
      return item;
    });
    setFormData({ ...formData, items: newItems });
  };

  const handleNotesChange = (value) => {
    setFormData({ ...formData, notes: value });
  };

  const validateForm = () => {
    const newErrors = {};
    formData.items.forEach(item => {
      if (item.received > item.quantity) {
        newErrors[item.id] = 'จำนวนรับเข้าเกินจำนวนสั่งซื้อ';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateReceiptStatus = () => {
    const allItems = formData.items;
    if (allItems.every(item => item.received === item.quantity)) return 'รับครบ';
    if (allItems.some(item => item.received > 0) && allItems.some(item => item.received < item.quantity)) return 'รับบางส่วน';
    if (allItems.every(item => item.received === 0)) return 'ปฏิเสธ';
    return 'รอรับ';
  };

  const handleSaveReceipt = () => {
    if (!validateForm()) return;
    const receiptStatus = calculateReceiptStatus();
    const updatedPOs = purchaseOrders.map(po =>
      po.id === selectedPO.id
        ? { ...po, items: formData.items, receiptStatus, notes: formData.notes, status: receiptStatus === 'รับครบ' ? 'เสร็จสิ้น' : po.status }
        : po
    );
    setPurchaseOrders(updatedPOs);
    setSelectedPO(null);
    console.log('บันทึกการรับเข้า:', { receiptStatus, formData });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>หน้ารับเข้าสินค้า</h1>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>วันที่</th>
              <th className={styles.th}>บริษัทผู้ขาย</th>
              <th className={styles.th}>จำนวนเงินรวม</th>
              <th className={styles.th}>สถานะรับเข้า</th>
              <th className={styles.th}>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map(po => (
              <tr key={po.id}>
                <td className={styles.td}>{po.id}</td>
                <td className={styles.td}>{po.date}</td>
                <td className={styles.td}>{po.supplier}</td>
                <td className={styles.td}>{po.totalAmount.toLocaleString()} บาท</td>
                <td className={styles.td}>{po.receiptStatus}</td>
                <td className={styles.td}>
                  <button className={styles.button} onClick={() => handleViewDetails(po)}>ตรวจสอบรับเข้า</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPO && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>รับเข้าสินค้า: {selectedPO.id}</h2>
            <p className={styles.modalText}>บริษัทผู้ขาย: {selectedPO.supplier}</p>
            <p className={styles.modalText}>วันที่: {selectedPO.date}</p>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>ID</th>
                    <th className={styles.th}>ชื่อสินค้า</th>
                    <th className={styles.th}>จำนวนสั่งซื้อ</th>
                    <th className={styles.th}>หน่วย</th>
                    <th className={styles.th}>จำนวนรับเข้า (กรอก)</th>
                    <th className={styles.th}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map(item => (
                    <tr key={item.id}>
                      <td className={styles.td}>{item.id}</td>
                      <td className={styles.td}>{item.name}</td>
                      <td className={styles.td}>{item.quantity}</td>
                      <td className={styles.td}>{item.unit}</td>
                      <td className={styles.td}>
                        <input
                          type="number"
                          value={item.received}
                          onChange={(e) => handleReceivedChange(item.id, e.target.value)}
                          className={styles.input}
                          min="0"
                        />
                        {errors[item.id] && <span className={styles.errorText}>{errors[item.id]}</span>}
                      </td>
                      <td className={styles.td}>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>หมายเหตุ (เช่น ตามเรื่องกับบริษัท):</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (เช่น ของไม่ครบ, ตามเรื่องภายนอกระบบ)"
                className={styles.textarea}
              />
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.button} onClick={handleSaveReceipt}>บันทึกการรับเข้า</button>
              <button className={styles.button} onClick={() => setSelectedPO(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoodsReceiptPage;