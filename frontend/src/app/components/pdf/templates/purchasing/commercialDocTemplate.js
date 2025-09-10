// src/app/components/pdf/templates/purchasing/commercialDocTemplate.js
// แกนกลาง: รองรับใบเสร็จ (receipt), ใบกำกับภาษี (taxInvoice), ใบส่งของ/ใบแจ้งหนี้ (deliveryOrder)

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ✅ ฟอนต์ไทย (ต้องมีไฟล์ base64 ฟอนต์ Sarabun)
// แนะนำสร้างไฟล์: src/app/components/pdf/fonts/sarabunBase64.js
// ที่ export { sarabunNormal, sarabunBold }
import { sarabunNormal, sarabunBold } from "@/app/components/pdf/fonts/sarabunBase64";

export const DOC_TYPES = {
  RECEIPT: "receipt",
  TAX_INVOICE: "taxInvoice",
  DELIVERY_ORDER: "deliveryOrder",
};

const DEFAULT_MARGIN = 40;

function addThaiFonts(doc) {
  doc.addFileToVFS("Sarabun.ttf", sarabunNormal);
  doc.addFileToVFS("Sarabun-Bold.ttf", sarabunBold);
  doc.addFont("Sarabun.ttf", "Sarabun", "Normal");
  doc.addFont("Sarabun-Bold.ttf", "Sarabun", "Bold");
  doc.setFont("Sarabun", "Normal");
}

function titleFor(docType) {
  switch (docType) {
    case DOC_TYPES.RECEIPT:
      return "ใบเสร็จรับเงิน (RECEIPT)";
    case DOC_TYPES.DELIVERY_ORDER:
      return "ใบส่งสินค้า / ใบแจ้งหนี้ (DELIVERY ORDER / INVOICE)";
    default:
      return "ใบกำกับภาษี (TAX INVOICE)";
  }
}

function columnsFor(docType) {
  if (docType === DOC_TYPES.RECEIPT) {
    return [
      { header: "รหัส", dataKey: "code" },
      { header: "รายละเอียด", dataKey: "name" },
      { header: "หน่วย", dataKey: "uom", halign: "center" },
      { header: "จำนวน", dataKey: "qty", halign: "right" },
      { header: "ราคา/หน่วย", dataKey: "unitPrice", halign: "right" },
      { header: "ส่วนลด", dataKey: "discount", halign: "right" },
      { header: "จำนวนเงิน", dataKey: "amount", halign: "right" },
    ];
  }
  // TAX INVOICE / DELIVERY ORDER – โครงเหมือนกัน
  return [
    { header: "QTY", dataKey: "qty", halign: "right" },
    { header: "CODE", dataKey: "code" },
    { header: "DESCRIPTION", dataKey: "name" },
    { header: "UNIT PRICE", dataKey: "unitPrice", halign: "right" },
    { header: "AMOUNT", dataKey: "amount", halign: "right" },
  ];
}

function drawHeader(doc, { W, title, brand, meta }) {
  // Brand (ซ้ายบน)
  doc.setFont("Sarabun", "Bold");
  doc.setFontSize(12);
  if (brand?.name) doc.text(brand.name, DEFAULT_MARGIN, 44);
  doc.setFont("Sarabun", "Normal");
  doc.setFontSize(10);
  const brandLines = []
  if (brand?.address) brandLines.push(brand.address);
  if (brand?.tel) brandLines.push(`โทร: ${brand.tel}`);
  if (brandLines.length) doc.text(brandLines, DEFAULT_MARGIN, 60);

  // Title + meta (ขวาบน)
  doc.setFont("Sarabun", "Bold");
  doc.setFontSize(16);
  doc.text(title, W - DEFAULT_MARGIN, 48, { align: "right" });

  doc.setFont("Sarabun", "Normal");
  doc.setFontSize(10);
  const metaRight = [];
  if (meta?.docNo) metaRight.push(`เลขที่เอกสาร: ${meta.docNo}`);
  if (meta?.date) metaRight.push(`วันที่: ${meta.date}`);
  if (metaRight.length) {
    doc.text(metaRight, W - DEFAULT_MARGIN, 66, { align: "right" });
  }
}

function drawPartiesBlock(doc, y, W, parties) {
  const half = (W - DEFAULT_MARGIN * 2) / 2;
  // กล่องลูกค้า
  drawBox(doc, DEFAULT_MARGIN, y, half - 10, 68, "ลูกค้า / CUSTOMER", parties?.customer || "");
  drawBox(doc, DEFAULT_MARGIN, y + 72, half - 10, 36, "เลขประจำตัวผู้เสียภาษี / TAX ID", parties?.taxId || "");
  // Ship To / Address
  drawBox(
    doc,
    DEFAULT_MARGIN + half + 10,
    y,
    half - 10,
    108,
    "ที่อยู่/สถานที่ส่งของ / ADDRESS (Ship To)",
    parties?.shipTo || parties?.address || ""
  );
}

function drawMetaGrid(doc, y, pairs) {
  const colW = 180;
  const rowH = 24;
  let cx = DEFAULT_MARGIN;
  let cy = y;
  pairs.forEach(([k, v], i) => {
    doc.setDrawColor(225);
    doc.setLineWidth(0.6);
    doc.rect(cx, cy, colW, rowH);
    doc.setFontSize(9);
    doc.text(k, cx + 6, cy + 10);
    doc.setFontSize(11);
    doc.text(String(v ?? "-"), cx + 6, cy + 20);
    cx += colW;
    if ((i + 1) % 3 === 0) {
      cx = DEFAULT_MARGIN;
      cy += rowH;
    }
  });
  return cy + rowH;
}

function drawTotalsRight(doc, y, W, t) {
  const boxW = 260;
  const x = W - DEFAULT_MARGIN - boxW;
  const rows = [
    ["จำนวนเงินก่อนภาษี (Amount Before VAT)", t.beforeVat],
    [`ภาษีมูลค่าเพิ่ม ${t.vatRate ?? 7}% (VAT)`, t.vatAmount],
    ["รวมเงิน (TOTAL)", t.grandTotal],
  ];
  rows.forEach(([label, val], i) => {
    const rowH = i < 2 ? 22 : 26;
    const rowY = y + (i === 0 ? 0 : rows.slice(0, i).reduce((s, _r, idx) => s + (idx < 2 ? 22 : 26), 0));
    doc.setDrawColor(i < 2 ? 225 : 90);
    doc.setLineWidth(i < 2 ? 0.6 : 0.8);
    doc.rect(x, rowY, boxW, rowH);
    doc.setFontSize(i < 2 ? 11 : 12);
    doc.setFont("Sarabun", i < 2 ? "Normal" : "Bold");
    doc.text(label, x + 8, rowY + rowH / 2 + (i < 2 ? 3 : 4));
    doc.text(formatNumber(val), x + boxW - 8, rowY + rowH / 2 + (i < 2 ? 3 : 4), { align: "right" });
  });
}

function drawSignatures(doc, baseY, slots = []) {
  let x = DEFAULT_MARGIN;
  slots.forEach((s) => {
    const width = s.width ?? 200;
    doc.setDrawColor(190);
    doc.setLineWidth(0.6);
    doc.line(x, baseY, x + width, baseY);
    doc.setFontSize(9);
    doc.text(s.label || "", x, baseY + 14);
    x += width + 24;
  });
}

function drawPaidStamp(doc, W, H, text = "จ่ายแล้ว") {
  doc.setTextColor(220, 38, 38);
  doc.setFont("Sarabun", "Bold");
  doc.setFontSize(42);
  doc.text(text, W - 150, H - 120, { angle: -18 });
  doc.setTextColor(0, 0, 0);
}

function drawBox(doc, x, y, w, h, label, value = "") {
  doc.setDrawColor(209);
  doc.setLineWidth(0.6);
  doc.rect(x, y, w, h);
  doc.setFontSize(9);
  doc.text(label, x + 6, y + 12);
  doc.setFontSize(11);
  wrapText(doc, value, x + 6, y + 28, w - 12, 14);
}

function formatNumber(n) {
  return (n ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function wrapText(doc, text, x, y, maxW, lineH) {
  const lines = doc.splitTextToSize(String(text || ""), maxW);
  lines.forEach((ln, i) => doc.text(ln, x, y + i * lineH));
}

function drawFooterPageNumber(doc, W, H) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.text(`หน้า ${i} / ${pageCount}`, W - DEFAULT_MARGIN, H - 18, { align: "right" });
  }
}

/**
 * Core Exporter
 */
export function exportCommercialDoc({
  docType = DOC_TYPES.TAX_INVOICE,
  brand = { name: "", address: "", tel: "" },
  parties = { customer: "", address: "", taxId: "", shipTo: "" },
  meta = { docNo: "", date: "", poNo: "", terms: "", priceType: "", dueDate: "" },
  items = [],
  totals = { beforeVat: 0, vatRate: 7, vatAmount: 0, grandTotal: 0 },
  remark = "",
  signatures = [
    { label: "ผู้รับสินค้า / RECEIVER", width: 200 },
    { label: "ผู้ตรวจสอบ / CHECKED BY", width: 200 },
    { label: "ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE", width: 240 },
  ],
  options = {
    page: { orientation: "portrait" },
    withBackground: false,
    backgroundDataUrl: null,
    paidStamp: false,
    watermarkText: null,
  },
  fileName = "document.pdf",
}) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
    orientation: options?.page?.orientation || "portrait",
  });

  addThaiFonts(doc);

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // พื้นหลัง/วอเตอร์มาร์ก
  if (options?.withBackground && options?.backgroundDataUrl) {
    doc.addImage(options.backgroundDataUrl, "JPEG", 0, 0, W, H);
  }
  if (options?.watermarkText) {
    doc.setFont("Sarabun", "Bold");
    doc.setTextColor(0, 0, 0);
    doc.setGState(new doc.GState({ opacity: 0.05 }));
    doc.setFontSize(320);
    doc.text(options.watermarkText, W / 2, H / 2, { align: "center", angle: -20 });
    doc.setGState(new doc.GState({ opacity: 1 }));
  }

  // Header
  drawHeader(doc, { W, title: titleFor(docType), brand, meta });

  // Parties + Meta
  let cursorY = 86;
  drawPartiesBlock(doc, cursorY, W, parties);
  cursorY += 116;

  cursorY = drawMetaGrid(doc, cursorY + 10, [
    ["PO No.", meta?.poNo || "-"],
    ["Terms", meta?.terms || "-"],
    ["ประเภทราคา", meta?.priceType || "-"],
    ["กำหนดชำระ", meta?.dueDate || "-"],
    ["เขต/ผู้ขาย", meta?.sales || "-"],
    ["อ้างอิงอื่น", meta?.ref || "-"],
  ]);

  // ตารางรายการ
  const tableStartY = cursorY + 16;
  const columns = columnsFor(docType);

  autoTable(doc, {
    startY: tableStartY,
    columns,
    body: items,
    theme: "grid",
    styles: { font: "Sarabun", fontSize: 10, cellPadding: 4, lineWidth: 0.2 },
    headStyles: { fillColor: [243, 244, 246], textColor: 40, lineWidth: 0.2 },
    margin: { left: DEFAULT_MARGIN, right: DEFAULT_MARGIN },
    columnStyles: {
      qty: { halign: "right" },
      unitPrice: { halign: "right" },
      amount: { halign: "right" },
      uom: { halign: "center" },
    },
    didDrawPage: (data) => {
      // วาด header ทุกหน้า
      if (data.pageNumber > 1) {
        drawHeader(doc, { W, title: titleFor(docType), brand, meta });
      }
    },
  });

  const endTableY = doc.lastAutoTable.finalY || tableStartY;

  // Totals
  drawTotalsRight(doc, endTableY + 12, W, totals);

  // Remarks
  if (remark) {
    doc.setFont("Sarabun", "Normal");
    doc.setFontSize(10);
    doc.text(`หมายเหตุ: ${remark}`, DEFAULT_MARGIN, H - 120);
  }

  // Signatures
  drawSignatures(doc, H - 92, signatures);

  // Paid Stamp
  if (options?.paidStamp) drawPaidStamp(doc, W, H);

  // Footer page number
  drawFooterPageNumber(doc, W, H);

  // Save
  doc.save(fileName);
}
