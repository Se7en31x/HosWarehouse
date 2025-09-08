import exportPDF from "../PDFExporter";

/* =============================
   ✅ Template: รายงานคงคลัง (Inventory Report)
   หน้านี้เป็น "หน้าย่อย" เรียกใช้ PDFExporter (baseline)
============================= */
export async function exportInventoryPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

  /* ---- Helper: แปลง category → ไทย ---- */
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

  /* ---- Meta block (object สำหรับ metaBlock.js) ---- */
  let dateLabel = filters.dateLabel || "ทั้งหมด";

  // ✅ ถ้าเลือก custom → แสดงวันเต็ม (long format)
  if (filters.dateValue === "custom" && filters.start && filters.end) {
    const startDate = new Date(filters.start).toLocaleDateString("th-TH", {
      dateStyle: "long",
    });
    const endDate = new Date(filters.end).toLocaleDateString("th-TH", {
      dateStyle: "long",
    });
    dateLabel = `${startDate} - ${endDate}`;
  }

  const meta = [
    [
      "วันที่ออกรายงาน",
      new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      "หมวดหมู่",
      filters.categoryLabel || "ทั้งหมด",
    ],
    ["ช่วงเวลา", dateLabel, "แหล่งที่มา", filters.sourceLabel || "ทุกแหล่งที่มา"],
    ["ผู้จัดทำรายงาน", fullName, "", ""],
  ];

  /* ---- Table Columns ---- */
  const columns = [
    "ลำดับ",
    "รหัสพัสดุ",
    "ชื่อพัสดุ",
    "หมวดหมู่",
    "หน่วย",
    "รับเข้า",
    "เบิกออก",
    "คงเหลือ",
    "มูลค่า (บาท)",
  ];

  /* ---- Table Rows ---- */
  const rows = data.map((item, idx) => {
    const balance = parseInt(item.balance, 10) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const totalValue =
      item.total_value !== undefined
        ? parseFloat(item.total_value) || 0
        : balance * unitCost;

    return [
      idx + 1,
      item.code,
      item.name,
      translateCategory(item.category),
      item.unit || "-",
      (parseInt(item.received, 10) || 0).toLocaleString("th-TH"),
      (parseInt(item.issued, 10) || 0).toLocaleString("th-TH"),
      balance.toLocaleString("th-TH"),
      totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
    ];
  });

  /* ---- รวมยอดท้ายตาราง ---- */
  const totalValueSum = data.reduce((sum, item) => {
    const balance = parseInt(item.balance, 10) || 0;
    const unitCost = parseFloat(item.unit_cost) || 0;
    const totalValue =
      item.total_value !== undefined
        ? parseFloat(item.total_value) || 0
        : balance * unitCost;
    return sum + totalValue;
  }, 0);

  rows.push([
    {
      content: "รวมมูลค่าทั้งสิ้น",
      colSpan: 8,
      styles: { halign: "right", fontStyle: "bold" },
    },
    totalValueSum.toLocaleString("th-TH", { minimumFractionDigits: 2 }),
  ]);

  /* ---- Export PDF ---- */
  await exportPDF({
    filename: "inventory-report.pdf",
    title: "รายงานคงคลัง (Inventory Report)",
    meta: {
      range: dateLabel,
      category: filters.categoryLabel || "ทั้งหมด",
      source: filters.sourceLabel || "ทุกแหล่งที่มา",
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
    },
    columns,
    rows,
    footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบคลังพัสดุ",
    options: {
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
      },
      signatures: {
        roles: ["ผู้จัดทำ", "หัวหน้าแผนก", "ผู้อำนวยการ"],
        names: [fullName, "", ""],
      },
    },
  });
}
