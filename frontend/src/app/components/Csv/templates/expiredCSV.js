// src/app/components/csv/templates/expiredCSV.js
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

const translateManageStatus = (status) => {
  const map = {
    unmanaged: "ยังไม่จัดการ",
    managed: "จัดการแล้ว",
    partially_managed: "จัดการบางส่วน",
  };
  return map[status] || "-";
};

export function exportExpiredCSV({ data = [], filename = "expired-report.csv" }) {
  const columns = [
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

  const rows = data.map((item) => [
    item.item_name,
    translateCategory(item.category),
    item.lot_no,
    Number(item.qty_imported) || 0,     // ✅ ตัวเลข → Excel ชิดขวา
    formatDate(item.exp_date),
    Number(item.expired_qty) || 0,
    Number(item.disposed_qty) || 0,
    Number(item.remaining_qty) || 0,
    translateManageStatus(item.manage_status),
  ]);

  exportCSV({ columns, rows, filename });
}
