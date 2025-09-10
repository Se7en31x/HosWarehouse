// src/app/components/pdf/templates/historyPurchasingTemplate.js
import exportPDF from "../PDFExporter";

/* ---------- helpers ---------- */
const fmtDateTH = (d) => {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
};

const fmt2 = (n) =>
  Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toThaiStatus = (status = "") => {
  const s = String(status).toLowerCase();
  if (s === "pending") return "รอดำเนินการ";
  if (s === "approved") return "อนุมัติ";
  if (s === "completed") return "เสร็จสิ้น";
  if (s === "canceled" || s === "cancelled") return "ยกเลิก";
  return status || "-";
};

/* แปลง label ของช่วงเวลา (สอดคล้องกับหน้า History: today, 7d, thismonth, custom) */
const mapDateRangeLabel = (value, start, end) => {
  const today = new Date();
  let s, e;

  switch (value) {
    case "today":
      s = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      e = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      break;
    case "7d":
      e = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      s = new Date(e);
      s.setDate(e.getDate() - 6);
      break;
    case "thismonth": {
      const y = today.getFullYear();
      const m = today.getMonth();
      s = new Date(y, m, 1);
      e = new Date(y, m + 1, 0);
      break;
    }
    case "custom":
      if (start && end) {
        s = new Date(start);
        e = new Date(end);
      }
      break;
    default:
      return "ทั้งหมด";
  }

  if (s && e) {
    const a = s.toLocaleDateString("th-TH", { dateStyle: "long" });
    const b = e.toLocaleDateString("th-TH", { dateStyle: "long" });
    return `${a} - ${b}`;
  }
  return "ทั้งหมด";
};

/* ---------- main ---------- */
export async function exportHistoryPurchasingPDF({ data = [], filters = {}, user }) {
  const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";
  const dateLabel = mapDateRangeLabel(filters.quick, filters.startDate, filters.endDate);

  /* คอลัมน์รายงาน */
  const columns = [
    "เลขที่ PO",
    "วันที่",
    "ซัพพลายเออร์",
    "สถานะ",
    "ผู้ใช้ที่ออก",
    "รวมก่อน VAT",
    "VAT",
    "ยอดสุทธิ",
  ];

  /* แถวข้อมูล (ลำดับให้ตรงกับ columns) */
  const rows = data.map((po) => [
    po.po_no || "-",
    fmtDateTH(po.created_at),
    po.supplier_name || "-",
    toThaiStatus(po.po_status || po.status),
    po.creator_name || "ไม่ทราบ",
    fmt2(po.subtotal),
    fmt2(po.vat_amount),
    fmt2(po.grand_total),
  ]);

  /* รวมยอดท้ายตาราง */
  const tSub = data.reduce((s, i) => s + Number(i?.subtotal || 0), 0);
  const tVat = data.reduce((s, i) => s + Number(i?.vat_amount || 0), 0);
  const tGrand = data.reduce((s, i) => s + Number(i?.grand_total || 0), 0);

  rows.push([
    { content: "รวมทั้งหมด", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
    fmt2(tSub),
    fmt2(tVat),
    fmt2(tGrand),
  ]);

  /* เรียก Exporter กลาง */
  await exportPDF({
    filename: "purchase-history.pdf",
    title: "รายงานประวัติการสั่งซื้อ",
    meta: {
      range: dateLabel,
      created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
      createdBy: fullName,
      search: filters.searchTerm || "-",
    },
    columns,
    rows,
    footerNote: "เอกสารจัดซื้อ – Purchasing Department",
    options: {
      page: { orientation: "landscape" },

      /* ฟิกข้อมูลแบรนด์ */
      brand: {
        name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
        address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
        tel: "093-2804948",
        logo: "/logos/logo.png",
      },

      /* ลายเซ็น (หากเอนจินรองรับ) */
      signatures: {
        roles: ["ผู้จัดทำ", "หัวหน้าแผนก", "ผู้อำนวยการ"],
        names: [fullName, "", ""],
      },

      /* โทนสีและเส้น: หัวตารางพื้นขาว-ตัวดำ / เส้นเท่ากันทั้งหัวและตัว */
      colors: {
        headFill: [255, 255, 255],
        headText: [0, 0, 0],
        gridLine: [0, 0, 0],
        zebra: [255, 255, 255],
      },
      tableStyles: { lineWidth: 0.6, lineColor: [0, 0, 0] },
      headStyles: { lineWidth: 0.6, lineColor: [0, 0, 0], fontStyle: "bold" },
      bodyStyles: { lineWidth: 0.6, lineColor: [0, 0, 0] },

      /* จัดแนวคอลัมน์: ตัวเลขขวา, วันที่/สถานะ/การจัดการกลาง, ผู้ใช้ที่ออกชิดซ้าย */
      columnStyles: {
        0: { halign: "left" },    // PO
        1: { halign: "center" },  // วันที่
        2: { halign: "left" },    // ซัพพลายเออร์
        3: { halign: "center" },  // สถานะ
        4: { halign: "left" },    // ผู้ใช้ที่ออก
        5: { halign: "right" },   // Subtotal
        6: { halign: "right" },   // VAT
        7: { halign: "right" },   // Total
      },

      styles: { overflow: "linebreak" },
    },
  });
}
