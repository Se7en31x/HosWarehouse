'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import { FaChevronLeft, FaPrint, FaSync, FaUpload, FaTrash, FaBan } from 'react-icons/fa';
import '@/app/utils/fonts/sarabun-normal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper function to format numbers to Thai baht
const thb = (v) => (Number(v) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusMap = {
  issued: { text: 'บันทึกแล้ว', cls: 'badgeBlue' },
  canceled: { text: 'ยกเลิก', cls: 'badgeRed' },
};

function StatusBadge({ status }) {
  const map = statusMap[status] || { text: status || '-', cls: 'badgeGray' };
  return <span className={`${styles.badge} ${styles[map.cls]}`}>{map.text}</span>;
}

export default function PODetailPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState(null);
  const [files, setFiles] = useState([]);     // รายการไฟล์แนบ
  const [uploading, setUploading] = useState(false);

  // Memoize computed values to prevent unnecessary recalculations
  const computed = useMemo(() => {
    if (!po?.items?.length) return { sub: 0, vat: 0, grand: 0 };
    const sub = po.items.reduce((a, r) => a + ((+r.qty || 0) * (+r.unit_price || 0) - (+r.discount || 0)), 0);
    const vatRate = Number(po?.terms?.vat_rate) || 0;
    const vat = sub * vatRate / 100;
    return { sub, vat, grand: sub + vat };
  }, [po]);

  // Fetch PO detail data from the backend
  const fetchDetail = async (poId) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/po/${poId}`);
      setPo(res.data);

      // Fetch attached files
      try {
        const f = await axiosInstance.get(`/po/${poId}/files`);
        setFiles(f.data || []);
      } catch { setFiles([]); }

    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'โหลดรายละเอียด PO ไม่สำเร็จ', 'error');
      // If fetching fails, clear the PO data
      setPo(null);
    } finally {
      setLoading(false);
    }
  };

  // Main effect to handle ID validation and data fetching
  useEffect(() => {
    // ✅ Add validation for the ID parameter
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) {
      console.error('Invalid PO ID:', id);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่พบเลขที่ใบสั่งซื้อที่ถูกต้อง กรุณาตรวจสอบ URL',
        confirmButtonText: 'กลับหน้าหลัก'
      }).then(() => {
        router.push('/purchasing/po');
      });
      setLoading(false);
    } else {
      fetchDetail(parsedId);
    }
  }, [id, router]);

  const onBack = () => router.push('/purchasing/po');

  // Cancel the document
  const onCancel = async () => {
    if (po?.status === 'canceled') return;
    const { value: reason, isConfirmed } = await Swal.fire({
      title: 'ยกเลิกเอกสาร?',
      input: 'text',
      inputLabel: 'เหตุผลการยกเลิก (ระบุสั้นๆ)',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันยกเลิก',
      cancelButtonText: 'ยกเลิก',
    });
    if (!isConfirmed) return;

    try {
      await axiosInstance.put(`/po/${po.po_id}/cancel`, { reason: reason || '' });
      await fetchDetail(po.po_id);
      Swal.fire('สำเร็จ', 'ยกเลิกเอกสารแล้ว', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'ไม่สามารถยกเลิกเอกสารได้', 'error');
    }
  };

  // Upload attachment file
  const onUpload = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await axiosInstance.post(`/po/${po.po_id}/files`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const f = await axiosInstance.get(`/po/${po.po_id}/files`);
      setFiles(f.data || []);
      Swal.fire('อัปโหลดแล้ว', 'บันทึกไฟล์แนบเรียบร้อย', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'อัปโหลดไฟล์ไม่สำเร็จ', 'error');
    } finally {
      setUploading(false);
      evt.target.value = ''; // reset input
    }
  };

  // Remove attachment file
  const onRemoveFile = async (file_id) => {
    const ok = await Swal.fire({ title: 'ลบไฟล์?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ' });
    if (!ok.isConfirmed) return;
    try {
      await axiosInstance.delete(`/po/${po.po_id}/files/${file_id}`);
      setFiles((prev) => prev.filter((f) => f.file_id !== file_id));
      Swal.fire('ลบแล้ว', '', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'ลบไฟล์ไม่สำเร็จ', 'error');
    }
  };

  // Export PDF
  const exportPDF = () => {
    if (!po) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    try { doc.setFont('Sarabun', 'normal'); } catch { }
    const marginX = 36; let y = 48;
    doc.setFontSize(16); doc.text('ใบสั่งซื้อ (PO)', marginX, y); y += 20;
    doc.setFontSize(11);
    doc.text(`เลขที่: ${po.po_no || '-'}`, marginX, y); y += 16;
    doc.text(`วันที่: ${po.po_date ? new Date(po.po_date).toLocaleDateString('th-TH') : '-'}`, marginX, y); y += 24;

    const v = po.vendor || {};
    doc.setFontSize(12); doc.text('ข้อมูลผู้ขาย', marginX, y); y += 16;
    doc.setFontSize(10);
    doc.text([`ชื่อ: ${v.name || '-'}`, `ที่อยู่: ${v.address || '-'}`, `ผู้ติดต่อ: ${v.contact || '-'}`, `โทร: ${v.phone || '-'}   อีเมล: ${v.email || '-'}`], marginX, y);
    const rightX = 330;
    doc.setFontSize(12); doc.text('ข้อมูลอ้างอิง', rightX, y - 16);
    doc.setFontSize(10);
    doc.text([
      `สถานะ: ${statusMap[po.status]?.text || po.status || '-'}`,
      `PR No.: ${po?.reference?.pr_no || '-'}`,
      `เครดิต: ${po?.terms?.credit_days ?? '-'} วัน`,
      `ส่งของภายใน: ${po?.terms?.delivery_days ?? '-'} วัน`,
    ], rightX, y);
    y += 72;

    const rows = (po.items || []).map((r, i) => [
      i + 1, r.code || '-', r.name || '-', r.unit || '-',
      String(r.qty || 0), thb(r.unit_price || 0), thb(r.discount || 0),
      thb((+r.qty || 0) * (+r.unit_price || 0) - (+r.discount || 0))
    ]);
    autoTable(doc, {
      startY: y,
      head: [['#', 'รหัส', 'ชื่อพัสดุ', 'หน่วย', 'จำนวน', 'ราคาต่อหน่วย', 'ส่วนลด', 'รวม/รายการ']],
      body: rows, styles: { font: 'Sarabun', fontSize: 10 }, headStyles: { fillColor: [230, 230, 230] },
      theme: 'grid', margin: { left: marginX, right: marginX },
    });
    const endY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.text(`ยอดก่อนภาษี: ${thb(po?.summary?.sub_total ?? computed.sub)} บาท`, 360, endY);
    doc.text(`VAT ${po?.terms?.vat_rate ?? 0}%: ${thb(po?.summary?.vat ?? computed.vat)} บาท`, 360, endY + 16);
    doc.setFontSize(12);
    doc.text(`รวมทั้งสิ้น: ${thb(po?.summary?.grand_total ?? computed.grand)} บาท`, 360, endY + 34);
    doc.save(`${po.po_no || 'PO'}.pdf`);
  };

  if (loading) return <div className={styles.page}>กำลังโหลด...</div>;
  if (!po) return <div className={styles.page}>ไม่พบข้อมูล PO</div>;

  const canCancel = po.status === 'issued'; // ยกเลิกได้เฉพาะเอกสารที่ยังไม่ถูกยกเลิก

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.leftGroup}>
          <button className={styles.btnGhost} onClick={onBack}><FaChevronLeft /> กลับ</button>
          <h1>รายละเอียดใบสั่งซื้อ</h1>
          <StatusBadge status={po.status} />
        </div>
        <div className={styles.headerActions}>
          {canCancel && (
            <button className={styles.btnDanger} onClick={onCancel} title="ยกเลิกเอกสาร">
              <FaBan /> ยกเลิกเอกสาร
            </button>
          )}
          <button className={styles.btnGhost} onClick={() => fetchDetail(po.po_id)}><FaSync /> รีเฟรช</button>
          <button className={styles.btnPrimary} onClick={exportPDF}><FaPrint /> พิมพ์/บันทึก PDF</button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.grid3}>
          <div>
            <b>เลขที่ PO:</b> {po.po_no || '-'}
          </div>
          <div>
            <b>วันที่:</b> {po.po_date ? new Date(po.po_date).toLocaleDateString('th-TH') : '-'}
          </div>
          <div>
            <b>สถานะ:</b> <StatusBadge status={po.status} />
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>ข้อมูลผู้ขาย</h2>
        <div className={styles.grid2}>
          <div>
            <b>ชื่อผู้ขาย:</b> {po.vendor?.name || '-'}
          </div>
          <div>
            <b>ที่อยู่:</b> {po.vendor?.address || '-'}
          </div>
          <div>
            <b>ผู้ติดต่อ:</b> {po.vendor?.contact || '-'}
          </div>
          <div>
            <b>เบอร์โทรศัพท์:</b> {po.vendor?.phone || '-'}
          </div>
          <div>
            <b>อีเมล:</b> {po.vendor?.email || '-'}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h2>รายการสินค้า</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>รหัส</th>
                <th>ชื่อพัสดุ</th>
                <th>หน่วย</th>
                <th>จำนวน</th>
                <th>ราคา/หน่วย</th>
                <th>ส่วนลด</th>
                <th>รวม/รายการ</th>
              </tr>
            </thead>
            <tbody>
              {(po.items || []).map((item, index) => (
                <tr key={index}>
                  <td className={styles.center}>{index + 1}</td>
                  <td>{item.code || '-'}</td>
                  <td>{item.name || '-'}</td>
                  <td className={styles.center}>{item.unit || '-'}</td>
                  <td className={styles.center}>{thb(item.qty)}</td>
                  <td className={styles.right}>{thb(item.unit_price)}</td>
                  <td className={styles.right}>{thb(item.discount)}</td>
                  <td className={styles.right}>{thb(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <h2>สรุปยอด</h2>
        <div className={styles.summaryWrap}>
          <div className={styles.summaryRow}>
            <span>ยอดก่อนภาษี:</span>
            <span>{thb(po.summary?.sub_total)} บาท</span>
          </div>
          <div className={styles.summaryRow}>
            <span>ภาษีมูลค่าเพิ่ม ({po.terms?.vat_rate || 0}%):</span>
            <span>{thb(po.summary?.vat)} บาท</span>
          </div>
          <div className={`${styles.summaryRow} ${styles.grand}`}>
            <span>ยอดรวมทั้งสิ้น:</span>
            <span>{thb(po.summary?.grand_total)} บาท</span>
          </div>
        </div>
      </div>

      {/* ไฟล์แนบ */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <h2>ไฟล์แนบ</h2>
          <label className={styles.btnPrimary} style={{ opacity: uploading || po.status === 'canceled' ? 0.5 : 1 }}>
            <FaUpload /> แนบไฟล์
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={onUpload}
              disabled={uploading || po.status === 'canceled'}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {files.length === 0 ? (
          <div className={styles.muted}>ยังไม่มีไฟล์แนบ</div>
        ) : (
          <div className={styles.fileGrid}>
            {files.map((f) => (
              <div key={f.file_id} className={styles.fileItem}>
                <a
                  href={`http://localhost:5000${f.file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fileLink}>
                  {f.file_name}
                </a>
                <div className={styles.fileMeta}>
                  <span>อัปโหลด: {new Date(f.uploaded_at).toLocaleString('th-TH')}</span>
                </div>
                {po.status !== 'canceled' && (
                  <button className={styles.btnSmallDanger} onClick={() => onRemoveFile(f.file_id)}>
                    <FaTrash /> ลบ
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
