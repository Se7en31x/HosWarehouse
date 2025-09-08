// src/app/components/pdf/tableBlock.js
import autoTable from "jspdf-autotable";

export function drawTableBlock(doc, opts, cursorY, columns, rows) {
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

  return doc.lastAutoTable.finalY;
}
