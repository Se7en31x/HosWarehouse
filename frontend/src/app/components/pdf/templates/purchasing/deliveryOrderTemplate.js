// src/app/components/pdf/templates/purchasing/deliveryOrderTemplate.js
import { exportCommercialDoc, DOC_TYPES } from "./commercialDocTemplate";

/**
 * ใบส่งของ/ใบแจ้งหนี้ (ภาพที่ 3)
 * ใช้คอลัมน์: qty, code, name, unitPrice, amount
 */
export function exportDeliveryOrderPDF({
  brand,
  parties,
  meta,        // { docNo, date, poNo, terms, priceType, dueDate }
  items,       // [{ qty, code, name, unitPrice, amount }]
  totals,      // { beforeVat, vatRate, vatAmount, grandTotal }
  remark = "",
  options = { paidStamp: true }, // ส่วนใหญ่ DO/Invoice จะมีตรา “จ่ายแล้ว”
  fileName = `delivery_order_${meta?.docNo || ""}.pdf`,
}) {
  return exportCommercialDoc({
    docType: DOC_TYPES.DELIVERY_ORDER,
    brand,
    parties,
    meta,
    items,
    totals,
    remark,
    signatures: [
      { label: "ผู้รับสินค้า / RECEIVER", width: 200 },
      { label: "ผู้ตรวจสอบ / CHECKED BY", width: 200 },
      { label: "ผู้มีอำนาจลงนาม / AUTHORIZED SIGNATURE", width: 240 },
    ],
    options,
    fileName,
  });
}
