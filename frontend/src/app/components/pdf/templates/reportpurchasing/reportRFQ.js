"use client";
import exportPDF from "@/app/components/pdf/PDFExporter";

/* format date */
const formatDate = (iso) => {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleDateString("th-TH", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
    } catch {
        return "-";
    }
};

/* date range label */
const mapDateRangeLabel = (value, start, end) => {
    const today = new Date();
    let rangeStart, rangeEnd;

    switch (value) {
        case "today": rangeStart = today; rangeEnd = today; break;
        case "year": rangeStart = new Date(today.getFullYear(), 0, 1); rangeEnd = new Date(today.getFullYear(), 11, 31); break;
        case "last1month": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 1); rangeEnd = today; break;
        case "last3months": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 3); rangeEnd = today; break;
        case "last6months": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 6); rangeEnd = today; break;
        case "last12months": rangeStart = new Date(today); rangeStart.setMonth(today.getMonth() - 12); rangeEnd = today; break;
        case "custom": if (start && end) { rangeStart = new Date(start); rangeEnd = new Date(end); } break;
        default: return "ทั้งหมด";
    }

    if (rangeStart && rangeEnd) {
        const startLabel = rangeStart.toLocaleDateString("th-TH", { dateStyle: "long" });
        const endLabel = rangeEnd.toLocaleDateString("th-TH", { dateStyle: "long" });
        return `${startLabel} - ${endLabel}`;
    }
    return "ทั้งหมด";
};

/* Export RFQ PDF */
export default async function exportRFQPDF({
    data = [],
    filters = {},
    user,
    filename = "report-rfq.pdf",
    title = "รายงานใบขอราคา (RFQ)",
}) {
    const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";
    const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

    /* meta */
    const meta = [
        ["วันที่ออกรายงาน", new Date().toLocaleDateString("th-TH", { dateStyle: "long" }), "สถานะ", filters.statusLabel || "ทั้งหมด"],
        ["ช่วงเวลา", dateLabel, "ผู้จัดทำรายงาน", fullName],
    ];

    /* columns → ให้ตรงกับ table JSX */
    const columns = ["ลำดับ", "RFQ No", "วันที่สร้าง", "ผู้สร้าง", "จำนวนสินค้า", "รวมจำนวน (Qty)", "สถานะ"];

    /* rows */
    const rows = data.map((rfq, idx) => [
        idx + 1,
        rfq.rfq_no || "-",
        formatDate(rfq.created_at),
        `${rfq.firstname || "-"} ${rfq.lastname || "-"}`,
        rfq.item_count || 0,
        rfq.total_qty || 0,
        rfq.status || "-",
    ]);

    /* export */
    await exportPDF({
        filename,
        title,
        meta: {
            range: dateLabel,
            status: filters.statusLabel || "ทั้งหมด",
            created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
            createdBy: fullName,
        },
        columns,
        rows,
        footerNote: "รายงานนี้จัดทำขึ้นจากระบบ HosWarehouse",
        options: {
            page: { orientation: "landscape" },
            brand: {
                name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
                address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
                logo: "/logos/logo.png",
            },
            signatures: {
                roles: ["ผู้จัดทำ", "หัวหน้าแผนก", "ผู้อำนวยการ"],
                names: [fullName, "", ""],
            },
            colors: {
                headFill: [255, 255, 255],
                headText: [0, 0, 0],
                gridLine: [0, 0, 0],
                zebra: [255, 255, 255],
            },
        },
    });
}
