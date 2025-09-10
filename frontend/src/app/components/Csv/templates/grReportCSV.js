// src/app/components/Csv/templates/grReportCSV.js

function escapeCSV(val) {
  const s = String(val ?? "");
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows) {
  return rows.map((r) => r.map((c) => escapeCSV(c)).join(",")).join("\r\n");
}

const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
};

const translateStatus = (status) => {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "partial":
      return "รับบางส่วน";
    case "completed":
      return "เสร็จสิ้น";
    default:
      return status || "-";
  }
};

/* ==========================
   Export GR Report CSV
========================== */
export function exportGRCSV({ data = [], filename = "report-gr.csv" } = {}) {
  const headers = [
    "ลำดับ",
    "GR No",
    "วันที่รับ",
    "ซัพพลายเออร์",
    "PO No",
    "สินค้า",
    "จำนวนสั่ง",
    "จำนวนรับจริง",
    "สถานะ",
  ];

  const rows = data.map((gr, idx) => [
    idx + 1,
    gr.gr_no || "-",
    formatDate(gr.gr_date),
    gr.supplier_name || "-",
    gr.po_no || "-",
    gr.item_name || "-",
    gr.qty_ordered || 0,
    gr.qty_received || 0,
    translateStatus(gr.status),
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
