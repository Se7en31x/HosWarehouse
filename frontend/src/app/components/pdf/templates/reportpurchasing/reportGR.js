"use client";
import exportPDF from "@/app/components/pdf/PDFExporter";

/* ========== Helpers ========== */
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

const mapDateRangeLabel = (value, start, end) => {
  const today = new Date();
  let rangeStart, rangeEnd;

  switch (value) {
    case "today":
      rangeStart = today;
      rangeEnd = today;
      break;
    case "year":
      rangeStart = new Date(today.getFullYear(), 0, 1);
      rangeEnd = new Date(today.getFullYear(), 11, 31);
      break;
    case "last1month":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 1);
      rangeEnd = today;
      break;
    case "last3months":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 3);
      rangeEnd = today;
      break;
    case "last6months":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 6);
      rangeEnd = today;
      break;
    case "last9months":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 9);
      rangeEnd = today;
      break;
    case "last12months":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 12);
      rangeEnd = today;
      break;
    case "custom":
      if (start && end) {
        rangeStart = new Date(start);
        rangeEnd = new Date(end);
      }
      break;
    default:
      return "ทั้งหมด";
  }

  if (rangeStart && rangeEnd) {
    const startLabel = rangeStart.toLocaleDateString("th-TH", { dateStyle: "long" });
    const endLabel = rangeEnd.toLocaleDateString("th-TH", { dateStyle: "long" });
    return `${startLabel} - ${endLabel}`;
  }

  return "ทั้งหมด";
};

/* ========== Export GR PDF ========== */
export default async function exportReportGR({
  data = [],
  filters = {},
  filename = "report-gr.pdf",
  title = "รายงานการรับสินค้า (GR Report)",
}) {
  const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

  /* ---- Meta ---- */
  const meta = [
    ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH", { dateStyle: "long" }), "สถานะ", filters.statusLabel || "ทั้งหมด"],
    ["ช่วงเวลา", dateLabel, "ผู้จัดทำรายงาน", "ระบบ HosWarehouse"],
  ];

  /* ---- Table Columns ---- */
  const columns = [
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

  /* ---- Table Rows ---- */
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

  /* ---- Export ---- */
  await exportPDF({
    filename,
    title,
    meta: {
      range: dateLabel,
      status: filters.statusLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: "ระบบ HosWarehouse",
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นจากระบบ HosWarehouse",
    options: {
      page: { orientation: "landscape" },
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
        logo: "/logos/logo.png",
      },
      signatures: {
        roles: ["ผู้จัดทำ", "หัวหน้าแผนก", "ผู้อำนวยการ"],
        names: ["", "", ""],
      },
      colors: {
        headFill: [255, 255, 255],
        headText: [0, 0, 0],
        gridLine: [0, 0, 0],
        zebra: [255, 255, 255],
      },
    },
  });
}
