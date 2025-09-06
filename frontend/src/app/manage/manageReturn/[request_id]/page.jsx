"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {manageAxios} from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import { Settings } from "lucide-react";

function formatDate(d) {
  if (!d) return "-";
  const dt = new Date(d);
  if (isNaN(dt)) return "-";
  return new Intl.DateTimeFormat("th-TH-u-nu-latn", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(dt);
}

// 🔹 แปลสถานะคืนจาก DB → ไทย
function translateConditionFromDB(c) {
  const v = String(c || "").toLowerCase();
  if (v === "normal") return "คืนปกติ";
  if (v === "damaged") return "คืนชำรุด";
  if (v === "lost") return "สูญหาย";
  if (v === "expired") return "คืนแล้วหมดอายุ";
  return "สถานะไม่ทราบ";
}

// 🔹 แปลสภาพที่เลือกในฟอร์ม → ไทย
function translateCondition(c) {
  const v = String(c || "").toLowerCase();
  if (v === "normal") return "ปกติ";
  if (v === "damaged") return "ชำรุด";
  if (v === "lost") return "สูญหาย";
  if (v === "expired") return "หมดอายุ";
  return v || "-";
}

// 🔹 คลาสสถานะสำหรับ badge
function statusClass(condition) {
  const v = String(condition || "").toLowerCase();
  switch (v) {
    case "normal": return "stNormal";
    case "expired": return "stExpired";
    case "damaged": return "stDamaged";
    case "lost": return "stLost";
    default: return "stDefault";
  }
}

export default function ManageReturnDetailPage() {
  const params = useParams();
  const paramVal = params?.requestId ?? params?.request_id;
  const requestId = Array.isArray(paramVal) ? paramVal[0] : paramVal;
  const router = useRouter();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [activeRow, setActiveRow] = useState(null);
  const [qty, setQty] = useState("");
  const [condition, setCondition] = useState("normal");
  const [note, setNote] = useState("");
  const [submitStatus, setSubmitStatus] = useState(null);

  const fetchDetail = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await manageAxios.get(`/manage/returns/request/${requestId}`, {
        params: { _t: Date.now() },
      });
      setData(res?.data ?? null);
    } catch (e) {
      console.error(e);
      setErr("โหลดรายละเอียดไม่สำเร็จ");
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
    const t = (summary.request_type || "").toString().toLowerCase();
    return t === "ยืม" || t === "borrow";
  }, [summary]);

  const detailMap = useMemo(() => {
    const m = new Map();
    for (const it of items) m.set(it.request_detail_id, it);
    return m;
  }, [items]);

  const combinedItems = useMemo(() => {
    const itemMap = new Map(
      items
        .filter(it => it.borrow_status !== "waiting_borrow")
        .map((item) => [
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

  const returns = useMemo(() => {
    return rawReturns.map((r) => {
      const base = detailMap.get(r.request_detail_id) || {};
      const baseline = Number(
        base.baseline_qty ?? base.delivered_qty ?? base.approved_qty ?? r.approved_qty ?? 0
      );
      const remain = Math.max(0, baseline - Number(r.returned_total ?? 0));
      return {
        ...r,
        item_name: base?.item_name || r.item_name,   // ✅ ใช้ข้อมูลจาก backend ถ้า lineItems ไม่มี
        approved_qty: base?.approved_qty ?? r.approved_qty ?? 0,
        baseline_qty: baseline,
        remaining_qty: remain,
        return_code: r.return_code || `RTN-${r.return_id}`,
        _status_thai: translateConditionFromDB(r.condition),
      };
    });
  }, [rawReturns, detailMap]);


  const pendingItems = useMemo(() => {
    if (!isBorrow) return [];
    return combinedItems.filter((it) => Number(it.remaining_qty || 0) > 0);
  }, [isBorrow, combinedItems]);

  const openReceive = (row) => {
    if (!row || typeof row.remaining_qty !== "number" || row.remaining_qty <= 0) {
      Swal.fire({
        icon: "warning",
        title: "ไม่สามารถรับคืนได้",
        text: "ไม่มีจำนวนคงเหลือที่สามารถรับคืนได้ กรุณาตรวจสอบข้อมูล",
      });
      return;
    }
    setActiveRow(row);
    setQty(String(row.remaining_qty));
    setCondition("normal");
    setNote("");
    setSubmitStatus(null);
  };

  const submitReceive = async () => {
    if (!activeRow || typeof activeRow.remaining_qty !== "number") {
      await Swal.fire({
        icon: "error",
        title: "ข้อผิดพลาด",
        text: "ไม่มีรายการที่เลือกหรือข้อมูลไม่ถูกต้อง",
      });
      setActiveRow(null);
      return;
    }

    const n = Number(qty);
    const remaining = Number(activeRow.remaining_qty || 0);

    if (isNaN(n) || !Number.isInteger(n) || n <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "จำนวนไม่ถูกต้อง",
        text: "กรุณาใส่จำนวนเต็มที่มากกว่า 0",
      });
      return;
    }
    if (n > remaining) {
      await Swal.fire({
        icon: "warning",
        title: "จำนวนเกินคงเหลือ",
        text: `จำนวนที่รับคืนไม่ควรเกิน ${remaining} หน่วย`,
      });
      return;
    }

    const actionNote =
      condition === "normal"
        ? "คืนเข้าคลัง"
        : condition === "expired"
          ? "ตัดออก (หมดอายุ)"
          : condition === "damaged"
            ? "บันทึกของชำรุด"
            : condition === "lost"
              ? "บันทึกสูญหาย"
              : "-";

    setActiveRow(null);

    const confirm = await Swal.fire({
      icon: "question",
      title: "ยืนยันการรับคืน?",
      html: `
        <div style="text-align:left">
          <div><b>พัสดุ:</b> ${activeRow?.item_name || "-"}</div>
          <div><b>จำนวน:</b> ${n}</div>
          <div><b>สภาพ:</b> ${translateCondition(condition)}</div>
          <div><b>ผลการจัดการ:</b> ${actionNote}</div>
          <div><b>หมายเหตุ:</b> ${note ? note : "-"}</div>
          ${["expired", "damaged", "lost"].includes(condition)
          ? "<div style='color: orange'><b>คำเตือน:</b> ของจะไม่ถูกคืนเข้าคลังและถูกบันทึกเป็นสถานะนี้</div>"
          : ""
        }
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: "กำลังบันทึก...",
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
        item_id: activeRow.item_id,
      };

      const res = await manageAxios.post("/manage/returns/receive", payload);

      Swal.close();
      const status = res?.data?.status || "normal";
      setSubmitStatus(status);
      await Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        html: `
          <div style="text-align:left">
            <div>รหัสรับคืน: ${res?.data?.returnCode ?? "-"}</div>
            <div>ผลการจัดการ: ${status === "normal"
            ? "คืนเข้าคลังสำเร็จ"
            : status === "expired"
              ? "บันทึกเป็นของหมดอายุ"
              : status === "damaged"
                ? "บันทึกเป็นของชำรุด"
                : status === "lost"
                  ? "บันทึกเป็นของสูญหาย"
                  : "เสร็จสิ้น"
          }</div>
          </div>
        `,
        timer: 2000,
        showConfirmButton: false,
      });

      setQty("");
      setCondition("normal");
      setNote("");
      await fetchDetail();
    } catch (e) {
      console.error("receive error:", e?.response?.data || e);
      const msg = e?.response?.data?.message || "เกิดข้อผิดพลาดในการรับคืน";
      Swal.close();
      await Swal.fire({ icon: "error", title: "ไม่สามารถบันทึกได้", text: msg });
    }
  };

  if (loading)
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.loadingContainer}>กำลังโหลด...</div>
        </div>
      </div>
    );

  if (err || !data)
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.card} style={{ padding: 22 }}>
            <div className={styles.noDataMessage}>{err || "ไม่พบข้อมูลใบคำขอนี้"}</div>
            <button className={styles.ghostBtn} onClick={() => router.push("/manage/manageReturn")}>
              กลับรายการรวม
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              ตรวจรับคืน — {summary.request_code} ({summary.user_name})
            </h1>
          </div>
          <button className={styles.ghostBtn} onClick={() => router.push("/manage/manageReturn")}>
            กลับรายการรวม
          </button>
        </div>

        {/* ตารางค้างคืน */}
        <h2 className={styles.sectionTitle}>รายการที่ยังค้างคืน</h2>
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.pending} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>รายการ</div>
            <div className={styles.headerItem}>หน่วย</div>
            <div className={styles.headerItem}>อนุมัติ</div>
            <div className={styles.headerItem}>คืนสะสม</div>
            <div className={styles.headerItem}>คงเหลือ</div>
            <div className={styles.headerItem}>กำหนดคืน</div>
            <div className={`${styles.headerItem} ${styles.centerHeader}`}>จัดการ</div>
          </div>
          <div className={`${styles.inventory} ${styles.pending}`}>
            {isBorrow && pendingItems.length ? (
              pendingItems.map((it) => (
                <div key={it.request_detail_id} className={`${styles.tableGrid} ${styles.pending} ${styles.tableRow}`}>
                  <div className={styles.tableCell}>{it.item_name}</div>
                  <div className={styles.tableCell}>{it.item_unit || "-"}</div>
                  <div className={styles.tableCell}>{it.approved_qty ?? 0}</div>
                  <div className={styles.tableCell}>{it.returned_total ?? 0}</div>
                  <div className={styles.tableCell}>{it.remaining_qty ?? 0}</div>
                  <div className={styles.tableCell}>{formatDate(it.expected_return_date)}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <button className={styles.actionButton} onClick={() => openReceive(it)}>
                      <Settings size={16} /> รับคืน
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noDataMessage}>
                {isBorrow ? "ไม่มีรายการค้างคืน" : "ใบนี้ไม่ใช่โหมดยืม"}
              </div>
            )}
          </div>
        </div>

        {/* ประวัติการคืน */}
        <h2 className={styles.sectionTitle}>ประวัติการคืน</h2>
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.history} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>รหัสคืน</div>
            <div className={styles.headerItem}>วันเวลา</div>
            <div className={styles.headerItem}>ผู้ตรวจรับ</div>
            <div className={styles.headerItem}>รายการ</div>
            <div className={styles.headerItem}>อนุมัติ</div>
            <div className={styles.headerItem}>คืนครั้งนี้</div>
            <div className={styles.headerItem}>คืนสะสม</div>
            <div className={styles.headerItem}>คงเหลือ</div>
            <div className={`${styles.headerItem} ${styles.centerHeader}`}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerHeader}`}>ผลการจัดการ</div>
          </div>
          <div className={`${styles.inventory} ${styles.history}`}>
            {isBorrow && returns.length > 0 ? (
              returns.map((r) => {
                const actionNote =
                  r.condition === "normal"
                    ? "คืนเข้าคลัง"
                    : r.condition === "expired"
                      ? "ตัดออก (หมดอายุ)"
                      : r.condition === "damaged"
                        ? "บันทึกของชำรุด"
                        : r.condition === "lost"
                          ? "บันทึกสูญหาย"
                          : "-";
                return (
                  <div key={r.return_id} className={`${styles.tableGrid} ${styles.history} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{r.return_code}</div>
                    <div className={styles.tableCell}>{formatDate(r.return_date)}</div>
                    <div className={styles.tableCell}>{r.inspected_by_name || "-"}</div>
                    <div className={styles.tableCell}>{r.item_name || "-"}</div>
                    <div className={styles.tableCell}>{r.approved_qty ?? 0}</div>
                    <div className={styles.tableCell}>{r.returned_this_time ?? 0}</div>
                    <div className={styles.tableCell}>{r.returned_total ?? 0}</div>
                    <div className={styles.tableCell}>{r.remaining_qty ?? 0}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.stBadge} ${styles[statusClass(r.condition)]}`}>
                        {r._status_thai}
                      </span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <span className={`${styles.stBadge} ${styles[statusClass(r.condition)]}`}>
                        {actionNote}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.noDataMessage}>
                {isBorrow ? "ยังไม่มีประวัติการคืน" : "—"}
              </div>
            )}
          </div>
        </div>

        {/* Modal */}
        {activeRow && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>
              <h3 className={styles.modalTitle}>รับคืน: {activeRow.item_name}</h3>
              {submitStatus && (
                <div className={styles.submitStatus}>
                  <p>
                    ผลลัพธ์: {submitStatus === "normal"
                      ? "คืนเข้าคลังสำเร็จ"
                      : submitStatus === "expired"
                        ? "บันทึกเป็นของหมดอายุ"
                        : submitStatus === "damaged"
                          ? "บันทึกเป็นของชำรุด"
                          : submitStatus === "lost"
                            ? "บันทึกเป็นของสูญหาย"
                            : "เสร็จสิ้น"}
                  </p>
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label}>จำนวนที่รับคืน</label>
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
                    if (value === "" || (Number(value) > 0 && Number.isInteger(Number(value)))) {
                      setQty(value);
                    }
                  }}
                />
                <small className={styles.helpText}>คงเหลือ: {activeRow.remaining_qty}</small>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>สภาพ</label>
                <select
                  className={styles.select}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="normal">ปกติ</option>
                  <option value="damaged">ชำรุด</option>
                  <option value="lost">สูญหาย</option>
                  <option value="expired">หมดอายุ</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>หมายเหตุ</label>
                <textarea
                  className={styles.textarea}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button className={styles.ghostBtn} onClick={() => setActiveRow(null)}>
                  ยกเลิก
                </button>
                <button className={styles.actionButton} onClick={submitReceive}>
                  <Settings size={16} /> ยืนยันรับคืน
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
