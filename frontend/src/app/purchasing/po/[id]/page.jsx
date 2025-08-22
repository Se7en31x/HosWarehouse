'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import { FaPrint, FaUpload, FaTrash } from 'react-icons/fa';
import exportPDF from '@/app/components/pdf/PDFExporter';
import poTemplate from '@/app/components/pdf/templates/poTemplate';

const thb = (v) => (Number(v) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusMap = {
  issued:   { text: 'บันทึกแล้ว', cls: 'badgeIssued' },
  canceled: { text: 'ยกเลิก',     cls: 'badgeCanceled' },
};

function StatusBadge({ status }) {
  const map = statusMap[status] || { text: status || '-', cls: 'badgeGray' };
  return <span className={`${styles.badge} ${styles[map.cls]}`}>{map.text}</span>;
}

const mapPoToTemplate = (po) => ({
  // หน่วยงาน
  hospital_name: po.hospital?.name,
  hospital_address: po.hospital?.address,
  hospital_phone: po.hospital?.phone,
  hospital_email: po.hospital?.email,

  // เอกสาร
  po_no: po.po_no,
  po_date: po.po_date,
  pr_no: po.reference?.pr_no,
  quotation_no: po.reference?.quotation_no,
  requester_dept: po.requester?.dept,
  created_by_name: po.created_by?.name,
  status: po.status,

  // ผู้ขาย
  supplier_name: po.vendor?.name,
  supplier_contact: po.vendor?.contact,
  supplier_phone: po.vendor?.phone,
  supplier_email: po.vendor?.email,
  supplier_address: po.vendor?.address,
  supplier_taxid: po.vendor?.taxid,

  // รายการ
  items: (po.items || []).map((r) => {
    const code =
      r.code ?? r.item_code ?? r.product_code ?? r.material_code ?? r.sku ??
      r.ItemCode ?? r.productCode ?? r.materialCode ??
      r.item?.code ?? r.product?.code ?? r.material?.code ??
      r.barcode ?? r.plu ?? null;

    return {
      code,
      item_name: r.name ?? r.item_name ?? r.description ?? '-',
      unit: r.unit ?? r.uom ?? r.unit_name ?? '-',
      qty: r.qty ?? r.quantity ?? 0,
      unit_price: r.unit_price ?? r.price ?? r.quoted_unit_price ?? 0,
      discount: r.discount ?? 0,
      spec: r.spec ?? r.specification ?? '',
      brand: r.brand ?? '',
      model: r.model ?? '',
      remark: r.remark ?? r.note ?? '',
    };
  }),

  // สรุป/เงื่อนไข
  shipping_fee: po.summary?.shipping_fee ?? po.shipping_fee ?? 0,
  vat_exempt: po.terms?.vat_exempt,
  vat_rate: po.terms?.vat_rate,
  currency: po.terms?.currency ?? 'THB',
  delivery_place: po.terms?.delivery_place,
  delivery_date: po.terms?.delivery_date,
  payment_terms:
    po.terms?.payment_terms ??
    (po.terms?.credit_days ? `เครดิต ${po.terms.credit_days} วัน` : undefined),
  receiver_name: po.receiver?.name,
  receiver_dept: po.receiver?.dept,
  note: po.note,
});

export default function PODetailPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/po/${id}`);
      setPo(res.data);

      try {
        const f = await axiosInstance.get(`/po/${id}/files`);
        setFiles(f.data || []);
      } catch { setFiles([]); }
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'โหลดรายละเอียด PO ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchDetail(); /* eslint-disable-next-line */ }, [id]);

  // คำนวณยอดสำรองเมื่อ backend ไม่ส่ง summary
  const summary = useMemo(() => {
    if (!po) return { sub: 0, vat: 0, grand: 0 };
    const sub = (po.items || []).reduce((a, r) => a + ((+r.qty || 0) * (+r.unit_price || 0) - (+r.discount || 0)), 0);
    const vatRate = Number(po?.terms?.vat_rate) || 0;
    const vat = sub * vatRate / 100;
    return {
      sub: po.summary?.sub_total ?? sub,
      vat: po.summary?.vat ?? vat,
      grand: po.summary?.grand_total ?? (sub + vat),
    };
  }, [po]);

  const onPrint = async () => {
    if (!po) return;
    const payload = mapPoToTemplate(po);
    const tpl = poTemplate(payload, (d) => new Date(d).toLocaleDateString('th-TH'));
    await exportPDF(tpl);
  };

  const onUpload = async (evt) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await axiosInstance.post(`/po/${id}/files`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const f = await axiosInstance.get(`/po/${id}/files`);
      setFiles(f.data || []);
      Swal.fire('อัปโหลดแล้ว', 'บันทึกไฟล์แนบเรียบร้อย', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'อัปโหลดไฟล์ไม่สำเร็จ', 'error');
    } finally {
      setUploading(false);
      evt.target.value = '';
    }
  };

  const onRemoveFile = async (file_id) => {
    const ok = await Swal.fire({ title: 'ลบไฟล์?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ' });
    if (!ok.isConfirmed) return;
    try {
      await axiosInstance.delete(`/po/${id}/files/${file_id}`);
      setFiles((prev) => prev.filter((f) => f.file_id !== file_id));
      Swal.fire('ลบแล้ว', '', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('ผิดพลาด', 'ลบไฟล์ไม่สำเร็จ', 'error');
    }
  };

  if (loading) return <div className={styles.page}>กำลังโหลด...</div>;
  if (!po) return <div className={styles.page}>ไม่พบข้อมูล PO</div>;

  const canceled = po.status === 'canceled';

  return (
    <div className={styles.page}>
      <div className={styles.frame}>
        {/* Top Bar */}
        <div className={styles.topbar}>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>ใบสั่งซื้อ (PO)</h1>
            <div className={styles.metaChips}>
              <span className={styles.chip}><b>เลขที่:</b> {po.po_no || '-'}</span>
              <span className={styles.chip}><b>วันที่:</b> {po.po_date ? new Date(po.po_date).toLocaleDateString('th-TH') : '-'}</span>
              <StatusBadge status={po.status} />
            </div>
          </div>
          <div className={styles.actions}>
            <button className={styles.btnPrimary} onClick={onPrint}><FaPrint /> พิมพ์/บันทึก PDF</button>
          </div>
        </div>

        {/* Layout: main + aside */}
        <div className={styles.layout}>
          <main className={styles.main}>
            {/* เอกสาร/อ้างอิง */}
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>ข้อมูลเอกสาร</h2>
              <div className={styles.grid3}>
                <div><b>อ้างอิงใบขอซื้อ (PR):</b> {po.reference?.pr_no || '-'}</div>
                <div><b>อ้างอิงใบเสนอราคา:</b> {po.reference?.quotation_no || '-'}</div>
                <div><b>ผู้ร้องขอ/แผนก:</b> {po.requester?.dept || '-'}</div>
                <div><b>ผู้ออกเอกสาร:</b> {po.created_by?.name || '-'}</div>
                <div><b>สกุลเงิน:</b> {po.terms?.currency || 'THB'}</div>
                <div><b>หมายเหตุ:</b> {po.note || '-'}</div>
              </div>
            </section>

            {/* ผู้ขาย */}
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>ข้อมูลผู้ขาย</h2>
              <div className={styles.grid2}>
                <div><b>ชื่อผู้ขาย:</b> {po.vendor?.name || '-'}</div>
                <div><b>เลขประจำตัวผู้เสียภาษี:</b> {po.vendor?.taxid || '-'}</div>
                <div><b>ผู้ติดต่อ:</b> {po.vendor?.contact || '-'}</div>
                <div><b>เบอร์โทรศัพท์:</b> {po.vendor?.phone || '-'}</div>
                <div><b>อีเมล:</b> {po.vendor?.email || '-'}</div>
                <div><b>ที่อยู่:</b> {po.vendor?.address || '-'}</div>
              </div>
            </section>

            {/* เงื่อนไข/การส่งมอบ */}
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>เงื่อนไขการซื้อ/ส่งมอบ</h2>
              <div className={styles.grid3}>
                <div><b>สถานที่ส่งมอบ:</b> {po.terms?.delivery_place || '-'}</div>
                <div><b>วันที่ส่งมอบ:</b> {po.terms?.delivery_date ? new Date(po.terms.delivery_date).toLocaleDateString('th-TH') : '-'}</div>
                <div><b>เงื่อนไขชำระเงิน:</b> {po.terms?.payment_terms || '-'}</div>
              </div>
            </section>

            {/* รายการสินค้า */}
            <section className={styles.card}>
              <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  {/* คุมความกว้างคอลัมน์ */}
                  <colgroup>
                    <col className={styles.colIndex} />
                    <col className={styles.colCode} />
                    <col className={styles.colName} />
                    <col className={styles.colUnit} />
                    <col className={styles.colQty} />
                    <col className={styles.colPrice} />
                    <col className={styles.colDiscount} />
                    <col className={styles.colTotal} />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>#</th>
                      <th>รหัส</th>
                      <th>ชื่อพัสดุ</th>
                      <th>หน่วย</th>
                      <th className={styles.thRight}>จำนวน</th>
                      <th className={styles.thRight}>ราคา/หน่วย</th>
                      <th className={styles.thRight}>ส่วนลด</th>
                      <th className={styles.thRight}>รวม/รายการ</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(po.items || []).map((item, i) => {
                      const lineTotal = ((+item.qty || 0) * (+item.unit_price || 0)) - (+item.discount || 0);
                      return (
                        <tr key={i} className={styles.row}>
                          <td className={styles.center}>{i + 1}</td>
                          <td className={`${styles.mono} ${styles.wrapCode}`} title={item.code || '-'}>
                            {item.code || '-'}
                          </td>
                          <td className={styles.nameCell} title={item.item_name || item.name || '-'}>
                            {item.item_name || item.name || '-'}
                          </td>
                          <td className={styles.center}>{item.unit || '-'}</td>
                          <td className={`${styles.right} ${styles.num}`}>{thb(item.qty)}</td>
                          <td className={`${styles.right} ${styles.num}`}>{thb(item.unit_price)}</td>
                          <td className={`${styles.right} ${styles.num}`}>{thb(item.discount)}</td>
                          <td className={`${styles.right} ${styles.num}`}>{thb(item.line_total ?? lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className={styles.footerRow}>
                      <td colSpan={5}></td>
                      <td className={styles.right}><b>รวมก่อนภาษี</b></td>
                      <td className={styles.right} colSpan={2}><b>{thb(summary.sub)}</b></td>
                    </tr>
                    <tr className={styles.footerRow}>
                      <td colSpan={5}></td>
                      <td className={styles.right}><b>VAT ({po.terms?.vat_rate || 0}%)</b></td>
                      <td className={styles.right} colSpan={2}><b>{thb(summary.vat)}</b></td>
                    </tr>
                    <tr className={`${styles.footerRow} ${styles.footerGrand}`}>
                      <td colSpan={5}></td>
                      <td className={styles.right}><b>ยอดรวม</b></td>
                      <td className={styles.right} colSpan={2}><b>{thb(summary.grand)}</b></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* ไฟล์แนบ */}
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.sectionTitle}>ไฟล์แนบ</h2>
                <label className={styles.btnPrimary} style={{ opacity: uploading || canceled ? 0.5 : 1 }}>
                  <FaUpload /> แนบไฟล์
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={onUpload}
                    disabled={uploading || canceled}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {files.length === 0 ? (
                <div className={styles.empty}>ยังไม่มีไฟล์แนบ</div>
              ) : (
                <div className={styles.fileGrid}>
                  {files.map((f) => (
                    <div key={f.file_id} className={styles.fileItem}>
                      <a
                        href={`http://localhost:5000${f.file_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.fileLink}
                      >
                        {f.file_name}
                      </a>
                      <div className={styles.fileMeta}>
                        อัปโหลด: {new Date(f.uploaded_at).toLocaleString('th-TH')}
                      </div>
                      {!canceled && (
                        <button className={styles.btnTextDanger} onClick={() => onRemoveFile(f.file_id)}>
                          <FaTrash /> ลบ
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>

          {/* Aside Summary
          <aside className={styles.aside}>
            <div className={`${styles.card} ${styles.sticky}`}>
              <h2 className={styles.sectionTitle}>สรุปยอด</h2>
              <div className={styles.summaryRow}>
                <span>ยอดก่อนภาษี</span>
                <span className={styles.mono}>{thb(summary.sub)} บาท</span>
              </div>
              <div className={styles.summaryRow}>
                <span>ภาษีมูลค่าเพิ่ม ({po.terms?.vat_rate || 0}%)</span>
                <span className={styles.mono}>{thb(summary.vat)} บาท</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.grand}`}>
                <span>ยอดรวมทั้งสิ้น</span>
                <span className={styles.mono}>{thb(summary.grand)} บาท</span>
              </div>
            </div>
          </aside> */}
        </div>
      </div>
    </div>
  );
}
