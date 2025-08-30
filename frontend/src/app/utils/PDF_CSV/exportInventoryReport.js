import exportPDF from "@/app/components/pdf/PDFExporter";
import { utils } from "xlsx";

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

/* ===========================
   ✅ Export PDF
=========================== */
export async function exportInventoryPDF({ data = [], filters = {}, brand, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  const meta = [
    ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH")],
    ["ประเภท", filters.categoryLabel || "ทั้งหมด"],
    ["ช่วงเวลา", filters.dateLabel || "ทั้งหมด"],
    ["ผู้จัดทำรายงาน", fullName],
  ];

  const columns = ["รหัสพัสดุ", "ชื่อพัสดุ", "ประเภท", "รับเข้า", "เบิกออก", "คงเหลือ"];
  const rows = data.map((item) => [
    item.code,
    item.name,
    translateCategory(item.category),
    item.received,
    item.issued,
    item.balance,
  ]);

  await exportPDF({
    filename: "inventory-report.pdf",
    title: "รายงานคงคลัง",
    meta,
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นโดยระบบคลังพัสดุโรงพยาบาล",
    options: {
      signatures: {
        roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อำนวยการ"],
        names: [fullName, "", ""], // ✅ mockUser จะถูกใส่ตรงนี้
      },
    },
  });
}

/* ===========================
   ✅ Export CSV
=========================== */
export function exportInventoryCSV({ data = [], user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  const header = [
    ["รายงานคงคลัง"],
    ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH")],
    ["ผู้จัดทำรายงาน", fullName],
    [],
  ];

  const body = data.map((item) => ({
    รหัสพัสดุ: item.code,
    ชื่อพัสดุ: item.name,
    ประเภท: translateCategory(item.category),
    รับเข้า: item.received,
    เบิกออก: item.issued,
    คงเหลือ: item.balance,
  }));

  const worksheet = utils.json_to_sheet(body, { skipHeader: false });
  const csv = utils.sheet_to_csv(worksheet);

  const fullCSV = header.map((row) => row.join(",")).join("\n") + "\n" + csv;

  const blob = new Blob([fullCSV], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", "inventory-report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
