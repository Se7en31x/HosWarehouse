// src/app/components/Csv/templates/prReportCSV.js

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

export function exportPRCSV({ data = [], filename = "report-pr.csv" } = {}) {
  const headers = ["ลำดับ", "PR No", "วันที่สร้าง", "ผู้ขอซื้อ", "สินค้า", "จำนวน", "หน่วย", "สถานะ"];

  const rows = data.map((pr, idx) => [
    idx + 1,
    pr.pr_no || "-",
    fmtDateTH(pr.created_at),
    `${pr.firstname || "-"} ${pr.lastname || "-"}`,
    pr.item_name || "-",
    pr.qty_requested || 0,
    pr.unit || "-",
    pr.status || "-",
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
