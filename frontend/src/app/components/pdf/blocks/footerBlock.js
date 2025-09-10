// src/app/components/pdf/footerBlock.js
export function drawFooterBlock(doc, opts) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Sarabun", "normal").setFontSize(opts.font.size.footer);

    // ข้อความความลับ
    doc.text("เอกสารมีข้อมูลส่วนบุคคล โปรดรักษาความลับ", opts.margin.left, opts.footer.y);

    // หมายเลขหน้า
    doc.text(`หน้า ${i} / ${pageCount}`, pageW - opts.margin.right, opts.footer.y, { align: "right" });
  }
}
