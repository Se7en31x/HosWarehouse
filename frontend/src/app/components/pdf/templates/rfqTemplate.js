// src/app/components/pdf/templates/rfqTemplate.js
export default function rfqTemplate(rfq, formatDate) {
  const title = "ใบขอราคา (Request for Quotation)";

  // แปลงวันที่ให้ปลอดภัย
  const fdate = (v) => {
    if (!v) return "-";
    try {
      return typeof formatDate === "function"
        ? formatDate(v)
        : new Date(v).toLocaleString("th-TH");
    } catch {
      return "-";
    }
  };

  // คืน "-" ถ้าไม่มีค่า แต่ยอมรับ 0
  const val = (v) => (v === 0 || v ? String(v) : "-");

  /* ========= ส่วนหัวหน่วยงาน (เต็มความกว้าง) ========= */
  const headerBlock = [
    ["หน่วยงาน/โรงพยาบาล", rfq?.hospital_name || "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม"],
    ["ที่อยู่หน่วยงาน", rfq?.hospital_address || "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100"],
    [
      "ติดต่อ",
      [
        rfq?.hospital_phone ? `โทร: ${rfq.hospital_phone}` : "052 029 888",
        rfq?.hospital_email ? `อีเมล: ${rfq.hospital_email}` : "",
      ]
        .filter(Boolean)
        .join("\n") || "-", // ✅ ขึ้นบรรทัดใหม่ ลดการเบียด
    ],
  ];

  /* ========= คอลัมน์ซ้าย: รายละเอียดเอกสาร ========= */
  const leftBlock = [
    ["เลขที่เอกสาร (RFQ No.)", val(rfq?.rfq_no)],
    ["วันที่ออกเอกสาร", fdate(rfq?.created_at)],
    ["อ้างอิงใบขอซื้อ (PR)", rfq?.pr_no ? `${rfq.pr_no}` : "-"],
    ["แผนก/หน่วยงานผู้ขอ", val(rfq?.requester_dept)],
    ["ผู้จัดทำ", val(rfq?.created_by_name)],
    ["สถานะ", val(rfq?.status)],
  ];

  /* ========= คอลัมน์ขวา: ข้อมูลผู้ขาย ========= */
  const rightBlock = [
    ["ชื่อผู้ขาย", val(rfq?.supplier_name)],
    ["ผู้ติดต่อ", val(rfq?.supplier_contact)],
    [
      "โทรศัพท์/อีเมล",
      [rfq?.supplier_phone, rfq?.supplier_email].filter(Boolean).join("\n") || "-", // ✅ แยกบรรทัด
    ],
    ["ที่อยู่ผู้ขาย", val(rfq?.supplier_address)],
    ["เลขผู้เสียภาษี (Tax ID)", val(rfq?.supplier_taxid)], // ✅ ย่อฉลากกันตัดคำแปลก
  ];

  /* ========= เงื่อนไขท้ายเอกสาร ========= */
  const footerBlock = [
    ["กำหนดส่งใบเสนอราคา", fdate(rfq?.quotation_deadline)],
    ["วิธีส่งใบเสนอ", val(rfq?.quotation_channel)],
    ["สถานที่/เงื่อนไขการส่งมอบ", val(rfq?.delivery_place)],
    ["เงื่อนไขการชำระเงิน", val(rfq?.payment_terms)],
    [
      "VAT/สกุลเงิน",
      [rfq?.vat_included ? "รวม VAT" : "ไม่รวม VAT", rfq?.currency || "THB"].join("\n"), // ✅ แยกบรรทัด
    ],
    ["การรับประกัน", rfq?.warranty_months ? `${rfq.warranty_months} เดือน` : "-"],
    ["หมายเหตุ", val(rfq?.note)],
  ];

  /* ========= ตารางรายการ =========
     รายละเอียด/สเปก ใช้บูลเล็ต + ขึ้นบรรทัดใหม่เพื่ออ่านง่ายใน PDF
  */
  const columns = ["ลำดับ", "รายละเอียดรายการ / สเปก", "จำนวน", "หน่วย", "หมายเหตุ"];

  const rows = (rfq?.items || []).map((it, idx) => {
    const lines = [];
    lines.push(it.item_name || "-");
    if (it.spec) lines.push(`• สเปก: ${it.spec}`);
    if (it.brand) lines.push(`• ยี่ห้อ: ${it.brand}`);
    if (it.model) lines.push(`• รุ่น: ${it.model}`);

    return [
      idx + 1,
      lines.join("\n") || "-",
      it.qty ?? "",
      it.unit || "",
      it.remark || "",
    ];
  });

  // ✅ ฟิก RFQ: ขั้นต่ำ 10 แถว
  const TARGET_ROWS = 10;
  for (let i = rows.length; i < TARGET_ROWS; i++) {
    rows.push([i + 1, "", "", "", ""]);
  }

  /* ========= layout hint (ถ้า Exporter รองรับ) =========
     - twoColRatio: ซ้าย/ขวา 60/40 เพื่อให้ฝั่งขวากว้างขึ้น
     - tableColWidths: ความกว้างคอลัมน์ตารางรวม ~190mm (เผื่อ margin ซ้าย/ขวา)
  */
  const layout = {
    twoColRatio: [60, 40],
    // รวม 184 mm: 12 + 96 + 20 + 16 + 40
    tableColWidths: [12, 96, 20, 16, 40], // #, รายละเอียด, จำนวน, หน่วย, หมายเหตุ
    // stickyHeader: true,
  };

  return {
    title,
    meta: {
      headerBlock,
      leftBlock,
      rightBlock,
      footerBlock,
      layout,
      sections: {
        leftTitle: "รายละเอียดเอกสาร",
        rightTitle: "ข้อมูลผู้ขาย",
        footerTitle: "เงื่อนไข",
      },
    },
    columns,
    rows,
    filename: `${rfq?.rfq_no || "RFQ"}.pdf`,
  };
}
