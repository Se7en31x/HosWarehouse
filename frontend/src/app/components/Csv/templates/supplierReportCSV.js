// src/app/components/Csv/templates/supplierReportCSV.js

function escapeCSV(val) {
  const s = String(val ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows) {
  return rows.map((r) => r.map((c) => escapeCSV(c)).join(",")).join("\r\n");
}

const formatCurrency = (value) =>
  parseFloat(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ==========================
   Export Supplier Report CSV
========================== */
export function exportSupplierCSV({ data = [], filename = "report-supplier.csv" } = {}) {
  const headers = [
    "ลำดับ",
    "ชื่อซัพพลายเออร์",
    "ผู้ติดต่อ",
    "เบอร์โทร",
    "Email",
    "PO Count",
    "ยอดรวม",
  ];

  const rows = data.map((s, idx) => [
    idx + 1,
    s.supplier_name || "-",
    s.supplier_contact_name || "-",
    s.supplier_phone || "-",
    s.supplier_email || "-",
    s.total_po || 0,
    formatCurrency(s.total_spent),
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
