// src/app/components/pdf/templates/expiredTemplate.js
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

const translateManageStatus = (status) => {
  const map = {
    unmanaged: "ยังไม่จัดการ",
    managed: "จัดการแล้ว",
    partially_managed: "จัดการบางส่วน",
  };
  return map[status] || "-";
};

export async function exportExpiredPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  /* ---- Meta block (ตาม baseline) ---- */
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
      "ประเภท",
      filters.categoryLabel || "ทั้งหมด",
    ],
    ["ช่วงเวลา", dateLabel, "สถานะ", filters.statusLabel || "ทั้งหมด"],
    ["ผู้จัดทำรายงาน", fullName, "", ""],
  ];

  /* ---- Table Columns ---- */
  const columns = [
    "ลำดับ",
    "ชื่อพัสดุ",
    "ประเภท",
    "Lot No.",
    "จำนวนที่นำเข้า",
    "วันหมดอายุ",
    "จำนวนหมดอายุ",
    "จำนวนที่จัดการแล้ว",
    "คงเหลือ",
    "สถานะ",
  ];

  /* ---- Table Rows ---- */
  const rows = data.map((item, idx) => [
    idx + 1,
    item.item_name,
    translateCategory(item.category),
    item.lot_no,
    (parseInt(item.qty_imported, 10) || 0).toLocaleString("th-TH"),
    formatDate(item.exp_date),
    (parseInt(item.expired_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.disposed_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.remaining_qty, 10) || 0).toLocaleString("th-TH"),
    translateManageStatus(item.manage_status),
  ]);

  /* ---- รวมยอดท้ายตาราง ---- */
  const totalExpired = data.reduce(
    (sum, i) => sum + (parseInt(i.expired_qty, 10) || 0),
    0
  );
  const totalDisposed = data.reduce(
    (sum, i) => sum + (parseInt(i.disposed_qty, 10) || 0),
    0
  );
  const totalRemaining = data.reduce(
    (sum, i) => sum + (parseInt(i.remaining_qty, 10) || 0),
    0
  );

  rows.push([
    {
      content: "รวมทั้งหมด",
      colSpan: 6,
      styles: { halign: "right", fontStyle: "bold" },
    },
    totalExpired.toLocaleString("th-TH"),
    totalDisposed.toLocaleString("th-TH"),
    totalRemaining.toLocaleString("th-TH"),
    "",
  ]);

  /* ---- Export PDF ---- */
  await exportPDF({
    filename: "expired-report.pdf",
    title: "รายงานพัสดุหมดอายุ",
    meta: {
      range: dateLabel,
      category: filters.categoryLabel || "ทั้งหมด",
      status: filters.statusLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบพัสดุหมดอายุ",
    options: {
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address:
          "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
      },
      signatures: {
        roles: ["ผู้จัดทำ", "หัวหน้าแผนก", "ผู้อำนวยการ"],
        names: [fullName, "", ""],
      },
    },
  });
}
