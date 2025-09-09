// src/app/components/pdf/templates/inflowTemplate.js
import exportPDF from "../PDFExporter";

const translateCategory = (cat) => {
  const map = {
    general: "ของใช้ทั่วไป",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์การแพทย์",
    medicine: "ยา",
  };
  return map[cat] || cat || "-";
};

const translateInflowType = (type) => {
  const map = {
    general: "รับเข้าทั่วไป",
    purchase: "รับเข้าจากการสั่งซื้อ",
    return: "คืนพัสดุ",
    repair_return: "คืนจากซ่อม",
    adjustment: "ปรับปรุงยอด",
  };
  return map[type] || type || "-";
};

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

export async function exportInflowPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

  const meta = [
    ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH", { dateStyle: "long" }), "ช่วงเวลา", dateLabel],
    ["ประเภทการรับเข้า", filters.typeLabel || "ทั้งหมด", "ผู้จัดทำรายงาน", fullName],
  ];

  const columns = [
    "เลขที่เอกสาร",
    "วันที่",
    "ประเภทการรับเข้า",
    "ชื่อพัสดุ",
    "หมวดหมู่",
    "Lot No",
    "จำนวน",
    "หน่วย",
    "ผู้ขาย/ซัพพลายเออร์",
    "ผู้ทำรายการ",
  ];

  const rows = data.map((item) => [
    item.doc_no || "-",
    formatDate(item.doc_date),
    translateInflowType(item.inflow_type),
    item.item_name || "-",
    translateCategory(item.category),
    item.lot_no || "-",
    (parseInt(item.qty, 10) || 0).toLocaleString("th-TH"),
    item.unit || "-",
    item.supplier_name || "-",
    item.user_name || "-",
  ]);

  const totalQty = data.reduce((sum, item) => sum + (parseInt(item.qty, 10) || 0), 0);
  rows.push([
    { content: "รวมจำนวนทั้งหมด", colSpan: 6, styles: { halign: "right", fontStyle: "bold" } },
    totalQty.toLocaleString("th-TH"),
    "", "", "",
  ]);

  await exportPDF({
    filename: "inflow-report.pdf",
    title: "รายงานการรับเข้า",
    meta: {
      range: dateLabel,
      inflowType: filters.typeLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นโดยระบบคลังพัสดุโรงพยาบาล",
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
        zebra: [250, 250, 250],
      },
      tableStyles: {
        lineWidth: 0.3,
        lineColor: [0, 0, 0],
      },
      headStyles: {
        lineWidth: 0.6,
        lineColor: [0, 0, 0],
        fontStyle: "bold",
      },
      bodyStyles: {
        lineWidth: { top: 0.6, right: 0.3, bottom: 0.6, left: 0.3 },
      },
    },
  });
}
