// src/app/components/csv/templates/generalOutflowCSV.js
import exportCSV from "../CSVexport";

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
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function exportGeneralOutflowCSV({ data = [], filename = "general-outflow-report.csv" }) {
  const columns = [
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

  const rows = data.map((item) => [
    item.doc_no,
    formatDate(item.doc_date) + "\t", // ✅ บังคับวันที่เป็น text → ชิดซ้าย
    translateOutflowType(item.outflow_type),
    item.item_name,
    translateCategory(item.category),
    item.lot_no || "-",
    Number(item.qty) || 0,           // ✅ จำนวนเป็นตัวเลข → ชิดขวา
    item.unit,
    item.user_name || "-",
    item.doc_note || "-",
  ]);

  exportCSV({ columns, rows, filename });
}

