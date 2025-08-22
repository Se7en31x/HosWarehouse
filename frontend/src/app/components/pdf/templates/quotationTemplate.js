// src/app/components/pdf/templates/quotationTemplate.js
export default function quotationTemplate(q, formatDate) {
  const title = "ใบเสนอราคา (Quotation)";

  // Helpers
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
  const num = (n) => (n == null || n === "" ? null : Number(n));
  const money = (n, fallback = "________") =>
    typeof n === "number" && isFinite(n)
      ? n.toLocaleString("th-TH", { minimumFractionDigits: 2 })
      : fallback;

  /* ========= ส่วนหัวหน่วยงาน ========= */
  const headerBlock = [
    ["หน่วยงาน/โรงพยาบาล", q?.hospital_name || "โรงพยาบาล"],
    ["ที่อยู่หน่วยงาน", q?.hospital_address || "-"],
    [
      "ติดต่อ",
      [
        q?.hospital_phone ? `โทร: ${q.hospital_phone}` : "",
        q?.hospital_email ? `อีเมล: ${q.hospital_email}` : "",
      ].filter(Boolean).join("\n") || "-",
    ],
  ];

  /* ========= คอลัมน์ซ้าย: รายละเอียดเอกสาร ========= */
  const leftBlock = [
    ["เลขที่ใบเสนอราคา (Quotation No.)", val(q?.quotation_no || q?.quote_no)],
    ["วันที่เสนอราคา", fdate(q?.quotation_date || q?.quote_date)],
    ["อ้างอิงใบขอราคา (RFQ)", val(q?.rfq_no)],
    ["อ้างอิงใบขอซื้อ (PR)", val(q?.pr_no)],
    ["วันยืนราคา", fdate(q?.price_valid_until || q?.valid_until)],
    ["สถานะ", val(q?.status)],
  ];

  /* ========= คอลัมน์ขวา: ข้อมูลผู้ขาย ========= */
  const rightBlock = [
    ["ชื่อผู้ขาย", val(q?.supplier_name)],
    ["ผู้ติดต่อ (Sales)", val(q?.supplier_contact || q?.sales_name)],
    [
      "โทรศัพท์/อีเมล",
      [q?.supplier_phone || q?.sales_phone, q?.supplier_email || q?.sales_email]
        .filter(Boolean).join("\n") || "-",
    ],
    ["ที่อยู่ผู้ขาย", val(q?.supplier_address)],
    ["เลขผู้เสียภาษี (Tax ID)", val(q?.supplier_taxid)],
  ];

  /* ========= ตารางรายการ (มีราคา/ส่วนลด/รวม) ========= */
  const columns = [
    "#",
    "รายการ / สเปก",
    "จำนวน",
    "หน่วย",
    "ราคาต่อหน่วย (เสนอ)",
    "ส่วนลด",
    "รวม (เสนอ)",
    "หมายเหตุ",
  ];

  let subTotal = 0;
  const currency = q?.currency || "THB";
  const rows = (q?.items || []).map((it, idx) => {
    const qty = num(it.qty) ?? 0;
    const unitPrice = num(it.quoted_unit_price ?? it.unit_price ?? it.price);
    const discount = num(it.quoted_discount ?? it.discount) ?? 0;

    const lines = [];
    lines.push(it.item_name || "-");
    if (it.spec)  lines.push(`• สเปก: ${it.spec}`);
    if (it.brand) lines.push(`• ยี่ห้อ: ${it.brand}`);
    if (it.model) lines.push(`• รุ่น: ${it.model}`);

    const lineTotal =
      unitPrice != null ? Math.max(0, qty * unitPrice - discount) : null;
    if (typeof lineTotal === "number") subTotal += lineTotal;

    return [
      idx + 1,
      lines.join("\n") || "-",
      it.qty ?? "-",
      it.unit || "-",
      unitPrice != null ? money(unitPrice) : "________",
      discount ? money(discount) : (discount === 0 ? money(0) : "________"),
      lineTotal != null ? money(lineTotal) : "________",
      it.remark || "-",
    ];
  });

  /* ========= สรุปยอดท้ายตาราง ========= */
  const shipping = num(q?.shipping_fee) ?? 0;
  const vatRate = q?.vat_exempt ? 0 : (num(q?.vat_rate) ?? 7);
  const baseForVat = subTotal + shipping;
  const vatAmount = baseForVat * (vatRate / 100);
  const grandTotal = baseForVat + vatAmount;

  if (rows.length) rows.push(["", "", "", "", "", "", "", ""]);
  rows.push(["", "", "", "", "", "รวมย่อย", money(subTotal), ""]);
  if (shipping) rows.push(["", "", "", "", "", "ค่าขนส่ง", money(shipping), ""]);
  rows.push(["", "", "", "", "", `VAT ${vatRate}%`, money(vatAmount), ""]);
  rows.push(["", "", "", "", "", `รวมทั้งสิ้น (${currency})`, money(grandTotal), ""]);

  /* ========= เงื่อนไขท้ายเอกสาร ========= */
  const footerBlock = [
    ["ระยะเวลาส่งมอบ", val(q?.delivery_leadtime || q?.delivery_time)],
    ["สถานที่/เงื่อนไขการส่งมอบ", val(q?.delivery_place || q?.delivery_terms)],
    ["เงื่อนไขการชำระเงิน", val(q?.payment_terms)],
    [
      "VAT/สกุลเงิน",
      [
        q?.vat_included ? "รวม VAT" : "ไม่รวม VAT",
        currency,
      ].join("\n"),
    ],
    ["การรับประกัน", q?.warranty_months ? `${q.warranty_months} เดือน` : "-"],
    ["หมายเหตุ", val(q?.note)],
  ];

  /* ========= layout hint ========= */
  const layout = {
    twoColRatio: [60, 40],
    tableColWidths: [10, 80, 14, 12, 20, 16, 24, 14], // รวม ~190mm
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
        leftTitle: "รายละเอียดใบเสนอราคา",
        rightTitle: "ข้อมูลผู้ขาย",
        footerTitle: "เงื่อนไข",
      },
    },
    columns,
    rows,
    filename: `${q?.quotation_no || q?.quote_no || "Quotation"}.pdf`,
  };
}
