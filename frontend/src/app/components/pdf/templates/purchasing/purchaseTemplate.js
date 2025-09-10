"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawMetaBlock } from "./metaBlock";
import { drawBrandHeader } from "./brandHeader";

function bufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function loadDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export default async function exportPurchasePDF({
  filename = "purchase.pdf",
  title = "เอกสารจัดซื้อ",
  meta = {},
  columns = ["รหัส", "รายการ", "จำนวน", "หน่วย", "ราคา/หน่วย", "รวม"],
  items = [],
  footerNote = "เอกสารจัดซื้อ – Purchasing Department",
  options = {},
}) {
  const opts = {
    page: { orientation: "portrait", format: "a4", unit: "mm" },
    margin: { left: 12, right: 12, bottom: 18, top: 22 },
    font: { family: "Sarabun", size: { title: 14, body: 11, table: 10, footer: 9 } },
    colors: {
      headFill: [230, 242, 255],
      headText: [0, 0, 0],
      gridLine: [150, 150, 150],
      zebra: [255, 255, 255],
    },
    footer: { showPageNumber: true },
    brand: options.brand ?? { name: "ฝ่ายจัดซื้อโรงพยาบาล" },
    signatures: options.signatures ?? {
      roles: ["ผู้ขอซื้อ", "ผู้อนุมัติ", "ผู้จัดซื้อ", "ผู้ส่งของ"],
      names: [],
    },
    ...options,
  };

  const doc = new jsPDF(opts.page);

  /* ✅ โหลดฟอนต์ Sarabun */
  const [regularBuffer, boldBuffer] = await Promise.all([
    fetch("/font/Sarabun/Sarabun-Regular.ttf").then((r) => r.arrayBuffer()),
    fetch("/font/Sarabun/Sarabun-Bold.ttf").then((r) => r.arrayBuffer()),
  ]);
  doc.addFileToVFS("Sarabun-Regular.ttf", bufferToBase64(regularBuffer));
  doc.addFont("Sarabun-Regular.ttf", "Sarabun", "normal");
  doc.addFileToVFS("Sarabun-Bold.ttf", bufferToBase64(boldBuffer));
  doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");

  // set ฟอนต์เริ่มต้น
  doc.setFont("Sarabun", "normal");
  doc.setFontSize(opts.font.size.body);

  let cursorY = opts.margin.top;

  /* ---- Brand Header ---- */
  if (opts.brand?.logo) {
    try {
      const imgData = await loadDataUrl(opts.brand.logo);
      doc.addImage(imgData, "PNG", opts.margin.left, 10, 20, 20);
    } catch (e) {
      console.error("โหลดโลโก้ไม่สำเร็จ:", e);
    }
  }
  const brandRes = await drawBrandHeader(doc, opts);
  cursorY = (brandRes.usedHeight || opts.margin.top) + 8;

  /* ---- Meta Block ---- */
  cursorY = drawMetaBlock(doc, { title, font: opts.font, meta }, cursorY);

  /* ---- ตาราง ---- */
  autoTable(doc, {
    startY: cursorY,
    head: [columns],
    body: items.map((item) => [
      item.code ?? "-",
      item.name ?? "-",
      item.qty ?? 0,
      item.unit ?? "-",
      item.price !== undefined
        ? item.price.toLocaleString("th-TH", { minimumFractionDigits: 2 })
        : "-",
      item.price !== undefined && item.qty !== undefined
        ? (item.qty * item.price).toLocaleString("th-TH", { minimumFractionDigits: 2 })
        : "-",
    ]),
    styles: {
      font: "Sarabun",
      fontSize: opts.font.size.table,
      cellPadding: 2,
      valign: "middle",
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
  });

  let afterTableY = doc.lastAutoTable.finalY + 20;

  /* ---- ลายเซ็น ---- */
  const colWidth =
    (doc.internal.pageSize.getWidth() - opts.margin.left - opts.margin.right) /
    opts.signatures.roles.length;

  opts.signatures.roles.forEach((role, i) => {
    const x = opts.margin.left + i * colWidth + colWidth / 2;
    doc.line(x - 25, afterTableY, x + 25, afterTableY);
    if (opts.signatures.names?.[i]) {
      doc.setFont("Sarabun", "bold");
      doc.text(opts.signatures.names[i], x, afterTableY + 6, { align: "center" });
    }
    doc.setFont("Sarabun", "normal");
    doc.text(`(${role})`, x, afterTableY + 12, { align: "center" });
  });

  /* ---- Footer ---- */
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(opts.font.size.footer);
    const y = doc.internal.pageSize.getHeight() - 12;
    if (footerNote) doc.text(footerNote, opts.margin.left, y);
    if (opts.footer.showPageNumber) {
      doc.text(`หน้า ${i}/${pageCount}`, doc.internal.pageSize.getWidth() - opts.margin.right, y, {
        align: "right",
      });
    }
  }

  doc.save(filename);
}
