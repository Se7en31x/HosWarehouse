export function drawMetaBlock(doc, opts, cursorY) {
  const pageW = doc.internal.pageSize.getWidth();

  // ✅ ใช้ชื่อรายงานที่ส่งมาจาก template
  const reportTitle = opts.title || "รายงาน";
  doc.setFont("Sarabun", "bold").setFontSize(opts.font.size.title);
  doc.text(reportTitle, pageW / 2, cursorY, { align: "center" });

  cursorY += 8;

  if (opts.meta?.range) {
    doc.setFont("Sarabun", "normal").setFontSize(11);
    doc.text(`ช่วงวันที่: ${opts.meta.range}`, pageW / 2, cursorY, { align: "center" });
    cursorY += 8;
  }

  if (opts.meta?.created) {
    const createdBy = opts.meta?.createdBy ? ` โดย: ${opts.meta.createdBy}` : "";
    doc.setFont("Sarabun", "normal").setFontSize(9);
    doc.text(`จัดทำเมื่อ: ${opts.meta.created}${createdBy}`, pageW / 2, cursorY, {
      align: "center",
    });
    cursorY += 6;
  }

  return cursorY + 4;
}
