// src/app/components/pdf/templates/damagedTemplate.js
import exportPDF from "../PDFExporter";

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

const translateCategory = (cat) => {
    const map = {
        general: "ของใช้ทั่วไป",
        medsup: "เวชภัณฑ์",
        equipment: "ครุภัณฑ์",
        meddevice: "อุปกรณ์การแพทย์",
        medicine: "ยา",
    };
    return map[cat] || cat || "-";
};

const translateDamageType = (type) => {
    const map = { damaged: "ชำรุด", lost: "สูญหาย" };
    return map[type] || "-";
};

const translateManageStatus = (status) => {
    const map = {
        unmanaged: "ยังไม่จัดการ",
        managed: "จัดการแล้ว",
        partially_managed: "จัดการบางส่วน",
    };
    return map[status] || "-";
};

const mapDateRangeLabel = (value, start, end) => {
    const today = new Date();

    let rangeStart, rangeEnd;

    switch (value) {
        case "today":
            rangeStart = today;
            rangeEnd = today;
            break;
        case "year":
            rangeStart = new Date(today.getFullYear(), 0, 1);
            rangeEnd = new Date(today.getFullYear(), 11, 31);
            break;
        case "last1month":
            rangeStart = new Date(today);
            rangeStart.setMonth(today.getMonth() - 1);
            rangeEnd = today;
            break;
        case "last3months":
            rangeStart = new Date(today);
            rangeStart.setMonth(today.getMonth() - 3);
            rangeEnd = today;
            break;
        case "last6months":
            rangeStart = new Date(today);
            rangeStart.setMonth(today.getMonth() - 6);
            rangeEnd = today;
            break;
        case "last9months":
            rangeStart = new Date(today);
            rangeStart.setMonth(today.getMonth() - 9);
            rangeEnd = today;
            break;
        case "last12months":
            rangeStart = new Date(today);
            rangeStart.setMonth(today.getMonth() - 12);
            rangeEnd = today;
            break;
        case "custom":
            if (start && end) {
                rangeStart = new Date(start);
                rangeEnd = new Date(end);
            }
            break;
        default:
            return "ทั้งหมด";
    }

    if (rangeStart && rangeEnd) {
        const startLabel = rangeStart.toLocaleDateString("th-TH", { dateStyle: "long" });
        const endLabel = rangeEnd.toLocaleDateString("th-TH", { dateStyle: "long" });
        return `${startLabel} - ${endLabel}`;
    }

    return "ทั้งหมด";
};


export async function exportDamagedPDF({ data = [], filters = {}, user }) {
    const fullName = user ? `${user.user_fname} ${user.user_lname}` : "ไม่ระบุ";

    // ✅ ใช้ฟังก์ชันใหม่
    const dateLabel = mapDateRangeLabel(filters.dateValue, filters.start, filters.end);

    const meta = [
        [
            "วันที่ออกรายงาน",
            new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
            "ประเภทพัสดุ",
            filters.categoryLabel || "ทั้งหมด",
        ],
        ["ประเภทความเสียหาย", filters.damageTypeLabel || "ทั้งหมด", "สถานะ", filters.statusLabel || "ทั้งหมด"],
        ["ช่วงเวลา", dateLabel, "ผู้จัดทำรายงาน", fullName],
    ];

    /* ---- Table Columns ---- */
    const columns = [
        "ลำดับ",
        "ชื่อพัสดุ",
        "รหัสพัสดุ",
        "ประเภท",
        "Lot No.",
        "วันรายงาน",
        "ผู้รายงาน",
        "ประเภทความเสียหาย",
        "จำนวน",
        "จัดการแล้ว",
        "คงเหลือ",
        "สถานะ",
    ];

    /* ---- Table Rows ---- */
    const rows = data.map((item, idx) => [
        idx + 1,
        item.item_name,
        item.item_code,
        translateCategory(item.category),
        item.lot_no,
        formatDate(item.damaged_date),
        item.reported_by,
        translateDamageType(item.damage_type),
        (parseInt(item.damaged_qty, 10) || 0).toLocaleString("th-TH"),
        (parseInt(item.managed_qty, 10) || 0).toLocaleString("th-TH"),
        (parseInt(item.remaining_qty, 10) || 0).toLocaleString("th-TH"),
        translateManageStatus(item.manage_status),
    ]);

    /* ---- Export PDF ---- */
    await exportPDF({
        filename: "damaged-report.pdf",
        title: "รายงานพัสดุชำรุด/เสียหาย",
        meta: {
            range: dateLabel,
            category: filters.categoryLabel || "ทั้งหมด",
            damageType: filters.damageTypeLabel || "ทั้งหมด",
            status: filters.statusLabel || "ทั้งหมด",
            created: new Date().toLocaleDateString("th-TH", { dateStyle: "long" }),
            createdBy: fullName,
        },
        columns,
        rows,
        footerNote: "รายงานนี้จัดทำขึ้นเพื่อการตรวจสอบพัสดุชำรุด/สูญหาย",
        options: {
            page: { orientation: "landscape" }, // ✅ แค่ใส่ตรงนี้
            brand: {
                name: "โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม",
                address: "553 11 ตำบล บ้านดู่ อำเภอเมืองเชียงราย เชียงราย 57100",
                logo: "/logos/logo.png",  // ✅ ใช้ path แบบนี้
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
