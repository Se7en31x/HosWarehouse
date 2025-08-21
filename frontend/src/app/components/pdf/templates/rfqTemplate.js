// src/app/components/pdf/templates/rfqTemplate.js
export default function rfqTemplate(rfq, formatDate) {
  const title = "ใบขอราคา (Request for Quotation)";

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
  const val = (v) => (v === 0 || v ? String(v) : "-");

  // ===== บล็อกข้อมูลหน่วยงาน =====
  const headerBlock = [
    ["หน่วยงาน/โรงพยาบาล", rfq?.hospital_name || "โรงพยาบาล"],
    ["ที่อยู่หน่วยงาน", rfq?.hospital_address || "-"],
    [
      "ติดต่อ",
      [
        rfq?.hospital_phone ? `โทร: ${rfq.hospital_phone}` : "",
        rfq?.hospital_email ? `อีเมล: ${rfq.hospital_email}` : "",
      ].filter(Boolean).join("  |  ") || "-",
    ],
  ];

  // ===== ซ้าย/ขวา (จะใช้ 2 ตารางวางคู่กัน) =====
  const leftBlock = [
    ["เลขที่เอกสาร (RFQ No.)", val(rfq?.rfq_no)],
    ["วันที่ออกเอกสาร", fdate(rfq?.created_at)],
    ["อ้างอิงใบขอซื้อ (PR)", rfq?.pr_no ? `${rfq.pr_no}` : "-"],
    ["แผนก/หน่วยงานผู้ขอ", val(rfq?.requester_dept)],
    ["ผู้จัดทำ", val(rfq?.created_by_name)],
    ["สถานะ", val(rfq?.status)],
  ];

  const rightBlock = [
    ["ชื่อผู้ขาย", val(rfq?.supplier_name)],
    ["ผู้ติดต่อ", val(rfq?.supplier_contact)],
    [
      "โทรศัพท์/อีเมล",
      [rfq?.supplier_phone, rfq?.supplier_email].filter(Boolean).join("  |  ") || "-",
    ],
    ["ที่อยู่ผู้ขาย", val(rfq?.supplier_address)],
    ["เลขประจำตัวผู้เสียภาษี", val(rfq?.supplier_taxid)],
  ];

  // ===== เงื่อนไขหลังตาราง =====
  const footerBlock = [
    ["กำหนดส่งใบเสนอราคา", fdate(rfq?.quotation_deadline)],
    ["วิธีส่งใบเสนอ", val(rfq?.quotation_channel)],
    ["สถานที่/เงื่อนไขการส่งมอบ", val(rfq?.delivery_place)],
    ["เงื่อนไขการชำระเงิน", val(rfq?.payment_terms)],
    [
      "VAT/สกุลเงิน",
      `${rfq?.vat_included ? "รวม VAT" : "ไม่รวม VAT"}  |  ${rfq?.currency || "THB"}`,
    ],
    ["การรับประกัน", rfq?.warranty_months ? `${rfq.warranty_months} เดือน` : "-"],
    ["หมายเหตุ", val(rfq?.note)],
  ];

  // ===== ตารางรายการ =====
  const columns = ["ลำดับ", "รายการ/สเปก", "จำนวน", "หน่วย", "หมายเหตุ"];
  const rows = (rfq?.items || []).map((it, idx) => {
    const specBlock = [
      it.item_name || "-",
      it.spec ? `สเปก: ${it.spec}` : null,
      it.brand ? `ยี่ห้อ: ${it.brand}` : null,
      it.model ? `รุ่น: ${it.model}` : null,
    ].filter(Boolean).join("\n");
    return [idx + 1, specBlock || "-", it.qty ?? "-", it.unit || "-", it.remark || "-"];
  });

  return {
    title,
    meta: { headerBlock, leftBlock, rightBlock, footerBlock }, // 👉 ส่งแบบเป็นกลุ่ม
    columns,
    rows,
    filename: `${rfq?.rfq_no || "RFQ"}.pdf`,
  };
}
