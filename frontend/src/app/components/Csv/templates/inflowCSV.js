// src/app/Csv/templates/inflowCSV.js
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

export function exportInflowCSV({ data = [], filename = "inflow-report.csv" }) {
  const columns = [
    "เลขที่เอกสาร",
    "วันที่",
    "ประเภทการรับเข้า",
    "ชื่อพัสดุ",
    "ประเภท",
    "Lot No",
    "จำนวน",
    "หน่วย",
    "ผู้ขาย/ซัพพลายเออร์",
    "ผู้ทำรายการ",
  ];

  const rows = data.map((item) => [
    item.doc_no,
    formatDate(item.doc_date) + "\t",      // ✅ วันที่ชิดซ้าย (เป็น text)
    translateInflowType(item.inflow_type),
    item.item_name,
    translateCategory(item.category),
    item.lot_no || "-",
    Number(item.qty) || 0,                 // ✅ จำนวนเป็นตัวเลขจริง → Excel ชิดขวา
    item.unit,
    item.supplier_name || "-",
    item.user_name || "-",
  ]);

  exportCSV({ columns, rows, filename });
}


