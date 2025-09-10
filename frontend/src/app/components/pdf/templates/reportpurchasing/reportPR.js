"use client";
import exportPDF from "@/app/components/pdf/PDFExporter";

/* helper: format date */
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

/* helper: date range label */
const mapDateRangeLabel = (value, start, end) => {
  const today = new Date();
  let rangeStart, rangeEnd;

  switch (value) {
    case "today": rangeStart = today; rangeEnd = today; break;
    case "year": rangeStart = new Date(today.getFullYear(), 0, 1); rangeEnd = new Date(today.getFullYear(), 11, 31); break;
    case "last1month": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 1); rangeEnd = today; break;
    case "last3months": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 3); rangeEnd = today; break;
    case "last6months": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 6); rangeEnd = today; break;
    case "last12months": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 12); rangeEnd = today; break;
    case "custom": if (start && end) { rangeStart = new Date(start); rangeEnd = new Date(end); } break;
    default: return "ทั้งหมด";
  }

  if (rangeStart && rangeEnd) {
    const startLabel = rangeStart.toLocaleDateString("th-TH", { dateStyle: "long" });
    const endLabel = rangeEnd.toLocaleDateString("th-TH", { dateStyle: "long" });
    return `${startLabel} - ${endLabel}`;
  }
  return "ทั้งหมด";
};

/* export PDF */
export default async function exportReportPR({
  data = [],
  filters = {},
  user,
  filename = "report-pr.pdf",
  title = "รายงานใบขอซื้อ (PR)",
}) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";
  const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

  const meta = [
    ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH", { dateStyle: "long" }), "สถานะ", filters.statusLabel || "ทั้งหมด"],
    ["ช่วงเวลา", dateLabel, "ผู้จัดทำรายงาน", fullName],
  ];

  const columns = ["ลำดับ", "PR No", "วันที่สร้าง", "ผู้ขอซื้อ", "สินค้า", "จำนวน", "หน่วย", "สถานะ"];

  const rows = data.map((pr, idx) => [
    idx + 1,
    pr.pr_no || "-",
    formatDate(pr.created_at),
    `${pr.firstname || "-"} ${pr.lastname || "-"}`,
    pr.item_name || "-",
    pr.qty_requested || 0,
    pr.unit || "-",
    pr.status || "-",
  ]);

  await exportPDF({
    filename,
    title,
    meta: {
      range: dateLabel,
      status: filters.statusLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
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
        names: [fullName, "", ""],
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
