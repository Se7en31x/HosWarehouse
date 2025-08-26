"use client";

import { useState } from "react";
import styles from './page.module.css';

// ข้อมูลตัวอย่างสำหรับคำสั่งซื้อ (Purchase Orders)
const initialPurchaseOrders = [
  {
    id: 'PO-001',
    date: '2025-08-26',
    supplier: 'บริษัท A',
    totalAmount: 0,
    status: 'รอดำเนินการ',
    companyInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      taxId: '',
    },
    items: [
      { id: '001', name: 'ยาแก้ปวด', quantity: 100, unit: 'ขวด', category: 'ยา', spec: 'ขนาด 500mg, ยี่ห้อ XYZ', price: 0 },
      { id: '002', name: 'ผ้าก๊อซ', quantity: 50, unit: 'ม้วน', category: 'เวชภัณฑ์', spec: 'ขนาด 10cm x 10m', price: 0 },
    ],
    attachments: [],
    notes: '',
  },
  {
    id: 'PO-002',
    date: '2025-08-27',
    supplier: 'บริษัท B',
    totalAmount: 0,
    status: 'รอดำเนินการ',
    companyInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      taxId: '',
    },
    items: [
      { id: '003', name: 'เครื่องวัดความดัน', quantity: 5, unit: 'ชิ้น', category: 'อุปกรณ์ทางการแพทย์', spec: 'ดิจิทัล, ยี่ห้อ Omron', price: 0 },
    ],
    attachments: [],
    notes: '',
  },
];

const attachmentTypes = [
  'ใบขอราคา',
  'ใบเสนอราคา',
  'ใบสั่งซื้อ',
  'ใบกำกับภาษี',
  'ใบเสร็จรับเงิน',
  'หลักฐานการจ่ายเงิน',
  'อื่นๆ',
];

const PurchaseOrderListPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [selectedPO, setSelectedPO] = useState(null);
  const [formData, setFormData] = useState({
    supplierPrices: {},
    totalAmount: 0,
    attachments: [],
    notes: '',
    companyInfo: {
      name: '',
      address: '',
      phone: '',
      email: '',
      taxId: '',
    },
  });
  const [attachmentType, setAttachmentType] = useState(attachmentTypes[0]);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.companyInfo.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อบริษัท';
    }
    if (formData.companyInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyInfo.email)) {
      newErrors.email = 'กรุณากรอกอีเมลที่ถูกต้อง';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleViewDetails = (po) => {
    setSelectedPO(po);
    setFormData({
      supplierPrices: po.items.reduce((acc, item) => ({ ...acc, [item.id]: item.price }), {}),
      totalAmount: po.totalAmount,
      attachments: po.attachments,
      notes: po.notes,
      companyInfo: po.companyInfo,
    });
    setErrors({});
  };

  const handleInputChange = (itemId, value) => {
    const newPrices = { ...formData.supplierPrices, [itemId]: parseFloat(value) || 0 };
    const newTotal = Object.values(newPrices).reduce((sum, price) => sum + price, 0);
    setFormData({ ...formData, supplierPrices: newPrices, totalAmount: newTotal });
  };

  const handleCompanyInfoChange = (field, value) => {
    setFormData({
      ...formData,
      companyInfo: { ...formData.companyInfo, [field]: value },
    });
    setErrors({ ...errors, [field]: '' });
  };

  const handleNotesChange = (value) => {
    setFormData({ ...formData, notes: value });
  };

  const handleAttachmentChange = (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = files.map(file => ({ name: file.name, type: attachmentType }));
    setFormData({ ...formData, attachments: [...formData.attachments, ...newAttachments] });
  };

  const handleRemoveAttachment = (index) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    setFormData({ ...formData, attachments: newAttachments });
  };

  const handleSaveDetails = () => {
    if (!validateForm()) return;
    const updatedPOs = purchaseOrders.map(po =>
      po.id === selectedPO.id
        ? {
            ...po,
            totalAmount: formData.totalAmount,
            items: po.items.map(item => ({ ...item, price: formData.supplierPrices[item.id] || 0 })),
            attachments: formData.attachments,
            notes: formData.notes,
            companyInfo: formData.companyInfo,
            status: 'บันทึกแล้ว',
          }
        : po
    );
    setPurchaseOrders(updatedPOs);
    setSelectedPO(null);
    console.log('บันทึกข้อมูล:', formData);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>หน้ารายการคำสั่งซื้อ</h1>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>วันที่</th>
              <th className={styles.th}>บริษัทผู้ขาย</th>
              <th className={styles.th}>จำนวนเงินรวม</th>
              <th className={styles.th}>สถานะ</th>
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
                <td className={styles.td}>{po.status}</td>
                <td className={styles.td}>
                  <button className={styles.button} onClick={() => handleViewDetails(po)}>ดูรายละเอียด</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedPO && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>รายละเอียดคำสั่งซื้อ: {selectedPO.id}</h2>
            <p className={styles.modalText}>บริษัทผู้ขาย: {selectedPO.supplier}</p>
            <p className={styles.modalText}>วันที่: {selectedPO.date}</p>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>ข้อมูลบริษัท</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>ชื่อบริษัท:</label>
                <input
                  type="text"
                  value={formData.companyInfo.name}
                  onChange={(e) => handleCompanyInfoChange('name', e.target.value)}
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                />
                {errors.name && <span className={styles.errorText}>{errors.name}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>ที่อยู่:</label>
                <input
                  type="text"
                  value={formData.companyInfo.address}
                  onChange={(e) => handleCompanyInfoChange('address', e.target.value)}
                  placeholder="เช่น 123 ถ.สุขุมวิท กรุงเทพฯ"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>เบอร์โทร:</label>
                <input
                  type="text"
                  value={formData.companyInfo.phone}
                  onChange={(e) => handleCompanyInfoChange('phone', e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>อีเมล:</label>
                <input
                  type="email"
                  value={formData.companyInfo.email}
                  onChange={(e) => handleCompanyInfoChange('email', e.target.value)}
                  className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                />
                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>เลขประจำตัวผู้เสียภาษี:</label>
                <input
                  type="text"
                  value={formData.companyInfo.taxId}
                  onChange={(e) => handleCompanyInfoChange('taxId', e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>ID</th>
                    <th className={styles.th}>ชื่อสินค้า</th>
                    <th className={styles.th}>จำนวน</th>
                    <th className={styles.th}>หน่วย</th>
                    <th className={styles.th}>ประเภท</th>
                    <th className={styles.th}>สเปค</th>
                    <th className={styles.th}>ราคาจากบริษัท (กรอก)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items.map(item => (
                    <tr key={item.id}>
                      <td className={styles.td}>{item.id}</td>
                      <td className={styles.td}>{item.name}</td>
                      <td className={styles.td}>{item.quantity}</td>
                      <td className={styles.td}>{item.unit}</td>
                      <td className={styles.td}>{item.category}</td>
                      <td className={styles.td}>{item.spec}</td>
                      <td className={styles.td}>
                        <input
                          type="number"
                          value={formData.supplierPrices[item.id] || ''}
                          onChange={(e) => handleInputChange(item.id, e.target.value)}
                          placeholder="กรอกราคา (บาท)"
                          className={styles.input}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                จำนวนเงินรวม: {formData.totalAmount.toLocaleString()} บาท
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>หมายเหตุ:</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม"
                className={styles.textarea}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>แนบไฟล์เกี่ยวกับการจัดซื้อ:</label>
              <select
                value={attachmentType}
                onChange={(e) => setAttachmentType(e.target.value)}
                className={styles.select}
              >
                {attachmentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <input
                type="file"
                multiple
                onChange={handleAttachmentChange}
                className={styles.input}
              />
              {formData.attachments.length > 0 && (
                <div className={styles.attachmentTableContainer}>
                  <table className={styles.attachmentTable}>
                    <thead>
                      <tr>
                        <th className={styles.th}>ชื่อไฟล์</th>
                        <th className={styles.th}>ประเภท</th>
                        <th className={styles.th}>การกระทำ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.attachments.map((attach, index) => (
                        <tr key={index}>
                          <td className={styles.td}>{attach.name}</td>
                          <td className={styles.td}>{attach.type}</td>
                          <td className={styles.td}>
                            <button
                              className={styles.removeButton}
                              onClick={() => handleRemoveAttachment(index)}
                            >
                              ลบ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <div>
                <button className={styles.button} onClick={handleSaveDetails}>บันทึก</button>
                <button className={styles.button} onClick={() => setSelectedPO(null)}>ปิด</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderListPage;