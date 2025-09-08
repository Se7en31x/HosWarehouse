// src/app/components/pdf/templates/generalOutflowTemplate.js
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

const translateOutflowType = (type) => {
  const map = {
    withdraw: "ตัดสต็อกจากการเบิก",
    damaged: "ชำรุด",
    expired_dispose: "หมดอายุ",
    borrow: "ตัดสต็อกจากการยืม",
  };
  return map[type] || type || "-";
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
export async function exportGeneralOutflowPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  /* ✅ Date Label */
  let dateLabel = filters.dateLabel || "ทั้งหมด";
  if (filters.dateValue === "custom" && filters.start && filters.end) {
    const startDate = new Date(filters.start).toLocaleDateString("th-TH", { dateStyle: "long" });
    const endDate = new Date(filters.end).toLocaleDateString("th-TH", { dateStyle: "long" });
    dateLabel = `${startDate} - ${endDate}`;
  }

  /* ✅ Meta block */
  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "ช่วงเวลา",
      dateLabel,
    ],
    ["ประเภทการนำออก", filters.typeLabel || "ทั้งหมด", "ผู้ทำรายการ", filters.userLabel || "ทั้งหมด"],
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
    "Lot No",
    "จำนวน",
    "หน่วย",
    "ผู้ทำรายการ",
    "หมายเหตุ",
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
    item.doc_note || "-",
  ]);

  /* ✅ รวมยอดจำนวน */
  const totalQty = data.reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0), 0);

  rows.push([
    {
      content: "รวมจำนวนทั้งหมด",
      colSpan: 7,
      styles: { halign: "right", fontStyle: "bold" },
    },
    totalQty.toLocaleString("th-TH"),
    { content: "-", colSpan: 3 },
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
