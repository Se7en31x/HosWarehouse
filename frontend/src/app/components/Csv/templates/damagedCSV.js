// src/app/components/csv/templates/damagedCSV.js
import exportCSV from "../CSVexport";

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
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

export function exportDamagedCSV({ data = [], filename = "damaged-report.csv" }) {
  const columns = [
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

  const rows = data.map((item) => [
    item.item_name,
    item.item_code,
    translateCategory(item.category),
    item.lot_no,
    formatDate(item.damaged_date),
    item.reported_by,
    translateDamageType(item.damage_type),
    Number(item.damaged_qty) || 0,
    Number(item.managed_qty) || 0,
    Number(item.remaining_qty) || 0,
    translateManageStatus(item.manage_status),
  ]);

  exportCSV({ columns, rows, filename });
}
