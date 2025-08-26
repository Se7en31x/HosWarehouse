"use client";

import { useState } from "react";
import styles from './page.module.css';

// ข้อมูลตัวอย่าง (ใช้จาก initialPurchaseOrders เดียวกัน)
const initialPurchaseOrders = [
  {
    id: 'PO-001',
    date: '2025-08-26',
    supplier: 'บริษัท A',
    totalAmount: 0,
    status: 'รอดำเนินการ',
    companyInfo: { name: '', address: '', phone: '', email: '', taxId: '' },
    items: [
      { id: '001', name: 'ยาแก้ปวด', quantity: 100, unit: 'ขวด', category: 'ยา', spec: 'ขนาด 500mg, ยี่ห้อ XYZ', price: 0 },
      { id: '002', name: 'ผ้าก๊อซ', quantity: 50, unit: 'ม้วน', category: 'เวชภัณฑ์', spec: 'ขนาด 10cm x 10m', price: 0 },
    ],
    attachments: [],
    notes: '',
    updatedBy: 'user1',
    updatedAt: '2025-08-26 10:00:00',
  },
  {
    id: 'PO-002',
    date: '2025-08-27',
    supplier: 'บริษัท B',
    totalAmount: 0,
    status: 'รอดำเนินการ',
    companyInfo: { name: '', address: '', phone: '', email: '', taxId: '' },
    items: [
      { id: '003', name: 'เครื่องวัดความดัน', quantity: 5, unit: 'ชิ้น', category: 'อุปกรณ์ทางการแพทย์', spec: 'ดิจิทัล, ยี่ห้อ Omron', price: 0 },
    ],
    attachments: [],
    notes: '',
    updatedBy: 'user2',
    updatedAt: '2025-08-27 12:00:00',
  },
];

const PurchaseOrderHistoryPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [selectedPO, setSelectedPO] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const handleViewDetails = (po) => {
    setSelectedPO(po);
  };

  const handleExportCSV = () => {
    const headers = ['ID,วันที่,บริษัทผู้ขาย,จำนวนเงินรวม,สถานะ,ชื่อบริษัท,ที่อยู่,เบอร์โทร,อีเมล,เลขประจำตัวผู้เสียภาษี,ไฟล์แนบ,หมายเหตุ,ผู้บันทึก,วันที่บันทึก'];
    const rows = purchaseOrders.map(po => [
      po.id,
      po.date,
      po.supplier,
      po.totalAmount.toLocaleString(),
      po.status,
      po.companyInfo.name,
      po.companyInfo.address,
      po.companyInfo.phone,
      po.companyInfo.email,
      po.companyInfo.taxId,
      po.attachments.map(a => `${a.name} (${a.type})`).join('; '),
      po.notes.replace(/,/g, ' '), // ป้องกัน comma ใน CSV
      po.updatedBy,
      po.updatedAt,
    ].map(field => `"${field}"`).join(','));

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PO_History_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const filteredPOs = filterStatus === 'all' ? purchaseOrders : purchaseOrders.filter(po => po.status === filterStatus);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ประวัติคำสั่งซื้อ</h1>
      <div className={styles.filterContainer}>
        <label className={styles.label}>กรองตามสถานะ:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.select}
        >
          <option value="all">ทั้งหมด</option>
          <option value="รอดำเนินการ">รอดำเนินการ</option>
          <option value="บันทึกแล้ว">บันทึกแล้ว</option>
        </select>
        <button className={styles.button} onClick={handleExportCSV}>ส่งออก CSV</button>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>วันที่</th>
              <th className={styles.th}>บริษัทผู้ขาย</th>
              <th className={styles.th}>จำนวนเงินรวม</th>
              <th className={styles.th}>สถานะ</th>
              <th className={styles.th}>ผู้บันทึก</th>
              <th className={styles.th}>วันที่บันทึก</th>
              <th className={styles.th}>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map(po => (
              <tr key={po.id}>
                <td className={styles.td}>{po.id}</td>
                <td className={styles.td}>{po.date}</td>
                <td className={styles.td}>{po.supplier}</td>
                <td className={styles.td}>{po.totalAmount.toLocaleString()} บาท</td>
                <td className={styles.td}>{po.status}</td>
                <td className={styles.td}>{po.updatedBy}</td>
                <td className={styles.td}>{po.updatedAt}</td>
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
            <p className={styles.modalText}>สถานะ: {selectedPO.status}</p>
            <p className={styles.modalText}>ผู้บันทึก: {selectedPO.updatedBy}</p>
            <p className={styles.modalText}>วันที่บันทึก: {selectedPO.updatedAt}</p>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>ข้อมูลบริษัท</h3>
              <p className={styles.modalText}>ชื่อบริษัท: {selectedPO.companyInfo.name || '-'}</p>
              <p className={styles.modalText}>ที่อยู่: {selectedPO.companyInfo.address || '-'}</p>
              <p className={styles.modalText}>เบอร์โทร: {selectedPO.companyInfo.phone || '-'}</p>
              <p className={styles.modalText}>อีเมล: {selectedPO.companyInfo.email || '-'}</p>
              <p className={styles.modalText}>เลขประจำตัวผู้เสียภาษี: {selectedPO.companyInfo.taxId || '-'}</p>
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>รายการสินค้า</h3>
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
                      <th className={styles.th}>ราคา</th>
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
                        <td className={styles.td}>{item.price.toLocaleString()} บาท</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>ไฟล์แนบ</h3>
              {selectedPO.attachments.length > 0 ? (
                <div className={styles.attachmentTableContainer}>
                  <table className={styles.attachmentTable}>
                    <thead>
                      <tr>
                        <th className={styles.th}>ชื่อไฟล์</th>
                        <th className={styles.th}>ประเภท</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.attachments.map((attach, index) => (
                        <tr key={index}>
                          <td className={styles.td}>{attach.name}</td>
                          <td className={styles.td}>{attach.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.modalText}>ไม่มีไฟล์แนบ</p>
              )}
            </div>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>หมายเหตุ</h3>
              <p className={styles.modalText}>{selectedPO.notes || '-'}</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.button} onClick={() => setSelectedPO(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderHistoryPage;