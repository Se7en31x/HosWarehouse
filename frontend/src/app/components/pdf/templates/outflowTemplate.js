// src/app/components/pdf/templates/outflowTemplate.js
import exportPDF from "../PDFExporter";

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

const translateRequestType = (t) =>
  ({ withdraw: "เบิก", borrow: "ยืม" }[t] || "-");

const translateApprovalStatus = (s) =>
  ({
    waiting_approval: "รออนุมัติ",
    waiting_approval_detail: "รออนุมัติ",
    approved: "อนุมัติ",
    approved_in_queue: "อนุมัติรอดำเนินการ",
    rejected: "ไม่อนุมัติ",
    partial: "อนุมัติบางส่วน",
  }[s] || "-");

const translateProcessingStatus = (s) =>
  ({
    pending: "รอจ่าย",
    preparing: "กำลังเตรียม",
    delivering: "กำลังนำส่ง",
    completed: "เสร็จสิ้น",
    rejected: "ปฏิเสธ",
    waiting_approval: "รออนุมัติ",
    approved_in_queue: "อนุมัติรอดำเนินการ",
  }[s] || "-");

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

export async function exportOutflowPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";
  const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "แผนก",
      filters.departmentLabel || "ทั้งหมด",
    ],
    ["ช่วงเวลา", dateLabel, "ประเภทคำขอ", filters.typeLabel || "ทั้งหมด"],
    ["ผู้จัดทำรายงาน", fullName, "", ""],
  ];

  const columns = [
    "ลำดับ",
    "รหัสคำขอ",
    "วันที่",
    "ชื่อพัสดุ",
    "ประเภท",
    "จำนวนอนุมัติ",
    "จำนวนจ่ายจริง",
    "หน่วย",
    "ประเภทคำขอ",
    "แผนก",
    "สถานะอนุมัติ",
    "สถานะการดำเนินการ",
  ];

  const rows = data.map((item, idx) => [
    idx + 1,
    item.request_code,
    formatDate(item.request_date),
    item.item_name || "-",
    translateCategory(item.category),
    (parseInt(item.approved_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.issued_qty, 10) || 0).toLocaleString("th-TH"),
    item.unit || "-",
    translateRequestType(item.request_type),
    item.department || "-",
    translateApprovalStatus(item.approval_status),
    translateProcessingStatus(item.processing_status),
  ]);

  const totalApproved = data.reduce((sum, i) => sum + (parseInt(i.approved_qty, 10) || 0), 0);
  const totalIssued = data.reduce((sum, i) => sum + (parseInt(i.issued_qty, 10) || 0), 0);

  rows.push([
    {
      content: "รวมทั้งหมด",
      colSpan: 5,
      styles: { halign: "right", fontStyle: "bold" },
    },
    totalApproved.toLocaleString("th-TH"),
    totalIssued.toLocaleString("th-TH"),
    { content: "-", colSpan: 4 },
  ]);

  await exportPDF({
    filename: "outflow-report.pdf",
    title: "รายงานการเบิก/ยืม",
    meta: {
      range: dateLabel,
      department: filters.departmentLabel || "ทั้งหมด",
      type: filters.typeLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบการเบิก/ยืมพัสดุ",
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
