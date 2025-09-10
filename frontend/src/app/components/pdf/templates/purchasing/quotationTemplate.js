// src/app/components/pdf/templates/purchasing/quotationTemplate.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ───────── helpers ───────── */
function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function textOrDash(v) {
  if (v === null || v === undefined) return "-";
  const s = String(v).trim();
  return s.length ? s : "-";
}

/**
 * exportQuotation
 * @param {Object} params
 * @param {string} params.filename - ชื่อไฟล์ .pdf ที่จะ save
 * @param {Object} params.meta - เมต้า: {"เลขที่เอกสาร","วันที่","ผู้ติดต่อ"}
 * @param {Array}  params.items - แถวข้อมูล: [{ pr_no, item_name, qty_requested, unit, spec }]
 */
export default async function exportQuotation({
  filename = "quotation.pdf",
  meta = {},
  items = [],
}) {
  // ── ค่าคงที่ดีไซน์ + แบรนด์ (ตามที่สั่งฟิกไว้) ─────────────────────────────
  const opts = {
    page: { orientation: "portrait", format: "a4", unit: "mm" },
    margin: { left: 12, right: 12, bottom: 18, top: 20 },
    font: { family: "Sarabun", size: { title: 16, body: 11, table: 10, footer: 9 } },
    brand: {
      name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
      address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
      tel: "093-2804948",
      logo: "/logos/logo.png", // ถ้ามีโลโก้ตาม path นี้
    },
    signatures: { roles: ["ผู้เสนอราคา", "ผู้จัดการ"] },
  };

  const doc = new jsPDF(opts.page);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - (opts.margin.left + opts.margin.right);

  /* ───────── โหลดฟอนต์ Sarabun ───────── */
  let sarabunReady = false;
  try {
    const [reg, bold] = await Promise.all([
      fetch("/font/Sarabun/Sarabun-Regular.ttf"),
      fetch("/font/Sarabun/Sarabun-Bold.ttf"),
    ]);
    if (!reg.ok || !bold.ok) throw new Error("Sarabun not found");
    const [rb, bb] = await Promise.all([reg.arrayBuffer(), bold.arrayBuffer()]);
    doc.addFileToVFS("Sarabun-Regular.ttf", bufferToBase64(rb));
    doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
    doc.addFileToVFS("Sarabun-Bold.ttf", bufferToBase64(bb));
    doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");
    sarabunReady = true;
  } catch (e) {
    // fallback helvetica
    console.warn("Font load failed; fallback helvetica", e);
  }
  doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "normal");

  /* ───────── โลโก้ ───────── */
  if (opts.brand.logo) {
    try {
      const res = await fetch(opts.brand.logo);
      if (res.ok) {
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
        doc.addImage(dataUrl, "PNG", opts.margin.left, 10, 26, 0);
      }
    } catch (e) {
      console.warn("Logo load failed:", e);
    }
  }

  /* ───────── หัวกระดาษ ───────── */
  doc.setFontSize(opts.font.size.title);
  doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "bold");
  doc.text("ใบเสนอราคา", W - opts.margin.right, 18, { align: "right" });
  doc.setFontSize(12);
  doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "normal");
  doc.text("(Quotation)", W - opts.margin.right, 25, { align: "right" });

  // ข้อมูลหน่วยงาน (ถัดจากโลโก้)
  const brandX = opts.brand.logo ? opts.margin.left + 32 : opts.margin.left;
  doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "bold");
  doc.setFontSize(12);
  doc.text(opts.brand.name, brandX, 18);
  doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "normal");
  doc.setFontSize(11);
  doc.text([opts.brand.address, `โทร: ${opts.brand.tel}`], brandX, 25);

  /* ───────── เมต้าเอกสาร ───────── */
  let y = 45;
  doc.setFontSize(11);
  doc.text(`เลขที่เอกสาร: ${textOrDash(meta["เลขที่เอกสาร"])}`, opts.margin.left, y);
  doc.text(`วันที่: ${textOrDash(meta["วันที่"])}`, W - opts.margin.right - 60, y);
  y += 7;
  doc.text(`ผู้ติดต่อ: ${textOrDash(meta["ผู้ติดต่อ"])}`, opts.margin.left, y);

  /* ───────── ตารางรายการ ─────────
     ตาม requirement:
     - พื้นหลัง “ขาว” ทั้งหัว+ตัวตาราง
     - เส้นสีดำเท่ากันทั้งหัวและตัวตาราง (เช่น 0.35)
     - ไม่มีส่วนสรุปราคา (ไม่ใส่ยอดรวม/ภาษี)
  */
  const headRow = ["PR NO", "ชื่อสินค้า", "จำนวน", "หน่วย", "คุณลักษณะ"];

  autoTable(doc, {
    startY: y + 10,
    head: [headRow],
    body: (items || []).map((it) => [
      textOrDash(it.pr_no),
      textOrDash(it.item_name),
      it.qty_requested ?? 0,
      textOrDash(it.unit),
      textOrDash(it.spec),
    ]),
    styles: {
      font: sarabunReady ? "Sarabun" : "helvetica",
      fontSize: opts.font.size.table,
      cellPadding: 2,
      valign: "middle",
      lineColor: [0, 0, 0],
      lineWidth: 0.35,           // ✅ ความหนาเส้นเดียวกันทั้งตาราง
      minCellHeight: 9,
      fillColor: [255, 255, 255] // ✅ พื้นหลังขาว
    },
    headStyles: {
      font: sarabunReady ? "Sarabun" : "helvetica",
      fontStyle: "bold",
      fillColor: [255, 255, 255], // ✅ หัวตารางพื้นขาว
      textColor: [0, 0, 0],
      halign: "center",
      lineWidth: 0.35,            // ✅ เท่ากับเส้นในตาราง
      minCellHeight: 11,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255], // ✅ ทุกแถวพื้นขาว
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 80 },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 36 },
    },
    tableWidth: contentW,
    margin: { left: opts.margin.left, right: opts.margin.right },
  });

  /* ───────── ช่องเซ็นชื่อ ───────── */
  const sigY = doc.lastAutoTable?.finalY
    ? Math.min(doc.lastAutoTable.finalY + 30, H - 40)
    : H - 40;

  const each = contentW / 2; // 2 ช่อง
  (opts.signatures.roles || ["ผู้เสนอราคา", "ผู้จัดการ"]).forEach((role, i) => {
    const cx = opts.margin.left + i * each + each / 2;
    doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "normal");
    doc.text("ลงชื่อ...........................................", cx, sigY, { align: "center" });
    doc.text(`(${role})`, cx, sigY + 7, { align: "center" });
  });

  /* ───────── ท้ายกระดาษ ───────── */
  doc.setFontSize(opts.font.size.footer);
  doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "normal");
  doc.text("หมายเหตุ: กำหนดยืนราคา 60 วัน", opts.margin.left, H - 12);

  doc.save(filename);
}
