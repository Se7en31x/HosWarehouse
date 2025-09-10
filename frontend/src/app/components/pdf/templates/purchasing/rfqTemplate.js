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

/* ───────── main ───────── */
export default async function exportQuotation({
  filename = "quotation.pdf",
  meta = {}, // { "เลขที่เอกสาร", "วันที่", "ผู้ติดต่อ" }
  items = [], // [{ pr_no, item_name, qty_requested, unit, spec }]
}) {
  const opts = {
    page: { orientation: "portrait", format: "a4", unit: "mm" },
    margin: { left: 12, right: 12, bottom: 18, top: 20 },
    font: { family: "Sarabun", size: { title: 16, body: 11, table: 10, footer: 9 } },
    brand: {
      name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
      address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
      tel: "093-2804948",
      logo: "/logos/logo.png",
    },
    signatures: { roles: ["ผู้เสนอราคา", "ผู้จัดการ"], names: [] },
  };

  const doc = new jsPDF(opts.page);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const contentW = W - (opts.margin.left + opts.margin.right);

  /* fonts (Sarabun) */
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
    console.warn("Font load failed; fallback helvetica", e);
  }
  doc.setFont(sarabunReady ? "Sarabun" : "helvetica", "normal");

  /* ───────── Logo ───────── */
  if (opts.brand.logo) {
    try {
      const res = await fetch(opts.brand.logo);
      const blob = await res.blob();
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      doc.addImage(dataUrl, "PNG", opts.margin.left, 10, 26, 0);
    } catch (e) {
      console.warn("Logo load failed:", e);
    }
  }

  /* ───────── Header ───────── */
  doc.setFontSize(opts.font.size.title);
  doc.setFont("Sarabun", "bold");
  doc.text("ใบเสนอราคา", W - opts.margin.right, 18, { align: "right" });
  doc.setFontSize(12);
  doc.setFont("Sarabun", "normal");
  doc.text("(Quotation)", W - opts.margin.right, 25, { align: "right" });

  // company info
  let textStartX = opts.brand.logo ? opts.margin.left + 32 : opts.margin.left;
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(12);
  doc.text(opts.brand.name, textStartX, 18);
  doc.setFont("Sarabun", "normal");
  doc.setFontSize(11);
  doc.text([opts.brand.address, `โทร: ${opts.brand.tel}`], textStartX, 25);

  /* ───────── Meta Info ───────── */
  let y = 45;
  doc.setFontSize(11);
  doc.text(`เลขที่เอกสาร: ${textOrDash(meta["เลขที่เอกสาร"])}`, opts.margin.left, y);
  doc.text(`วันที่: ${textOrDash(meta["วันที่"])}`, W - opts.margin.right - 60, y);
  y += 7;
  doc.text(`ผู้ติดต่อ: ${textOrDash(meta["ผู้ติดต่อ"])}`, opts.margin.left, y);

  /* ───────── Table ───────── */
  const headRow = ["PR NO", "ชื่อสินค้า", "จำนวน", "หน่วย", "คุณลักษณะ"];

  autoTable(doc, {
    startY: y + 10,
    head: [headRow],
    body: items.map((it) => [
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
      lineColor: [0, 0, 0],     // ✅ เส้นดำ
      lineWidth: 0.35,          // ✅ ความหนาเส้นเหมือนกันหมด
      minCellHeight: 9,
      fillColor: [255, 255, 255], // ✅ พื้นหลังขาว
    },
    headStyles: {
      font: sarabunReady ? "Sarabun" : "helvetica",
      fontStyle: "bold",
      fillColor: [255, 255, 255], // ✅ หัวตารางพื้นขาว
      textColor: [0, 0, 0],       // ตัวหนังสือดำ
      halign: "center",
      lineWidth: 0.35,            // ✅ ใช้เท่ากับเส้นในตาราง
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
  });

  /* ───────── Signatures ───────── */
  const sigY = doc.lastAutoTable.finalY + 30;
  const each = contentW / 2; // 2 ช่องเซ็นชื่อ
  ["ผู้เสนอราคา", "ผู้จัดการ"].forEach((role, i) => {
    const cx = opts.margin.left + i * each + each / 2;
    doc.setFont("Sarabun", "normal");
    doc.text("ลงชื่อ...........................................", cx, sigY, { align: "center" });
    doc.text(`(${role})`, cx, sigY + 7, { align: "center" });
  });

  /* ───────── Footer ───────── */
  doc.setFontSize(opts.font.size.footer);
  doc.setFont("Sarabun", "normal");
  doc.text("หมายเหตุ: กำหนดยืนราคา 60 วัน", opts.margin.left, H - 12);

  doc.save(filename);
}
