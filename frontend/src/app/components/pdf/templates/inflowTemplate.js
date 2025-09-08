import exportPDF from "../PDFExporter";

/* =============================
   ✅ Template: รายงานการรับเข้า (Inflow Report)
============================= */
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
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export async function exportInflowPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  /* ---- Meta block ---- */
  let dateLabel = filters.dateLabel || "ทั้งหมด";

  // ✅ ถ้าเลือก custom → ใช้ start-end (แบบวันเต็ม)
  if (filters.dateValue === "custom" && filters.start && filters.end) {
    const startDate = new Date(filters.start).toLocaleDateString("th-TH", { dateStyle: "long" });
    const endDate = new Date(filters.end).toLocaleDateString("th-TH", { dateStyle: "long" });
    dateLabel = `${startDate} - ${endDate}`;
  }

  const meta = [
    ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH", { dateStyle: "long" }), "ช่วงเวลา", dateLabel],
    ["ประเภทการรับเข้า", filters.typeLabel || "ทั้งหมด", "ผู้จัดทำรายงาน", fullName],
  ];

  /* ---- Table ---- */
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

  /* ---- Export PDF ---- */
  await exportPDF({
    filename: "inflow-report.pdf",
    title: "รายงานการรับเข้า (Inflow Report)",
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
