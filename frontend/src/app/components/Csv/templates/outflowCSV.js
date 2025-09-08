// src/app/components/Csv/templates/outflowCSV.js
import { utils, writeFile } from "xlsx";

export function exportOutflowCSV({ data = [], filename = "outflow-report.csv" }) {
  if (!data || data.length === 0) {
    console.warn("⚠️ ไม่มีข้อมูลสำหรับส่งออก CSV");
    return;
  }

  // ====== แปลงหมวดหมู่ ======
  const translateCategory = (cat) => {
    const map = {
      medicine: "ยา",
      medsup: "เวชภัณฑ์",
      equipment: "ครุภัณฑ์",
      meddevice: "อุปกรณ์การแพทย์",
      general: "ของใช้ทั่วไป",
    };
    return map[cat] || "-";
  };

  // ====== แปลงประเภทคำขอ ======
  const translateRequestType = (type) => {
    const map = { withdraw: "เบิก", borrow: "ยืม" };
    return map[type] || "-";
  };

  // ====== แปลงสถานะอนุมัติ ======
  const translateApprovalStatus = (status) => {
    const map = {
      waiting_approval: "รออนุมัติ",
      waiting_approval_detail: "รออนุมัติ",
      approved: "อนุมัติ",
      approved_in_queue: "อนุมัติรอดำเนินการ",
      rejected: "ไม่อนุมัติ",
      partial: "อนุมัติบางส่วน",
    };
    return map[status] || "-";
  };

  // ====== แปลงสถานะการดำเนินการ ======
  const translateProcessingStatus = (status) => {
    const map = {
      pending: "รอจ่าย",
      preparing: "กำลังเตรียม",
      delivering: "กำลังนำส่ง",
      completed: "เสร็จสิ้น",
      rejected: "ปฏิเสธ",
      waiting_approval: "รออนุมัติ",
      approved_in_queue: "อนุมัติรอดำเนินการ",
    };
    return map[status] || "-";
  };

  // ====== แปลงวันที่ให้อ่านง่าย (dd/mm/yyyy HH:mm) ======
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

  // ====== Header ======
  const headers = [
    "รหัสคำขอ",
    "วันที่",
    "ชื่อพัสดุ",
    "ประเภท",
    "จำนวนอนุมัติ",
    "จำนวนจ่ายจริง",
    "หน่วย",
    "ประเภทคำขอ",
    "แผนก",
    "สถานะอนุมัติ",
    "สถานะการดำเนินการ",
  ];

  // ====== Rows ======
  const rows = data.map((item) => [
    item.request_code,
    formatDate(item.request_date),
    item.item_name,
    translateCategory(item.category),
    item.approved_qty,
    item.issued_qty || "-",
    item.unit || "-",
    translateRequestType(item.request_type),
    item.department || "-",
    translateApprovalStatus(item.approval_status),
    translateProcessingStatus(item.processing_status),
  ]);

  // ====== สร้างและบันทึก CSV ======
  const worksheet = utils.aoa_to_sheet([headers, ...rows]);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Outflow Report");

  writeFile(workbook, filename, { bookType: "csv" });
}
