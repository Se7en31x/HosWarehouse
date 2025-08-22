// src/app/components/pdf/templates/poTemplate.js
export default function poTemplate(po, formatDate) {
    const title = "ใบสั่งซื้อ (Purchase Order)";

    // ---- Helpers -------------------------------------------------
    const fdate = (v) => {
        if (!v) return "-";
        try {
            return typeof formatDate === "function"
                ? formatDate(v)
                : new Date(v).toLocaleString("th-TH");
        } catch { return "-"; }
    };
    const val = (v) => (v === 0 || v ? String(v) : "-");
    const num = (n) => (n == null || n === "" ? null : Number(n));
    const money = (n, fallback = "________") =>
        typeof n === "number" && isFinite(n)
            ? n.toLocaleString("th-TH", { minimumFractionDigits: 2 })
            : fallback;

    // ดึงรหัสจากชื่อฟิลด์ที่พบได้บ่อย ๆ ให้ชัวร์
    const getCode = (it = {}) => {
        const cand = [
            it.code, it.item_code, it.product_code, it.material_code, it.sku,
            it.ItemCode, it.materialCode, it.productCode,
            it.item?.code, it.product?.code, it.material?.code,
        ];
        for (const v of cand) {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
                return String(v);
            }
        }
        return "-";
    };

    // ---- ส่วนหัวหน่วยงาน ----------------------------------------
    const headerBlock = [
        ["หน่วยงาน/โรงพยาบาล", po?.hospital_name || "โรงพยาบาล"],
        ["ที่อยู่หน่วยงาน", po?.hospital_address || "-"],
        [
            "ติดต่อ",
            [
                po?.hospital_phone && `โทร: ${po.hospital_phone}`,
                po?.hospital_email && `อีเมล: ${po.hospital_email}`,
            ].filter(Boolean).join("  |  ") || "-",
        ],
    ];

    // ---- คอลัมน์ซ้าย: รายละเอียดเอกสาร -------------------------
    const leftBlock = [
        ["เลขที่ใบสั่งซื้อ (PO No.)", val(po?.po_no)],
        ["วันที่สั่งซื้อ", fdate(po?.po_date)],
        ["อ้างอิงใบขอซื้อ (PR)", po?.pr_no ? `${po.pr_no}` : "-"],
        ["อ้างอิงใบเสนอราคา (Quotation)", po?.quotation_no ? `${po.quotation_no}` : "-"],
        ["ผู้ร้องขอ/แผนก", val(po?.requester_dept || po?.requester)],
        ["ผู้จัดทำ", val(po?.created_by_name)],
        ["สถานะ", val(po?.status)],
    ];

    // ---- คอลัมน์ขวา: ข้อมูลผู้ขาย -------------------------------
    const rightBlock = [
        ["ชื่อผู้ขาย", val(po?.supplier_name)],
        ["ผู้ติดต่อ", val(po?.supplier_contact)],
        ["โทรศัพท์/อีเมล", [po?.supplier_phone, po?.supplier_email].filter(Boolean).join("  |  ") || "-"],
        ["ที่อยู่ผู้ขาย", val(po?.supplier_address)],
        ["เลขผู้เสียภาษี (Tax ID)", val(po?.supplier_taxid)],
    ];

    // ---- ตารางรายการ (ให้เหมือนหน้าใบสั่งซื้อ) ----------------
    const columns = [
        "#",
        "รหัส",
        "ชื่อพัสดุ",
        "หน่วย",
        "จำนวน",
        "ราคา/หน่วย",
        "ส่วนลด",
        "รวม/รายการ",
    ];

    let subTotal = 0;
    const currency = po?.currency || "THB";
    
    const rows = (po?.items || []).map((it, idx) => {
        const qty = num(it.qty) ?? 0;
        const unitPrice = num(it.unit_price ?? it.price ?? it.quoted_unit_price);
        const discount = num(it.discount) ?? 0;

        const code =
            it.code ?? it.item_code ?? it.product_code ?? it.material_code ?? it.sku ??
            it.item?.code ?? it.product?.code ?? it.material?.code ?? "-";

        const name = it.item_name || it.name || it.description || "-";

        const lineTotal = unitPrice != null ? Math.max(0, qty * unitPrice - discount) : null;
        if (typeof lineTotal === "number") subTotal += lineTotal;

        return [
            idx + 1,
            code,
            name,
            it.unit || "-",
            it.qty ?? "-",
            unitPrice != null ? money(unitPrice) : "________",
            discount ? money(discount) : (discount === 0 ? money(0) : "________"),
            lineTotal != null ? money(lineTotal) : "________",
        ];
    });

    // ✅ ฟิกขั้นต่ำ "3 แถว" สำหรับพื้นที่รายการ
    const MIN_ITEM_ROWS = 3;
    for (let i = rows.length; i < MIN_ITEM_ROWS; i++) {
        rows.push(["", "", "", "", "", "", "", ""]); // เติมแถวว่างให้ครบ 3
    }

    // ---- สรุปยอดท้ายตาราง ---------------------------------------
    const shipping = num(po?.shipping_fee) ?? 0;
    const vatRate = po?.vat_exempt ? 0 : (num(po?.vat_rate) ?? 7);
    const baseForVat = subTotal + shipping;
    const vatAmount = baseForVat * (vatRate / 100);
    const grandTotal = baseForVat + vatAmount;

    if (rows.length) rows.push(["", "", "", "", "", "", "", ""]);
    rows.push(["", "", "", "", "", "รวมย่อย", money(subTotal), ""]);
    if (shipping) rows.push(["", "", "", "", "", "ค่าขนส่ง", money(shipping), ""]);
    rows.push(["", "", "", "", "", `VAT ${vatRate}%`, money(vatAmount), ""]);
    rows.push(["", "", "", "", "", `รวมทั้งสิ้น (${currency})`, money(grandTotal), ""]);

    // ---- layout: คอลัมน์ตัวเลขคงที่, ให้ "ชื่อพัสดุ" ปรับตามพื้นที่ ----
    const layout = {
        twoColRatio: [60, 40],
        tableColWidths: [8, 24, "wrap", 14, 16, 22, 16, 24],
    };

    // ---- เงื่อนไข ------------------------------------------------
    const footerBlock = [
        ["สถานที่ส่งมอบ", val(po?.delivery_place)],
        ["กำหนดส่งมอบ", fdate(po?.delivery_date)],
        ["เงื่อนไขการชำระเงิน", val(po?.payment_terms)],
        ["VAT/สกุลเงิน", [(po?.vat_included ? "รวม VAT" : "ไม่รวม VAT"), currency].join("\n")],
        ["ใบรับสินค้า/ผู้รับ", val(po?.receiver_name || po?.receiver_dept)],
        ["หมายเหตุ", val(po?.note)],
    ];

    return {
        title,
        meta: {
            headerBlock,
            leftBlock,
            rightBlock,
            footerBlock,
            layout,
            sections: {
                leftTitle: "รายละเอียดใบสั่งซื้อ",
                rightTitle: "ข้อมูลผู้ขาย",
                footerTitle: "เงื่อนไข",
            },
        },
        columns,
        rows,
        filename: `${po?.po_no || "PO"}.pdf`,
    };
}
