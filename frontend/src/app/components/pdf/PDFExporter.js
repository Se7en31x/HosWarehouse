// src/app/components/pdf/PDFExporter.js
"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ============== Helpers ============== */
async function loadDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Header โรงพยาบาล/แบรนดิ้ง (วาดเฉพาะถ้าส่ง brand มา) — ไม่มีกรอบ/กล่อง
async function drawBrandHeader(doc, opts) {
  const brand = opts.brand;
  if (!brand) return { usedHeight: 0 };

  const pageW = doc.internal.pageSize.getWidth();
  const left = opts.margin?.left ?? 12;
  const right = opts.margin?.right ?? 12;

  const bandH = brand.headerBand ? 10 : 0;
  if (brand.headerBand) {
    const c = brand.bandColor ?? [0, 0, 0];
    doc.setFillColor(...c);
    doc.rect(0, 0, pageW, bandH, "F");
  }

  const topY = Math.max(bandH + 6, (opts.margin?.top ?? 22) - 2);
  let x = left, y = topY;

  // โลโก้ (ถ้ามี)
  if (brand.logoDataUrl || brand.logoUrl) {
    try {
      const dataUrl = brand.logoDataUrl || (await loadDataUrl(brand.logoUrl));
      const h = brand.logoHeight ?? 16;
      const w = brand.logoWidth ?? h;
      doc.addImage(dataUrl, "PNG", x, y - 2, w, h);
      x += w + 6;
    } catch { }
  }

  // ชื่อ/ที่อยู่ (ตัวอักษรล้วน ไม่มีกรอบ)
  doc.setFont("Sarabun", "bold"); doc.setFontSize(13);
  doc.text(brand.name || "โรงพยาบาล", x, y + 2);

  doc.setFont("Sarabun", "normal"); doc.setFontSize(9);
  const lines = [
    brand.address,
    [brand.phone && `โทร: ${brand.phone}`, brand.email && `อีเมล: ${brand.email}`].filter(Boolean).join("  |  "),
  ].filter(Boolean);

  let yy = y + 7;
  lines.forEach((t) => { doc.text(String(t), x, yy); yy += 5; });

  // เส้นคั่นบาง ๆ ใต้หัว
  const after = Math.max(yy, bandH + 10) + 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(left, after, pageW - right, after);

  return { usedHeight: after };
}

// ลายน้ำ (ถ้าต้องการ)
function drawWatermark(doc, text, angle = 30) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setTextColor(210);
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(60);
  doc.text(text, pageW / 2, pageH / 2, { align: "center", angle });
  doc.setTextColor(0);
}

// กล่องลายเซ็น 3 ช่อง (ตัวหนังสือล้วน ไม่มีกรอบรอบหน้า)
function drawSignatures(doc, opts, startY) {
  if (!opts.signatures) return;
  const pageW = doc.internal.pageSize.getWidth();
  const left = opts.margin.left, right = opts.margin.right;
  const usableW = pageW - left - right;
  const colW = usableW / 3;

  const roles = opts.signatures.roles || ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"];
  const names = opts.signatures.names || []; // ✅ เพิ่มรับชื่อจาก options
  const date = new Date();
  const dateLabel = `วันที่: ${date.getDate().toString().padStart(2, "0")} / ${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")} / ${date.getFullYear() + 543}`; // ✅ วันที่อัตโนมัติ (พ.ศ.)

  let x = left, y = startY + 6;
  for (let i = 0; i < 3; i++) {
    doc.setFont("Sarabun", "bold"); 
    doc.setFontSize(10);
    doc.text(roles[i] || "", x, y + 8);

    doc.setFont("Sarabun", "normal"); 
    doc.setFontSize(9);
    doc.text("ลงชื่อ ____________________________", x, y + 16);

    // ✅ ถ้ามีชื่อ → แสดงชื่อในวงเล็บ
    const displayName = names[i] ? `(${names[i]})` : "(_______________________________)";
    doc.text(displayName, x, y + 22);

    doc.text(dateLabel, x, y + 28);
    x += colW;
  }
}

// หัวข้อส่วน (เรียบ ๆ — ไม่มีกรอบ/พื้นหลัง)
function sectionLabel(doc, text, x, y) {
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(String(text), x, y);
}

/* ============== Exporter ============== */
export default async function exportPDF({
  filename = "report.pdf",
  title = "รายงาน",
  meta = [],            // array หรือ { headerBlock,leftBlock,rightBlock,footerBlock, layout?, sections? }
  columns = [],
  rows = [],
  footerNote = "",
  options = {},
}) {
  // ดีฟอลต์โทนราชการ + สมส่วน (ไม่มีกรอบ)
  const opts = {
    page: { orientation: "portrait", format: "a4", unit: "mm" },
    margin: { left: 12, right: 12, bottom: 18, top: 22 },
    font: { family: "Sarabun", size: { title: 16, body: 10, table: 9, footer: 8 } },
    colors: {
      headFill: [230, 230, 230], // หัวตารางเทาอ่อน
      headText: [0, 0, 0],
      gridLine: [140, 140, 140],
      zebra: [245, 245, 245],    // สลับสีแถว
    },
    metaWidth: { label: 54, twoColLeft: 50, twoColRight: 54, footerLabel: 56 },
    gap: { section: 8, meta: 4 },
    twoCol: { leftRatio: 0.52 }, // ซ้าย 55% / ขวา 45%
    table: {
      headTheme: "grid",
      bodyOverflow: "linebreak",
      valign: "top",
      lineWidth: 0.25,
      columnStyles: {},
    },
    footer: { y: 290, showPageNumber: true },
    brand: options.brand ?? null,
    watermark: options.watermark ?? null,
    signatures: options.signatures ?? null,
    footerCols: options.footerCols,   // บังคับ 1 หรือ 2 คอลัมน์ได้ (ไม่ระบุ = อัตโนมัติ)
    ...options,
  };

  // jsPDF
  const doc = new jsPDF({
    unit: opts.page.unit,
    format: opts.page.format,
    orientation: opts.page.orientation,
    compress: true,
  });

  // ฟอนต์ Sarabun (ต้องมีไฟล์ใน public/font/Sarabun/)
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

  // หัวจดหมาย (ถ้ามี brand)
  const brandRes = await drawBrandHeader(doc, opts);

  // หัวเรื่อง
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(opts.font.size.title);
  doc.text(title || "รายงาน", pageW / 2, (brandRes.usedHeight || opts.margin.top) + 4, { align: "center" });

  // ลายน้ำ (ถ้ามี)
  if (opts.watermark?.text) {
    drawWatermark(doc, opts.watermark.text, opts.watermark.angle ?? 30);
  }

  let cursorY = (brandRes.usedHeight || opts.margin.top) + 12;

  // วาด key:value 2 คอลัมน์
  const drawKeyValueTable = (bodyRows, local = {}) => {
    if (!Array.isArray(bodyRows) || bodyRows.length === 0) return cursorY;
    const usableW = pageW - opts.margin.left - opts.margin.right;
    const labelW = local.labelW ?? opts.metaWidth.label;
    autoTable(doc, {
      startY: cursorY,
      theme: local.theme || "plain",
      styles: { font: "Sarabun", fontSize: (opts.font.size.body - 1), cellPadding: 1.4, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: labelW, fontStyle: "bold" },
        1: { cellWidth: (local.tableW ?? usableW) - labelW },
      },
      body: bodyRows,
      margin: { left: local.left ?? opts.margin.left, right: opts.margin.right },
      tableWidth: local.tableW ?? usableW,
    });
    cursorY = doc.lastAutoTable.finalY + (local.gap ?? opts.gap.meta);
    return cursorY;
  };

  // ===== Meta (header/left/right) =====
  if (Array.isArray(meta)) {
    drawKeyValueTable(meta, { theme: "plain", gap: opts.gap.section });
  } else if (meta && typeof meta === "object") {
    const { headerBlock = [], leftBlock = [], rightBlock = [] } = meta;

    if (headerBlock.length) {
      drawKeyValueTable(headerBlock, { theme: "plain", gap: opts.gap.section });
    }

    const usableW = pageW - opts.margin.left - opts.margin.right;
    const leftW = usableW * (opts.twoCol.leftRatio ?? 0.55);
    const rightW = usableW - leftW;

    let leftY = cursorY;
    let rightY = cursorY;

    // หัวข้อซ้าย/ขวา (ตัวหนาเรียบ ๆ)
    if (meta?.sections?.leftTitle) {
      sectionLabel(doc, meta.sections.leftTitle, opts.margin.left, leftY + 2);
      leftY += 8;
    }
    if (meta?.sections?.rightTitle) {
      sectionLabel(doc, meta.sections.rightTitle, opts.margin.left + leftW, rightY + 2);
      rightY += 8;
    }

    if (leftBlock.length) {
      autoTable(doc, {
        startY: leftY,
        theme: "plain",
        styles: { font: "Sarabun", fontSize: (opts.font.size.body - 1), cellPadding: 1.4, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: opts.metaWidth.twoColLeft, fontStyle: "bold" },
          1: { cellWidth: leftW - opts.metaWidth.twoColLeft },
        },
        body: leftBlock,
        margin: { left: opts.margin.left, right: opts.margin.right },
        tableWidth: leftW,
      });
      leftY = doc.lastAutoTable.finalY;
    }

    if (rightBlock.length) {
      autoTable(doc, {
        startY: rightY,
        theme: "plain",
        styles: { font: "Sarabun", fontSize: (opts.font.size.body - 1), cellPadding: 1.4, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: opts.metaWidth.twoColRight, fontStyle: "bold" },
          1: { cellWidth: rightW - opts.metaWidth.twoColRight },
        },
        body: rightBlock,
        margin: { left: opts.margin.left + leftW, right: opts.margin.right },
        tableWidth: rightW,
      });
      rightY = doc.lastAutoTable.finalY;
    }

    cursorY = Math.max(leftY, rightY) + opts.gap.section;
  }

  // ===== ตารางรายการหลัก =====
  let columnStyles = { ...(opts.table.columnStyles || {}) };

  // รับความกว้างคอลัมน์จาก layout (mm)
  if (meta?.layout?.tableColWidths?.length) {
    meta.layout.tableColWidths.forEach((w, i) => {
      columnStyles[i] = { ...(columnStyles[i] || {}), cellWidth: w };
    });
  }

  // จัดชิดตามหัวคอลัมน์
  const rightCols = ["ราคาต่อหน่วย", "ส่วนลด", "รวม", "ราคา/หน่วย", "รวม/รายการ", "รวมทั้งสิ้น"];
  const centerCols = ["จำนวน", "หน่วย", "#", "ลำดับ", "รหัส"];
  (columns || []).forEach((h, i) => {
    const H = String(h || "");
    if (rightCols.some((k) => H.includes(k))) {
      columnStyles[i] = { ...(columnStyles[i] || {}), halign: "right" };
    } else if (centerCols.some((k) => H.includes(k))) {
      columnStyles[i] = { ...(columnStyles[i] || {}), halign: "center" };
    }
  });

  autoTable(doc, {
    startY: cursorY,
    theme: opts.table.headTheme,
    head: [columns],
    body: rows,
    styles: {
      font: "Sarabun",
      fontSize: opts.font.size.table,
      cellPadding: 2,
      overflow: opts.table.bodyOverflow,
      valign: opts.table.valign,
      lineColor: opts.colors.gridLine,
      lineWidth: opts.table.lineWidth,
    },
    headStyles: {
      font: "Sarabun",
      fontStyle: "bold",
      fillColor: opts.colors.headFill,
      textColor: opts.colors.headText,
      halign: "center",
    },
    alternateRowStyles: { fillColor: opts.colors.zebra },
    columnStyles,
    margin: { left: opts.margin.left, right: opts.margin.right, bottom: opts.margin.bottom },

    // footer text + page number (ไม่มีกรอบ)
    didDrawPage: (data) => {
      doc.setFont("Sarabun", "normal");
      doc.setFontSize(opts.font.size.footer);
      if (footerNote) doc.text(footerNote, opts.margin.left, opts.footer.y);
      if (opts.footer.showPageNumber) {
        const pageCount = doc.getNumberOfPages();
        doc.text(
          `หน้า ${data.pageNumber} / ${pageCount}`,
          doc.internal.pageSize.getWidth() - opts.margin.right,
          opts.footer.y,
          { align: "right" }
        );
      }
    },
  });

  cursorY = doc.lastAutoTable.finalY + opts.gap.section;

  // ===== Footer meta (เช่น เงื่อนไข) — ตัวเล็กลง + ไม่มีพื้นหลัง =====
  if (meta && typeof meta === "object" && Array.isArray(meta.footerBlock) && meta.footerBlock.length) {
    const pageH = doc.internal.pageSize.getHeight();
    const usableW = pageW - opts.margin.left - opts.margin.right;

    // 1 คอลัมน์ถ้ารายการ <= 4, ไม่งั้น 2 คอลัมน์ (override ได้ด้วย options.footerCols)
    const footerCols = typeof opts.footerCols === "number"
      ? Math.max(1, Math.min(2, opts.footerCols))
      : (meta.footerBlock.length <= 4 ? 1 : 2);

    const makeOneColRows = () => meta.footerBlock;
    const makeTwoColRows = () => {
      const rows = [];
      for (let i = 0; i < meta.footerBlock.length; i += 2) {
        const a = meta.footerBlock[i];
        const b = meta.footerBlock[i + 1] || ["", ""];
        rows.push([a?.[0] ?? "", a?.[1] ?? "", b?.[0] ?? "", b?.[1] ?? ""]);
      }
      return rows;
    };

    const bodyRows = footerCols === 1 ? makeOneColRows() : makeTwoColRows();

    // ประเมินพื้นที่ก่อนวาด (ลดค่าเฉลี่ยความสูงต่อแถวลงเล็กน้อย)
    const estRowH = 6.2;
    const need = 12 + bodyRows.length * estRowH + 8;
    const available = pageH - opts.margin.bottom - cursorY;
    if (available < need) {
      doc.addPage();
      cursorY = opts.margin.top;
    }

    // หัวข้อ (ตัวหนาเรียบ ๆ)
    const ftTitle = meta.sections?.footerTitle || "เงื่อนไข";
    sectionLabel(doc, ftTitle, opts.margin.left, cursorY + 6);
    cursorY += 12;

    if (footerCols === 1) {
      // 1 คอลัมน์: ฟอนต์เล็กลง + ไม่มีสีพื้นหลัง
      autoTable(doc, {
        startY: cursorY,
        theme: "plain",
        styles: { font: "Sarabun", fontSize: (opts.font.size.body - 1), cellPadding: 1.4, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: opts.metaWidth.footerLabel, fontStyle: "bold" },
          1: { cellWidth: usableW - opts.metaWidth.footerLabel },
        },
        body: bodyRows,
        margin: { left: opts.margin.left, right: opts.margin.right, bottom: opts.margin.bottom },
        rowPageBreak: "avoid",
        // ไม่มี alternateRowStyles → ไม่มีสีพื้นหลัง
      });
    } else {
      // 2 คอลัมน์: ลด label เป็น 34mm เพื่อเพิ่มพื้นที่ค่าด้านขวา; ไม่มีพื้นหลัง
      const labelW = 34;
      const valueW = (usableW - labelW * 2) / 2;
      autoTable(doc, {
        startY: cursorY,
        theme: "plain",
        styles: { font: "Sarabun", fontSize: (opts.font.size.body - 1), cellPadding: 1.4, overflow: "linebreak" },
        columnStyles: {
          0: { cellWidth: labelW, fontStyle: "bold" },
          1: { cellWidth: valueW },
          2: { cellWidth: labelW, fontStyle: "bold" },
          3: { cellWidth: valueW },
        },
        body: bodyRows,
        margin: { left: opts.margin.left, right: opts.margin.right, bottom: opts.margin.bottom },
        rowPageBreak: "avoid",
        // ไม่มี alternateRowStyles → ไม่มีสีพื้นหลัง
      });
    }

    cursorY = doc.lastAutoTable.finalY + 2;
  }

// ลายเซ็น (ถ้าต้องการ) — ไม่มีกรอบ
if (opts.signatures) {
  const pageH = doc.internal.pageSize.getHeight();
  if (pageH - opts.margin.bottom - cursorY < 40) {
    doc.addPage();
    cursorY = opts.margin.top;
  }
  drawSignatures(doc, opts, cursorY);
}

doc.save(filename);
}
