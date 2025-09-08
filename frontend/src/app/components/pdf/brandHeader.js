// src/app/components/pdf/brandHeader.js
export async function drawBrandHeader(doc, opts) {
  const brand = opts.brand;
  if (!brand) return { usedHeight: 0 };

  const pageW = doc.internal.pageSize.getWidth();
  const left = opts.margin?.left ?? 12;
  const right = opts.margin?.right ?? 12;

  const topY = opts.margin?.top ?? 22;
  let cursorY = topY;

  // 🏥 ชื่อโรงพยาบาล
  doc.setFont("Sarabun", "bold");
  doc.setFontSize(14);
  doc.text(brand.name || "โรงพยาบาล", pageW / 2, cursorY, { align: "center" });
  cursorY += 6;

  // แผนก
  if (brand.department) {
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(11);
    doc.text(brand.department, pageW / 2, cursorY, { align: "center" });
    cursorY += 5;
  }

  // ที่อยู่
  if (brand.address) {
    doc.setFont("Sarabun", "normal");
    doc.setFontSize(10);
    doc.text(brand.address, pageW / 2, cursorY, { align: "center" });
    cursorY += 5;
  }

  // เส้นคั่น
  cursorY += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(left, cursorY, pageW - right, cursorY);

  return { usedHeight: cursorY + 4 };
}
