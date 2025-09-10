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
  return rows.map(r => r.map(c => escapeCSV(c)).join(",")).join("\r\n");
}

export function exportPOCSV({ data = [], filename = "report-po.csv" } = {}) {
  const headers = [
    "ลำดับ",
    "เลขที่ PO",
    "วันที่",
    "ซัพพลายเออร์",
    "รวมก่อน VAT",
    "VAT",
    "ยอดสุทธิ",
    "สถานะ"
  ];

  const rows = data.map((po, i) => [
    i + 1,
    po.po_no || "-",
    fmtDateTH(po.created_at || po.po_date),
    po.supplier_name || "-",
    Number(po.subtotal ?? 0),
    Number(po.vat_amount ?? 0),
    Number(po.grand_total ?? 0),
    po.po_status || po.status || "-"
  ]);

  const csv = toCSV([headers, ...rows]);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
