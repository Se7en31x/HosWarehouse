"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawMetaBlock } from "./metaBlock";
import { drawBrandHeader } from "./brandHeader";

/* ======================
   Helper: Buffer → Base64
====================== */
function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/* ======================
   Helper: Load image URL → DataURL
====================== */
async function loadDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/* ======================
   Export PDF (Engine)
====================== */
export default async function exportPDF({
  filename = "report.pdf",
  title = "รายงาน",
  meta = {},
  columns = [],
  rows = [],
  footerNote = "",
  options = {},
}) {
  const opts = {
    page: { orientation: "landscape", format: "a4", unit: "mm" },
    margin: { left: 12, right: 12, bottom: 18, top: 22 },
    font: { family: "Sarabun", size: { title: 12, body: 10, table: 9, footer: 8 } },
    colors: {
      headFill: [255, 255, 255],   // พื้นหลังหัวตาราง = ขาว
      headText: [0, 0, 0],         // ตัวอักษรหัวตาราง = ดำ
      gridLine: [0, 0, 0],         // เส้นตาราง = ดำ
      zebra: [255, 255, 255],      // แถวสลับ = ขาว (ไม่มีแรเงา)
    },
    footer: { y: 290, showPageNumber: true },
    signatures: options.signatures ?? null,
    brand: options.brand ?? null,
    ...options,
  };

  const doc = new jsPDF({
    unit: opts.page.unit,
    format: opts.page.format,
    orientation: opts.page.orientation,
    compress: true,
  });

  /* ---- โหลดฟอนต์ Sarabun ---- */
  const [regularBuffer, boldBuffer] = await Promise.all([
    fetch("/font/Sarabun/Sarabun-Regular.ttf").then((r) => r.arrayBuffer()),
    fetch("/font/Sarabun/Sarabun-Bold.ttf").then((r) => r.arrayBuffer()),
  ]);

  doc.addFileToVFS("Sarabun.ttf", bufferToBase64(regularBuffer));
  doc.addFont("Sarabun.ttf", "Sarabun", "normal");

  doc.addFileToVFS("Sarabun-Bold.ttf", bufferToBase64(boldBuffer));
  doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");

  doc.setFont("Sarabun", "normal");

  const pageW = doc.internal.pageSize.getWidth();

  /* ---- Brand Header + Logo ---- */
  let cursorY = opts.margin.top;
  if (opts.brand) {
    // ✅ ถ้ามีโลโก้ ให้แสดงก่อน
    if (opts.brand.logo) {
      try {
        const imgData = await loadDataUrl(opts.brand.logo);
        doc.addImage(imgData, "PNG", opts.margin.left, 10, 25, 25); // x, y, w, h
      } catch (e) {
        console.error("โหลดโลโก้ไม่สำเร็จ:", e);
      }
    }

    const brandRes = await drawBrandHeader(doc, opts);
    cursorY = (brandRes.usedHeight || opts.margin.top) + 8;
  }

  /* ---- Meta Block ---- */
  cursorY = drawMetaBlock(doc, { title, font: opts.font, meta }, cursorY);

  /* ---- ตารางข้อมูล ---- */
  autoTable(doc, {
    startY: cursorY,
    head: [columns],
    body: rows,
    styles: {
      font: "Sarabun",
      fontSize: opts.font.size.table,
      cellPadding: 2,
      overflow: "linebreak",
      valign: "top",
      lineColor: opts.colors.gridLine,
      lineWidth: 0.25,
    },
    headStyles: {
      font: "Sarabun",
      fontStyle: "bold",
      fillColor: opts.colors.headFill,
      textColor: opts.colors.headText,
      halign: "center",
    },
    alternateRowStyles: { fillColor: opts.colors.zebra },
    margin: { left: opts.margin.left, right: opts.margin.right, bottom: opts.margin.bottom },
  });

  // ✅ หลังวาดตารางแล้ว คำนวณตำแหน่ง Y ของตารางสุดท้าย
  let afterTableY = doc.lastAutoTable.finalY + 15;

  // ---- ลายเซ็น (optional) ----
  if (opts.signatures) {
    const pageW = doc.internal.pageSize.getWidth();
    const colWidth =
      (pageW - opts.margin.left - opts.margin.right) / opts.signatures.roles.length;

    opts.signatures.roles.forEach((role, i) => {
      const x = opts.margin.left + i * colWidth + colWidth / 2;
      doc.setFont("Sarabun", "normal");
      doc.line(x - 25, afterTableY, x + 25, afterTableY);
      if (opts.signatures.names?.[i]) {
        doc.setFont("Sarabun", "bold");
        doc.text(opts.signatures.names[i], x, afterTableY + 6, { align: "center" });
      }
      doc.setFont("Sarabun", "normal");
      doc.text(`(${role})`, x, afterTableY + 12, { align: "center" });
    });
  }

  // ---- Page number + footer ----
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(opts.font.size.footer);

    const pageHeight = doc.internal.pageSize.getHeight();
    const y = pageHeight - 10;

    // Note (ชิดซ้าย)
    if (footerNote) {
      doc.text(footerNote, opts.margin.left, y);
    }

    // Page number (ชิดขวา)
    doc.text(
      `หน้า ${i} / ${pageCount}`,
      doc.internal.pageSize.getWidth() - opts.margin.right,
      y,
      { align: "right" }
    );
  }

  doc.save(filename);
}
