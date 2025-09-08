// src/app/Csv/templates/inventoryCSV.js
import exportCSV from "../CSVexport";

const translateCategory = (cat) => {
  const map = {
    medicine: "ยา",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์การแพทย์",
    general: "ของใช้ทั่วไป",
  };
  return map[cat] || cat || "-";
};

export function exportInventoryCSV({ data = [], filename = "inventory-report.csv" }) {
  const columns = [
    "รหัสพัสดุ",
    "ชื่อพัสดุ",
    "หมวดหมู่",
    "หน่วย",
    "รับเข้า",
    "เบิกออก",
    "คงเหลือ",
    "มูลค่า (บาท)",
  ];

  const rows = data.map((item) => {
    const balance = parseInt(item.balance, 10) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const totalValue =
      item.total_value !== undefined
        ? parseFloat(item.total_value) || 0
        : balance * unitCost;

    return [
      item.code,
      item.name,
      translateCategory(item.category),
      item.unit || "-",
      item.received || 0,
      item.issued || 0,
      balance,
      totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
    ];
  });

  exportCSV({ columns, rows, filename });
}
