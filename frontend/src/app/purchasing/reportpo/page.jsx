"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import styles from './page.module.css';

// ข้อมูลตัวอย่าง (ใช้จาก initialPurchaseOrders เดียวกัน)
const initialPurchaseOrders = [
  {
    id: 'PO-001',
    date: '2025-08-26',
    supplier: 'บริษัท A',
    totalAmount: 5000,
    status: 'บันทึกแล้ว',
    companyInfo: { name: 'บริษัท A จำกัด', address: '123 ถ.สุขุมวิท กรุงเทพฯ', phone: '02-123-4567', email: 'contact@a.co', taxId: '1234567890123' },
    items: [
      { id: '001', name: 'ยาแก้ปวด', quantity: 100, unit: 'ขวด', category: 'ยา', spec: 'ขนาด 500mg, ยี่ห้อ XYZ', price: 3000, received: 80, status: 'รับบางส่วน' },
      { id: '002', name: 'ผ้าก๊อซ', quantity: 50, unit: 'ม้วน', category: 'เวชภัณฑ์', spec: 'ขนาด 10cm x 10m', price: 2000, received: 50, status: 'รับครบ' },
    ],
    attachments: [{ name: 'quotation.pdf', type: 'ใบเสนอราคา' }, { name: 'invoice.pdf', type: 'ใบกำกับภาษี' }],
    receiptStatus: 'รับบางส่วน',
    notes: 'ตามเรื่องของไม่ครบ (ยาแก้ปวด 20 ขวด) กับบริษัท A',
    updatedBy: 'user1',
    updatedAt: '2025-08-26 10:00:00',
  },
  {
    id: 'PO-002',
    date: '2025-08-27',
    supplier: 'บริษัท B',
    totalAmount: 3000,
    status: 'เสร็จสิ้น',
    companyInfo: { name: 'บริษัท B จำกัด', address: '456 ถ.รัชดา กรุงเทพฯ', phone: '02-987-6543', email: 'contact@b.co', taxId: '9876543210987' },
    items: [
      { id: '003', name: 'เครื่องวัดความดัน', quantity: 5, unit: 'ชิ้น', category: 'อุปกรณ์ทางการแพทย์', spec: 'ดิจิทัล, ยี่ห้อ Omron', price: 3000, received: 5, status: 'รับครบ' },
    ],
    attachments: [{ name: 'delivery_note.pdf', type: 'ใบส่งของ' }],
    receiptStatus: 'รับครบ',
    notes: '',
    updatedBy: 'user2',
    updatedAt: '2025-08-27 12:00:00',
  },
];

const ReportPage = () => {
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [selectedPO, setSelectedPO] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    receiptStatus: 'all',
    supplier: 'all',
  });

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const startDateMatch = !filters.startDate || new Date(po.date) >= new Date(filters.startDate);
    const endDateMatch = !filters.endDate || new Date(po.date) <= new Date(filters.endDate);
    const statusMatch = filters.status === 'all' || po.status === filters.status;
    const receiptStatusMatch = filters.receiptStatus === 'all' || po.receiptStatus === filters.receiptStatus;
    const supplierMatch = filters.supplier === 'all' || po.supplier === filters.supplier;
    return startDateMatch && endDateMatch && statusMatch && receiptStatusMatch && supplierMatch;
  });

  const handleViewDetails = (po) => {
    setSelectedPO(po);
  };

  const handleExportCSV = () => {
    const headers = [
      'ID,วันที่,บริษัทผู้ขาย,จำนวนเงินรวม,สถานะ PO,สถานะรับเข้า,ชื่อบริษัท,ที่อยู่,เบอร์โทร,อีเมล,เลขประจำตัวผู้เสียภาษี,ไฟล์แนบ,หมายเหตุ,ผู้บันทึก,วันที่บันทึก'
    ];
    const rows = filteredPOs.map(po => [
      po.id,
      po.date,
      po.supplier,
      po.totalAmount.toLocaleString(),
      po.status,
      po.receiptStatus,
      po.companyInfo.name,
      po.companyInfo.address,
      po.companyInfo.phone,
      po.companyInfo.email,
      po.companyInfo.taxId,
      po.attachments.map(a => `${a.name} (${a.type})`).join('; '),
      po.notes.replace(/,/g, ' '),
      po.updatedBy,
      po.updatedAt,
    ].map(field => `"${field}"`).join(','));

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PO_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('รายงานคำสั่งซื้อ', 20, 20);
    doc.setFontSize(12);
    filteredPOs.forEach((po, index) => {
      const y = 30 + index * 40;
      doc.text(`ID: ${po.id}`, 20, y);
      doc.text(`วันที่: ${po.date}`, 20, y + 5);
      doc.text(`บริษัทผู้ขาย: ${po.supplier}`, 20, y + 10);
      doc.text(`จำนวนเงินรวม: ${po.totalAmount.toLocaleString()} บาท`, 20, y + 15);
      doc.text(`สถานะ PO: ${po.status}`, 20, y + 20);
      doc.text(`สถานะรับเข้า: ${po.receiptStatus}`, 20, y + 25);
      doc.text(`หมายเหตุ: ${po.notes || '-'}`, 20, y + 30);
    });
    doc.save(`PO_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>หน้ารายงานคำสั่งซื้อ</h1>
      <div className={styles.filterContainer}>
        <div className={styles.formGroup}>
          <label className={styles.label}>วันที่เริ่ม:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>วันที่สิ้นสุด:</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>สถานะ PO:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className={styles.select}
          >
            <option value="all">ทั้งหมด</option>
            <option value="รอดำเนินการ">รอดำเนินการ</option>
            <option value="บันทึกแล้ว">บันทึกแล้ว</option>
            <option value="เสร็จสิ้น">เสร็จสิ้น</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>สถานะรับเข้า:</label>
          <select
            value={filters.receiptStatus}
            onChange={(e) => handleFilterChange('receiptStatus', e.target.value)}
            className={styles.select}
          >
            <option value="all">ทั้งหมด</option>
            <option value="รอรับ">รอรับ</option>
            <option value="รับบางส่วน">รับบางส่วน</option>
            <option value="รับครบ">รับครบ</option>
            <option value="ปฏิเสธ">ปฏิเสธ</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>บริษัทผู้ขาย:</label>
          <select
            value={filters.supplier}
            onChange={(e) => handleFilterChange('supplier', e.target.value)}
            className={styles.select}
          >
            <option value="all">ทั้งหมด</option>
            {[...new Set(purchaseOrders.map(po => po.supplier))].map(supplier => (
              <option key={supplier} value={supplier}>{supplier}</option>
            ))}
          </select>
        </div>
        <div className={styles.formGroup}>
          <button className={styles.button} onClick={handleExportCSV}>ส่งออก CSV</button>
          <button className={styles.button} onClick={handleExportPDF}>ส่งออก PDF</button>
        </div>
      </div>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>วันที่</th>
              <th className={styles.th}>บริษัทผู้ขาย</th>
              <th className={styles.th}>จำนวนเงินรวม</th>
              <th className={styles.th}>สถานะ PO</th>
              <th className={styles.th}>สถานะรับเข้า</th>
              <th className={styles.th}>หมายเหตุ</th>
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
                <td className={styles.td}>{po.receiptStatus}</td>
                <td className={styles.td}>{po.notes || '-'}</td>
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
            <p className={styles.modalText}>สถานะ PO: {selectedPO.status}</p>
            <p className={styles.modalText}>สถานะรับเข้า: {selectedPO.receiptStatus}</p>
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
                      <th className={styles.th}>จำนวนสั่งซื้อ</th>
                      <th className={styles.th}>หน่วย</th>
                      <th className={styles.th}>ประเภท</th>
                      <th className={styles.th}>สเปค</th>
                      <th className={styles.th}>ราคา</th>
                      <th className={styles.th}>จำนวนรับเข้า</th>
                      <th className={styles.th}>สถานะ</th>
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
                        <td className={styles.td}>{item.received}</td>
                        <td className={styles.td}>{item.status}</td>
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

export default ReportPage;