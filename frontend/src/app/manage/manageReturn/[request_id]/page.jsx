'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axiosInstance from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import styles from './page.module.css';

function formatDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return '-';
  return dt.toLocaleString('th-TH', { hour12: false });
}

// 🔹 แปลสถานะคืนจาก DB → ไทย
function translateConditionFromDB(c) {
  const v = String(c || '').toLowerCase();
  if (v === 'normal') return 'คืนปกติ';
  if (v === 'damaged') return 'คืนชำรุด';
  if (v === 'lost') return 'สูญหาย';
  return 'สถานะไม่ทราบ';
}

// 🔹 แปลสภาพที่เลือกในฟอร์ม → ไทย
function translateCondition(c) {
  const v = String(c || '').toLowerCase();
  if (v === 'normal') return 'ปกติ';
  if (v === 'damaged') return 'ชำรุด';
  if (v === 'lost') return 'สูญหาย';
  return v || '-';
}

export default function ManageReturnDetailPage() {
  const params = useParams();
  const paramVal = params?.requestId ?? params?.request_id;
  const requestId = Array.isArray(paramVal) ? paramVal[0] : paramVal;
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [activeRow, setActiveRow] = useState(null);
  const [qty, setQty] = useState('');
  const [condition, setCondition] = useState('normal');
  const [note, setNote] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await axiosInstance.get(`/manage/returns/request/${requestId}`, {
        params: { _t: Date.now() },
      });
      setData(res?.data ?? null);
    } catch (e) {
      console.error(e);
      setErr('โหลดรายละเอียดไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) fetchDetail();
  }, [requestId]);

  const summary = data?.summary || {};
  const items = data?.lineItems || [];
  const rawReturns = data?.returnHistory || [];

  const isBorrow = useMemo(() => {
    const t = (summary.request_type || '').toString().toLowerCase();
    return t === 'ยืม' || t === 'borrow';
  }, [summary]);

  const detailMap = useMemo(() => {
    const m = new Map();
    for (const it of items) m.set(it.request_detail_id, it);
    return m;
  }, [items]);

  const combinedItems = useMemo(() => {
    const itemMap = new Map(
      items.map((item) => [
        item.request_detail_id,
        {
          ...item,
          baseline_qty: Number(item.baseline_qty ?? item.delivered_qty ?? 0),
          returned_total: 0,
          remaining_qty: Number(item.baseline_qty ?? item.delivered_qty ?? 0),
        },
      ])
    );

    for (const ret of rawReturns) {
      const id = ret.request_detail_id;
      if (itemMap.has(id)) {
        const obj = itemMap.get(id);
        const thisTime = Number(ret.returned_this_time ?? 0);
        obj.returned_total += thisTime;
        obj.remaining_qty = Math.max(0, obj.baseline_qty - obj.returned_total);
      }
    }
    return Array.from(itemMap.values());
  }, [items, rawReturns]);

  // ✅ ใช้ translateConditionFromDB
  const returns = useMemo(() => {
    return rawReturns.map((r) => {
      const base = detailMap.get(r.request_detail_id) || {};
      const baseline = Number(base.baseline_qty ?? base.delivered_qty ?? base.approved_qty ?? 0);
      const remain = Math.max(0, baseline - Number(r.returned_total ?? 0));
      return {
        ...r,
        item_name: base?.item_name,
        approved_qty: base?.approved_qty ?? 0,
        baseline_qty: baseline,
        remaining_qty: remain,
        _status_thai: translateConditionFromDB(r.condition),
      };
    });
  }, [rawReturns, detailMap]);

  const pendingItems = useMemo(() => {
    if (!isBorrow) return [];
    return combinedItems.filter((it) => Number(it.remaining_qty || 0) > 0);
  }, [isBorrow, combinedItems]);

  const openReceive = (row) => {
    if (!row || typeof row.remaining_qty !== 'number' || row.remaining_qty <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: 'ไม่สามารถรับคืนได้: จำนวนคงเหลือไม่ถูกต้อง',
      });
      return;
    }
    setActiveRow(row);
    setQty(String(row.remaining_qty)); // ตั้งเป็น string ของจำนวนเต็ม
    setCondition('normal');
    setNote('');
  };

  const submitReceive = async () => {
    console.log('qty state:', qty, typeof qty, 'activeRow:', activeRow); // ดีบัก state
    if (!activeRow || typeof activeRow.remaining_qty !== 'number') {
      await Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: 'ไม่มีรายการที่เลือกหรือข้อมูลไม่ถูกต้อง',
      });
      setActiveRow(null);
      return;
    }

    const n = Number(qty);
    const remaining = Number(activeRow.remaining_qty || 0);

    // ตรวจสอบว่า qty เป็นจำนวนเต็มบวก
    if (isNaN(n) || !Number.isInteger(n) || n <= 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'จำนวนไม่ถูกต้อง',
        text: 'กรุณาใส่จำนวนเต็มที่มากกว่า 0',
      });
      return;
    }
    if (n > remaining) {
      await Swal.fire({
        icon: 'warning',
        title: 'จำนวนเกินคงเหลือ',
        text: `จำนวนที่รับคืนไม่ควรเกิน ${remaining} หน่วย`,
      });
      return;
    }

    const confirm = await Swal.fire({
      icon: 'question',
      title: 'ยืนยันการรับคืน?',
      html: `
      <div style="text-align:left">
        <div><b>พัสดุ:</b> ${activeRow?.item_name || '-'}</div>
        <div><b>จำนวน:</b> ${n}</div>
        <div><b>สภาพ:</b> ${translateCondition(condition)}</div>
        <div><b>หมายเหตุ:</b> ${note ? note : '-'}</div>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const payload = {
        request_detail_id: activeRow.request_detail_id,
        qty_return: parseInt(n, 10),
        condition,
        note,
        inspected_by: 1,
        lots: [], // กันพลาด
      };

      console.log('Sending payload:', payload); // ดีบัก payload

      const res = await axiosInstance.post('/manage/returns/receive', payload);

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: `รหัสรับคืน: RET-${res?.data?.data?.return_id ?? '-'}`,
        timer: 1500,
        showConfirmButton: false,
      });

      setActiveRow(null);
      setQty(''); // รีเซ็ต qty
      await fetchDetail();
    } catch (e) {
      console.error('receive error:', e?.response?.data || e);
      const msg = e?.response?.data?.message || 'เกิดข้อผิดพลาดในการรับคืน';
      Swal.close();
      await Swal.fire({ icon: 'error', title: 'ไม่สามารถบันทึกได้', text: msg });
    }
  };

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.shell}>กำลังโหลด...</div>
      </div>
    );

  if (err || !data)
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.card} style={{ padding: 22 }}>
            <div style={{ marginBottom: 12 }}>{err || 'ไม่พบข้อมูลใบคำขอนี้'}</div>
            <button className={styles.btnGhost} onClick={() => router.push('/manage/manageReturn')}>
              กลับรายการรวม
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>
              ตรวจรับคืน — {summary.request_code} ({summary.user_name})
            </h1>
            <button className={styles.backBtn} onClick={() => router.push('/manage/manageReturn')}>
              ← กลับ
            </button>
          </div>

          {/* ตารางค้างคืน */}
          <h2 className={styles.sectionTitle}>รายการที่ยังค้างคืน</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>พัสดุ</th>
                  <th>หน่วย</th>
                  <th>อนุมัติ</th>
                  <th>คืนสะสม</th>
                  <th>คงเหลือ</th>
                  <th>กำหนดคืน</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {isBorrow && pendingItems.length ? (
                  pendingItems.map((it) => (
                    <tr key={it.request_detail_id}>
                      <td>{it.item_name}</td>
                      <td>{it.item_unit || '-'}</td>
                      <td>{it.approved_qty ?? 0}</td>
                      <td>{it.returned_total ?? 0}</td>
                      <td>{it.remaining_qty ?? 0}</td>
                      <td>{formatDate(it.expected_return_date)}</td>
                      <td>
                        <button className={styles.btnPrimary} onClick={() => openReceive(it)}>
                          รับคืน
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 16 }}>
                      {isBorrow ? 'ไม่มีรายการค้างคืน' : 'ใบนี้ไม่ใช่โหมดยืม'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ประวัติการคืน */}
          <h2 className={styles.sectionTitle}>ประวัติการคืน</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>รหัสคืน</th>
                  <th>วันเวลา</th>
                  <th>ผู้ตรวจรับ</th>
                  <th>พัสดุ</th>
                  <th>อนุมัติ</th>
                  <th>คืนครั้งนี้</th>
                  <th>คืนสะสม</th>
                  <th>คงเหลือ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {isBorrow && returns.length > 0 ? (
                  returns.map((r) => (
                    <tr key={r.return_code}>
                      <td>{r.return_code}</td>
                      <td>{formatDate(r.return_date)}</td>
                      <td>{r.inspected_by_name || '-'}</td>
                      <td>{r.item_name || '-'}</td>
                      <td>{r.approved_qty ?? 0}</td>
                      <td>{r.returned_this_time ?? 0}</td>
                      <td>{r.returned_total ?? 0}</td>
                      <td>{r.remaining_qty ?? 0}</td>
                      <td>{r._status_thai}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 16 }}>
                      {isBorrow ? 'ยังไม่มีประวัติการคืน' : '—'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {activeRow && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
              <h3 className={styles.modalTitle}>รับคืน: {activeRow.item_name}</h3>

              <div className="field">
                <label>จำนวนที่รับคืน</label>
                <input
                  className={styles.input}
                  type="number"
                  min={1}
                  max={activeRow.remaining_qty}
                  value={qty}
                  required
                  step="1"
                  onChange={(e) => {
                    const value = e.target.value;
                    // อนุญาตเฉพาะตัวเลขเต็มบวกหรือว่าง (ขณะพิมพ์)
                    if (value === '' || (Number(value) > 0 && Number.isInteger(Number(value)))) {
                      setQty(value);
                    }
                  }}
                />
                <small className={styles.helpText}>คงเหลือ: {activeRow.remaining_qty}</small>
              </div>

              <div className="field">
                <label>สภาพ</label>
                <select
                  className={styles.select}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="normal">ปกติ</option>
                  <option value="damaged">ชำรุด</option>
                  <option value="lost">สูญหาย</option>
                </select>
              </div>

              <div className="field">
                <label>หมายเหตุ</label>
                <textarea
                  className={styles.textarea}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button className={styles.btnGhost} onClick={() => setActiveRow(null)}>
                  ยกเลิก
                </button>
                <button className={styles.btnPrimary} onClick={submitReceive}>
                  ยืนยันรับคืน
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
