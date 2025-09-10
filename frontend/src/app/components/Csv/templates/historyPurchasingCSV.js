// src/app/components/Csv/templates/historyPurchasingCSV.js

function fmtDateTH(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}

function toThaiStatus(status = "") {
  const s = String(status || "").toLowerCase();
  if (s === "pending") return "รอดำเนินการ";
  if (s === "approved") return "อนุมัติ";
  if (s === "completed") return "เสร็จสิ้น";
  if (s === "canceled" || s === "cancelled") return "ยกเลิก";
  return status || "-";
}

function escapeCSV(val) {
  const s = String(val ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows) {
  return rows.map((r) => r.map((c) => escapeCSV(c)).join(",")).join("\r\n");
}

/** ✅ บังคับให้ Excel อ่านเป็นข้อความ (กันเลขยาวกลายเป็น E+ และกัน CSV-injection) */
function asExcelText(val) {
  const s = String(val ?? "");
  return "'" + s; // เติม apostrophe นำหน้า
}

/** พจนานุกรมคอลัมน์ → header และวิธีดึงค่า */
const COLS_DEF = {
  po_no:       { header: "เลขที่ PO",        pick: (po) => (po?.po_no ? asExcelText(po.po_no) : "-") },
  date:        { header: "วันที่",             pick: (po) => fmtDateTH(po?.created_at) },
  supplier:    { header: "ซัพพลายเออร์",      pick: (po) => po?.supplier_name || "-" },
  status:      { header: "สถานะ",              pick: (po) => toThaiStatus(po?.po_status || po?.status) },
  creator:     { header: "ผู้ใช้ที่ออก",        pick: (po) => po?.creator_name || "ไม่ทราบ" },
  subtotal:    { header: "รวมก่อน VAT",        pick: (po) => Number(po?.subtotal ?? 0) },
  vat:         { header: "VAT",                pick: (po) => Number(po?.vat_amount ?? 0) },
  grand_total: { header: "ยอดสุทธิ",           pick: (po) => Number(po?.grand_total ?? 0) },
};

/** ลำดับดีฟอลต์ให้ตรงกับหน้า UI */
const DEFAULT_ORDER = [
  "po_no",
  "date",
  "supplier",
  "status",
  "creator",
  "subtotal",
  "vat",
  "grand_total",
];

export function exportHistoryPurchasingCSV({
  data = [],
  filename = "purchase-history.csv",
  order = DEFAULT_ORDER, // ← ปรับลำดับ/ตัดคอลัมน์ได้โดยส่ง order ใหม่เข้ามา
} = {}) {
  const cols = order.map((k) => COLS_DEF[k]).filter(Boolean);

  const headers = cols.map((c) => c.header);
  const rows = data.map((po) => cols.map((c) => c.pick(po)));

  const csv = toCSV([headers, ...rows]);

  // ใส่ BOM เพื่อให้ Excel แสดงอักขระไทยถูกต้อง
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
