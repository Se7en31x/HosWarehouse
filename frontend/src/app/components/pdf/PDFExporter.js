// src/app/components/pdf/PDFExporter.js
"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default async function exportPDF({
  filename = "report.pdf",
  title = "รายงาน",
  meta = [], // สามารถเป็น array (แบบเดิม) หรือ object {headerBlock,leftBlock,rightBlock,footerBlock}
  columns = [],
  rows = [],
  footerNote = "",
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  // โหลดฟอนต์ Sarabun
  const [regularBuffer, boldBuffer] = await Promise.all([
    fetch("/font/Sarabun/Sarabun-Regular.ttf").then((r) => r.arrayBuffer()),
    fetch("/font/Sarabun/Sarabun-Bold.ttf").then((r) => r.arrayBuffer()),
  ]);
  const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  doc.addFileToVFS("Sarabun.ttf", toB64(regularBuffer));
  doc.addFont("Sarabun.ttf", "Sarabun", "normal");
  doc.addFileToVFS("Sarabun-Bold.ttf", toB64(boldBuffer));
  doc.addFont("Sarabun-Bold.ttf", "Sarabun", "bold");

  const pageW = doc.internal.pageSize.getWidth();

  // หัวเรื่อง
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(15);
  doc.text(title || "รายงาน", pageW / 2, 18, { align: "center" });

  let cursorY = 24;

  const drawKeyValueTable = (bodyRows, opts = {}) => {
    if (!Array.isArray(bodyRows) || bodyRows.length === 0) return cursorY;
    autoTable(doc, {
      startY: cursorY,
      theme: opts.theme || "plain",
      styles: { font: "Sarabun", fontSize: 10, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: opts.labelW ?? 40, fontStyle: "bold" },
        1: { cellWidth: (opts.tableW ?? (pageW - 20)) - (opts.labelW ?? 40) },
      },
      body: bodyRows,
      margin: { left: opts.left ?? 10, right: 10 },
      tableWidth: opts.tableW ?? (pageW - 20),
    });
    cursorY = doc.lastAutoTable.finalY + (opts.gap ?? 4);
    return cursorY;
  };

  // ----- วาด meta -----
  if (Array.isArray(meta)) {
    // โหมดเดิม: meta เป็นแถว ๆ
    drawKeyValueTable(meta, { theme: "plain", gap: 6 });
  } else if (meta && typeof meta === "object") {
    const { headerBlock = [], leftBlock = [], rightBlock = [], footerBlock = [] } = meta;

    // 1) Header (เต็มความกว้าง)
    if (headerBlock.length) drawKeyValueTable(headerBlock, { theme: "plain", gap: 6 });

    // 2) Left + Right (สองคอลัมน์)
    const halfW = (pageW - 20) / 2;
    let leftY = cursorY;
    let rightY = cursorY;

    if (leftBlock.length) {
      autoTable(doc, {
        startY: leftY,
        theme: "plain",
        styles: { font: "Sarabun", fontSize: 10, cellPadding: 1.8 },
        columnStyles: { 0: { cellWidth: 36, fontStyle: "bold" }, 1: { cellWidth: halfW - 36 } },
        body: leftBlock,
        margin: { left: 10, right: 10 },
        tableWidth: halfW,
      });
      leftY = doc.lastAutoTable.finalY;
    }

    if (rightBlock.length) {
      autoTable(doc, {
        startY: rightY,
        theme: "plain",
        styles: { font: "Sarabun", fontSize: 10, cellPadding: 1.8 },
        columnStyles: { 0: { cellWidth: 34, fontStyle: "bold" }, 1: { cellWidth: halfW - 34 } },
        body: rightBlock,
        margin: { left: 10 + halfW, right: 10 },
        tableWidth: halfW,
      });
      rightY = doc.lastAutoTable.finalY;
    }

    cursorY = Math.max(leftY, rightY) + 6;
  }

  // ----- ตารางรายการ -----
  autoTable(doc, {
    startY: cursorY,
    theme: "grid",
    head: [columns],
    body: rows,
    styles: { font: "Sarabun", fontSize: 9, cellPadding: 2, overflow: "linebreak", valign: "top" },
    headStyles: { font: "Sarabun", fontStyle: "bold", fillColor: [225, 225, 225], textColor: 0 },
    margin: { left: 10, right: 10, bottom: 18 },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      doc.setFont("Sarabun", "normal");
      doc.setFontSize(8);
      if (footerNote) doc.text(footerNote, 10, 290);
      doc.text(`หน้า ${data.pageNumber} / ${pageCount}`, pageW - 10, 290, { align: "right" });
    },
  });

  cursorY = doc.lastAutoTable.finalY + 6;

  // ----- Footer meta ใต้ตาราง -----
  if (meta && typeof meta === "object" && Array.isArray(meta.footerBlock) && meta.footerBlock.length) {
    // หัวข้อเล็ก
    doc.setFont("Sarabun", "bold");
    doc.setFontSize(11);
    if (cursorY > 260) { doc.addPage(); cursorY = 18; }
    doc.text("เงื่อนไขและข้อกำหนด (Terms & Conditions)", 10, cursorY);
    cursorY += 2;

    autoTable(doc, {
      startY: cursorY,
      theme: "plain",
      styles: { font: "Sarabun", fontSize: 10, cellPadding: 1.8 },
      columnStyles: { 0: { cellWidth: 46, fontStyle: "bold" }, 1: { cellWidth: pageW - 20 - 46 } },
      body: meta.footerBlock,
      margin: { left: 10, right: 10, bottom: 18 },
    });
    cursorY = doc.lastAutoTable.finalY + 4;
  }

  doc.save(filename);
}
