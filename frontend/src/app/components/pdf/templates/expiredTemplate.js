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

/* ✅ ฟังก์ชันแปลงช่วงเวลา */
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

export async function exportExpiredPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";
  const role = user?.role || "ไม่ระบุตำแหน่ง";
  const department = user?.department || "ไม่ระบุแผนก";

  // ✅ ใช้ mapDateRangeLabel
  const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

  /* ---- Meta block ---- */
  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "ประเภท",
      filters.categoryLabel || "ทั้งหมด",
    ],
    ["ช่วงเวลา", dateLabel, "สถานะ", filters.statusLabel || "ทั้งหมด"],
    ["ผู้จัดทำรายงาน", fullName, "ตำแหน่ง", role],
    ["แผนก", department, "", ""],
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
  const totalExpired = data.reduce((sum, i) => sum + (parseInt(i.expired_qty, 10) || 0), 0);
  const totalDisposed = data.reduce((sum, i) => sum + (parseInt(i.disposed_qty, 10) || 0), 0);
  const totalRemaining = data.reduce((sum, i) => sum + (parseInt(i.remaining_qty, 10) || 0), 0);

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
    meta,
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบพัสดุหมดอายุ",
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
      tableStyles: { lineWidth: 0.3, lineColor: [0, 0, 0] },
      headStyles: { lineWidth: 0.6, lineColor: [0, 0, 0], fontStyle: "bold" },
      bodyStyles: { lineWidth: { top: 0.6, right: 0.3, bottom: 0.6, left: 0.3 } },
    },
  });
}
