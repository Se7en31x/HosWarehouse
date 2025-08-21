"use client";

export default function exportCSV({ filename = "report.csv", columns = [], rows = [] }) {
  // แปลงหัวตารางเป็นบรรทัดแรก
  const csvContent = [
    columns.join(","), // หัวตาราง
    ...rows.map(row =>
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(",") // หนีเครื่องหมายคำพูดและห่อด้วย ""
    ),
  ].join("\n");

  // เพิ่ม BOM (เพื่อให้ Excel แสดงภาษาไทยถูกต้อง)
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });

  // สร้างลิงก์ดาวน์โหลด
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}