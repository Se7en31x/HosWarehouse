// src/app/components/pdf/templates/outflowTemplate.js
import exportPDF from "../PDFExporter";

/* ---------- Helpers ---------- */
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

const translateRequestType = (type) => {
  const map = { withdraw: "เบิก", borrow: "ยืม" };
  return map[type] || type || "-";
};

const translateApprovalStatus = (status) => {
  const map = {
    waiting_approval: "รออนุมัติ",
    waiting_approval_detail: "รออนุมัติ",
    approved: "อนุมัติ",
    approved_in_queue: "อนุมัติรอดำเนินการ",
    rejected: "ไม่อนุมัติ",
    partial: "อนุมัติบางส่วน",
  };
  return map[status] || status || "-";
};

const translateProcessingStatus = (status) => {
  const map = {
    pending: "รอจ่าย",
    preparing: "กำลังเตรียม",
    delivering: "กำลังนำส่ง",
    completed: "เสร็จสิ้น",
    rejected: "ปฏิเสธ",
    waiting_approval: "รออนุมัติ",
    approved_in_queue: "อนุมัติรอดำเนินการ",
  };
  return map[status] || status || "-";
};

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

/* ---------- Main Export ---------- */
export async function exportOutflowPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  /* ✅ Meta block */
  let dateLabel = filters.dateLabel || "ทั้งหมด";

  if (filters.dateValue === "custom" && filters.start && filters.end) {
    const startDate = new Date(filters.start).toLocaleDateString("th-TH", { dateStyle: "long" });
    const endDate = new Date(filters.end).toLocaleDateString("th-TH", { dateStyle: "long" });
    dateLabel = `${startDate} - ${endDate}`;
  }

  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "ช่วงเวลา",
      dateLabel,
    ],
    [
      "ประเภทคำขอ",
      filters.typeLabel || "ทั้งหมด",
      "แผนก",
      filters.departmentLabel || "ทั้งหมด",
    ],
    ["ผู้จัดทำรายงาน", fullName, "", ""],
  ];

  /* ✅ Table Columns */
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

  /* ✅ Table Rows */
  const rows = data.map((item, idx) => [
    idx + 1,
    item.request_code,
    formatDate(item.request_date),
    item.item_name,
    translateCategory(item.category),
    (parseInt(item.approved_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.issued_qty, 10) || 0).toLocaleString("th-TH"),
    item.unit || "-",
    translateRequestType(item.request_type),
    item.department || "-",
    translateApprovalStatus(item.approval_status),
    translateProcessingStatus(item.processing_status),
  ]);

  /* ✅ รวมยอด */
  const totalApproved = data.reduce((sum, i) => sum + (parseInt(i.approved_qty, 10) || 0), 0);
  const totalIssued = data.reduce((sum, i) => sum + (parseInt(i.issued_qty, 10) || 0), 0);

  rows.push([
    {
      content: "รวมทั้งสิ้น",
      colSpan: 5,
      styles: { halign: "right", fontStyle: "bold" },
    },
    totalApproved.toLocaleString("th-TH"),
    totalIssued.toLocaleString("th-TH"),
    { content: "-", colSpan: 5 },
  ]);

  /* ✅ Export PDF */
  await exportPDF({
    filename: "outflow-report.pdf",
    title: "รายงานการเบิก/ยืม (Outflow Report)",
    meta: {
      range: dateLabel,
      type: filters.typeLabel || "ทั้งหมด",
      department: filters.departmentLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบการเบิก/ยืมพัสดุ",
    options: {
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
      },
      signatures: {
        roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อำนวยการ"],
        names: [fullName, "", ""],
      },
    },
  });
}
