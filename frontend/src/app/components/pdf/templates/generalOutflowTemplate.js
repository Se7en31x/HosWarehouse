import exportPDF from "../PDFExporter";

/* ---------- Helpers ---------- */
const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const translateCategory = (cat) => {
  const map = {
    general: "ของใช้ทั่วไป",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์การแพทย์",
    medicine: "ยา",
  };
  return map[cat] || "-";
};

const translateOutflowType = (t) => {
  const map = {
    withdraw: "ตัดสต็อกจากการเบิก",
    damaged: "ชำรุด",
    expired_dispose: "หมดอายุ",
    borrow: "ตัดสต็อกจากการยืม",
  };
  return map[t] || "-";
};

/* ---------- Date Range Label ---------- */
const mapDateRangeLabel = (value, start, end) => {
  const today = new Date();
  let rangeStart, rangeEnd;

  switch (value) {
    case "today":
      rangeStart = today;
      rangeEnd = today;
      break;
    case "1m":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 1);
      rangeEnd = today;
      break;
    case "3m":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 3);
      rangeEnd = today;
      break;
    case "6m":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 6);
      rangeEnd = today;
      break;
    case "9m":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 9);
      rangeEnd = today;
      break;
    case "12m":
      rangeStart = new Date(today);
      rangeStart.setMonth(today.getMonth() - 12);
      rangeEnd = today;
      break;
    case "year":
      rangeStart = new Date(today.getFullYear(), 0, 1);
      rangeEnd = new Date(today.getFullYear(), 11, 31);
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

/* ---------- Main Export ---------- */
export async function exportGeneralOutflowPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";
  const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

  /* ✅ Meta block */
  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "ผู้ทำรายการ",
      filters.userLabel || "ทั้งหมด",
    ],
    ["ช่วงเวลา", dateLabel, "ประเภทการนำออก", filters.typeLabel || "ทั้งหมด"],
    ["ผู้จัดทำรายงาน", fullName, "", ""],
  ];

  /* ✅ Table Columns */
  const columns = [
    "ลำดับ",
    "เลขที่เอกสาร",
    "วันที่",
    "ประเภทการนำออก",
    "ชื่อพัสดุ",
    "ประเภท",
    "Lot No.",
    "จำนวน",
    "หน่วย",
    "ผู้ทำรายการ",
  ];

  /* ✅ Table Rows */
  const rows = data.map((item, idx) => [
    idx + 1,
    item.doc_no,
    formatDate(item.doc_date),
    translateOutflowType(item.outflow_type),
    item.item_name,
    translateCategory(item.category),
    item.lot_no || "-",
    (parseInt(item.qty, 10) || 0).toLocaleString("th-TH"),
    item.unit || "-",
    item.user_name || "-",
  ]);

  /* ✅ รวมยอด */
  const totalQty = data.reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0), 0);
  rows.push([
    { content: "รวมจำนวนทั้งหมด", colSpan: 7, styles: { halign: "right", fontStyle: "bold" } },
    totalQty.toLocaleString("th-TH"),
    { content: "-", colSpan: 2 },
  ]);

  /* ✅ Export PDF */
  await exportPDF({
    filename: "general-outflow-report.pdf",
    title: "รายงานการนำออก (ตัดสต็อก, ชำรุด, หมดอายุ, ยืม)",
    meta: {
      range: dateLabel,
      type: filters.typeLabel || "ทั้งหมด",
      user: filters.userLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบการนำออกจากคลังพัสดุ",
    options: {
      page: { orientation: "landscape" },
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
        logo: "/logos/logo.png",
      },
      signatures: {
        roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อำนวยการ"],
        names: [fullName, "", ""],
      },
      colors: {
        headFill: [255, 255, 255],
        headText: [0, 0, 0],
        gridLine: [0, 0, 0],
        zebra: [255, 255, 255],
      },
      tableStyles: { lineWidth: 0.3, lineColor: [0, 0, 0] },
      headStyles: { lineWidth: 0.6, lineColor: [0, 0, 0], fontStyle: "bold" },
      bodyStyles: { lineWidth: { top: 0.6, right: 0.3, bottom: 0.6, left: 0.3 } },
    },
  });
}
