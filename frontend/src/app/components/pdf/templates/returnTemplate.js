// src/app/components/pdf/templates/returnTemplate.js
import exportPDF from "../PDFExporter";

const formatDate = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
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

export async function exportReturnPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  /* ✅ Date Label */
  let dateLabel = filters.dateLabel || "ทั้งหมด";
  if (filters.dateValue === "custom" && filters.start && filters.end) {
    const startDate = new Date(filters.start).toLocaleDateString("th-TH", { dateStyle: "long" });
    const endDate = new Date(filters.end).toLocaleDateString("th-TH", { dateStyle: "long" });
    dateLabel = `${startDate} - ${endDate}`;
  }

  /* ✅ Meta block */
  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "แผนก",
      filters.departmentLabel || "ทั้งหมด",
    ],
    ["ช่วงเวลา", dateLabel, "สถานะอนุมัติ", filters.approvalLabel || "ทั้งหมด"],
    ["ผู้จัดทำรายงาน", fullName, "", ""],
  ];

  /* ✅ Table Columns */
  const columns = [
    "ลำดับ",
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

  /* ✅ Table Rows */
  const rows = data.map((item, idx) => [
    idx + 1,
    item.request_code,
    item.department || "-",
    item.borrower_name || "-",
    item.item_name || "-",
    (parseInt(item.approved_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.returned_qty, 10) || 0).toLocaleString("th-TH"),
    (parseInt(item.not_returned_qty, 10) || 0).toLocaleString("th-TH"),
    item.return_status || "-",
    formatDate(item.last_return_date),
    translateApprovalStatus(item.approval_status),
    item.return_note || "-",
  ]);

  /* ✅ รวมยอด */
  const totalApproved = data.reduce((sum, i) => sum + (parseInt(i.approved_qty, 10) || 0), 0);
  const totalReturned = data.reduce((sum, i) => sum + (parseInt(i.returned_qty, 10) || 0), 0);
  const totalNotReturned = data.reduce((sum, i) => sum + (parseInt(i.not_returned_qty, 10) || 0), 0);

  rows.push([
    {
      content: "รวมทั้งหมด",
      colSpan: 5,
      styles: { halign: "right", fontStyle: "bold" },
    },
    totalApproved.toLocaleString("th-TH"),
    totalReturned.toLocaleString("th-TH"),
    totalNotReturned.toLocaleString("th-TH"),
    { content: "-", colSpan: 4 },
  ]);

  /* ✅ Export PDF */
  await exportPDF({
    filename: "return-report.pdf",
    title: "รายงานการคืน",
    meta: {
      range: dateLabel,
      department: filters.departmentLabel || "ทั้งหมด",
      approval: filters.approvalLabel || "ทั้งหมด",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบการคืนพัสดุ",
    options: {
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
      },
      signatures: {
        roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อำนวยการ"],
        names: [fullName, "", ""],
      },
    },
  });
}
