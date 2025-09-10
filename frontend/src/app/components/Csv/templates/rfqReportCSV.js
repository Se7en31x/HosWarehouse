// src/app/components/Csv/templates/rfqReportCSV.js

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

function escapeCSV(val) {
  const s = String(val ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows) {
  return rows.map((r) => r.map((c) => escapeCSV(c)).join(",")).join("\r\n");
}

/* ==========================
   Export RFQ Report CSV
========================== */
export function exportRFQCSV({
  data = [],
  filename = "report-rfq.csv",
} = {}) {
  const headers = [
    "ลำดับ",
    "RFQ No",
    "วันที่สร้าง",
    "ผู้สร้าง",
    "จำนวนสินค้า",
    "รวมจำนวน (Qty)",
    "สถานะ",
  ];

  const rows = data.map((rfq, idx) => [
    idx + 1,
    rfq.rfq_no || "-",
    fmtDateTH(rfq.created_at),
    `${rfq.firstname || "-"} ${rfq.lastname || "-"}`,
    rfq.item_count || 0,
    rfq.total_qty || 0,
    rfq.status || "-",
  ]);

  const csvContent = toCSV([headers, ...rows]);
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}
