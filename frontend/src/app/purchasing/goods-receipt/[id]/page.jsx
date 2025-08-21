// src/app/goods-receipt/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from '@/app/purchasing/po/page.module.css';
import { FaChevronLeft, FaPrint, FaSync } from 'react-icons/fa';
import '@/app/utils/fonts/sarabun-normal'; // Sarabun font for PDF export
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to format currency
const thb = (v) => (Number(v) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GRDetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [gr, setGr] = useState(null);

  // Function to fetch GR details from API
  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/gr/${id}`);
      setGr(res.data);
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'โหลดรายละเอียดเอกสารรับของไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  // Handler for back button
  const onBack = () => router.push('/goods-receipt');

  // Function to export GR details as a PDF
  const exportPDF = () => {
    if (!gr) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    try { doc.setFont('Sarabun', 'normal'); } catch {}
    const marginX = 36;
    let y = 48;

    doc.setFontSize(16);
    doc.text('ใบรับของเข้า (Goods Receipt)', marginX, y);
    y += 20;

    doc.setFontSize(11);
    doc.text(`เลขที่ GR: ${gr.gr_no || '-'}`, marginX, y);
    y += 16;
    doc.text(`วันที่รับของ: ${gr.gr_date ? new Date(gr.gr_date).toLocaleDateString('th-TH') : '-'}`, marginX, y);
    y += 16;
    doc.text(`เลขที่ใบส่งของ: ${gr.delivery_note || '-'}`, marginX, y);
    y += 24;

    const rightX = 330;
    doc.setFontSize(12);
    doc.text('ข้อมูลอ้างอิง', rightX, y - 56);
    doc.setFontSize(10);
    doc.text(`เลขที่ PO: ${gr.po_id?.po_no || '-'}`, rightX, y - 40);
    doc.text(`ผู้ขาย: ${gr.vendor_name || '-'}`, rightX, y - 24);

    y += 48;

    const rows = (gr.items || []).map((r, i) => [
      i + 1,
      r.name || '-',
      r.unit || '-',
      thb(r.qty || 0)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'ชื่อพัสดุ', 'หน่วย', 'จำนวนที่รับเข้า']],
      body: rows,
      styles: { font: 'Sarabun', fontSize: 10 },
      headStyles: { fillColor: [230, 230, 230] },
      theme: 'grid',
      margin: { left: marginX, right: marginX },
    });

    doc.save(`${gr.gr_no || 'GR'}.pdf`);
  };

  if (loading) return <div className={styles.page}>กำลังโหลด...</div>;
  if (!gr) return <div className={styles.page}>ไม่พบข้อมูลเอกสารรับของ</div>;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.leftGroup}>
          <button className={styles.btnGhost} onClick={onBack}>
            <FaChevronLeft /> กลับ
          </button>
          <h1>รายละเอียดเอกสารรับของเข้า</h1>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnGhost} onClick={fetchDetail}>
            <FaSync /> รีเฟรช
          </button>
          <button className={styles.btnPrimary} onClick={exportPDF}>
            <FaPrint /> พิมพ์/บันทึก PDF
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.grid2}>
          <div>
            <b>เลขที่ GR:</b> {gr.gr_no || '-'}
          </div>
          <div>
            <b>วันที่รับของ:</b> {gr.gr_date ? new Date(gr.gr_date).toLocaleDateString('th-TH') : '-'}
          </div>
          <div>
            <b>เลขที่ใบสั่งซื้อ:</b> {gr.po_id?.po_no || '-'}
          </div>
          <div>
            <b>ผู้ขาย:</b> {gr.vendor_name || '-'}
          </div>
          <div>
            <b>เลขที่ใบส่งของ:</b> {gr.delivery_note || '-'}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>รายการสินค้าที่รับเข้า</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>ชื่อพัสดุ</th>
                <th>หน่วย</th>
                <th className={styles.right}>จำนวนที่รับเข้า</th>
              </tr>
            </thead>
            <tbody>
              {(gr.items || []).map((item, index) => (
                <tr key={index}>
                  <td className={styles.center}>{index + 1}</td>
                  <td>{item.name || '-'}</td>
                  <td className={styles.center}>{item.unit || '-'}</td>
                  <td className={styles.right}>{thb(item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
