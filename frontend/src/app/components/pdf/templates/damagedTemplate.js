// src/app/components/pdf/templates/damagedTemplate.js
import exportPDF from "../PDFExporter";

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

const translateDamageType = (type) => {
  const map = { damaged: "ชำรุด", lost: "สูญหาย" };
  return map[type] || "-";
};

const translateManageStatus = (status) => {
  const map = {
    unmanaged: "ยังไม่จัดการ",
    managed: "จัดการแล้ว",
    partially_managed: "จัดการบางส่วน",
  };
  return map[status] || "-";
};

export async function exportDamagedPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  /* ---- Meta block (baseline) ---- */
  let dateLabel = filters.dateLabel || "ทั้งหมด";
  if (filters.dateValue === "custom" && filters.start && filters.end) {
    const startDate = new Date(filters.start).toLocaleDateString("th-TH", {
      dateStyle: "long",
    });
    const endDate = new Date(filters.end).toLocaleDateString("th-TH", {
      dateStyle: "long",
    });
    dateLabel = `${startDate} - ${endDate}`;
  }

  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "ประเภทพัสดุ",
      filters.categoryLabel || "ทั้งหมด",
    ],
    ["ประเภทความเสียหาย", filters.damageTypeLabel || "ทั้งหมด", "สถานะ", filters.statusLabel || "ทั้งหมด"],
    ["ช่วงเวลา", dateLabel, "ผู้จัดทำรายงาน", fullName],
  ];

  /* ---- Table Columns ---- */
  const columns = [
    "ลำดับ",
    "ชื่อพัสดุ",
    "รหัสพัสดุ",
    "ประเภท",
    "Lot No.",
    "วันรายงาน",
    "ผู้รายงาน",
    "ประเภทความเสียหาย",
    "จำนวน",
    "จัดการแล้ว",
    "คงเหลือ",
    "สถานะ",
  ];

  /* ---- Table Rows ---- */
  const rows = data.map((item, idx) => [
    idx + 1,
    item.item_name,
    item.item_code,
    translateCategory(item.category),
    item.lot_no,
    formatDate(item.damaged_date),
    item.reported_by,
    translateDamageType(item.damage_type),
    (parseInt(item.damaged_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.managed_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.remaining_qty, 10) || 0).toLocaleString("th-TH"),
    translateManageStatus(item.manage_status),
  ]);

  /* ---- Export PDF ---- */
  await exportPDF({
    filename: "damaged-report.pdf",
    title: "รายงานพัสดุชำรุด/เสียหาย",
    meta: {
      range: dateLabel,
      category: filters.categoryLabel || "ทั้งหมด",
      damageType: filters.damageTypeLabel || "ทั้งหมด",
      status: filters.statusLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบพัสดุชำรุด/สูญหาย",
    options: {
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
      },
      signatures: {
        roles: ["ผู้จัดทำ", "หัวหน้าแผนก", "ผู้อำนวยการ"],
        names: [fullName, "", ""],
      },
    },
  });
}
