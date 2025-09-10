// src/app/components/pdf/templates/purchasing/receiptTemplate.js
import { exportCommercialDoc, DOC_TYPES } from "./commercialDocTemplate";

/**
 * ใบเสร็จรับเงิน (ภาพที่ 1)
 * ใช้คอลัมน์: code, name, uom, qty, unitPrice, discount, amount
 */
export function exportReceiptPDF({
  brand,
  parties,
  meta,        // { docNo, date, poNo, terms, priceType, dueDate, ... }
  items,       // [{ code, name, uom, qty, unitPrice, discount, amount }]
  totals,      // { beforeVat, vatRate, vatAmount, grandTotal }
  remark = "ส่งของ จันทร์–เสาร์ เวลา 09.00–18.00 น.",
  options = {},
  fileName = `receipt_${meta?.docNo || ""}.pdf`,
}) {
  return exportCommercialDoc({
    docType: DOC_TYPES.RECEIPT,
    brand,
    parties,
    meta,
    items,
    totals,
    remark,
    signatures: [
      { label: "ผู้รับเงิน / RECEIVED BY", width: 220 },
      { label: "ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE", width: 260 },
    ],
    options,
    fileName,
  });
}
