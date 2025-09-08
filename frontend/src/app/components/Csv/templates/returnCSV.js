// src/app/components/csv/templates/returnCSV.js
import exportCSV from "../CSVexport";

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

const translateApprovalStatus = (status) => {
  const map = {
    approved: "อนุมัติ",
    rejected: "ปฏิเสธ",
    partial: "อนุมัติบางส่วน",
    waiting_approval: "รออนุมัติ",
    waiting_approval_detail: "รออนุมัติรายละเอียด",
    approved_in_queue: "อนุมัติ (รอดำเนินการ)",
  };
  return map[status] || "-";
};

export function exportReturnCSV({ data = [], filename = "return-report.csv" }) {
  const columns = [
    "เลขที่คำขอ",
    "แผนก",
    "ผู้ยืม",
    "ชื่อพัสดุ",
    "จำนวนอนุมัติ",
    "คืนแล้ว",
    "คงเหลือ",
    "สถานะการคืน",
    "วันคืนล่าสุด",
    "สถานะอนุมัติ",
    "หมายเหตุ",
  ];

  const rows = data.map((item) => [
    item.request_code,
    item.department,
    item.borrower_name,
    item.item_name,
    Number(item.approved_qty) || 0,   // ✅ จำนวน → ชิดขวาใน Excel
    Number(item.returned_qty) || 0,
    Number(item.not_returned_qty) || 0,
    item.return_status,
    formatDate(item.last_return_date) + "\t", // ✅ กัน Excel auto-format
    translateApprovalStatus(item.approval_status),
    item.return_note || "-",
  ]);

  exportCSV({ columns, rows, filename });
}
