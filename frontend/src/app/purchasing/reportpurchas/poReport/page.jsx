"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
    ClipboardCheck,
    FileDown,
    Search,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Calendar,
} from "lucide-react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { toast } from "react-toastify";
import styles from "./page.module.css";
import exportReportPO from "@/app/components/pdf/templates/reportpurchasing/reportPO";  // ✅ ใช้ template ที่รวม date filter
import { exportPOCSV } from "@/app/components/Csv/templates/poReportCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

/* =========================
   react-select custom styles
   ========================= */
const customSelectStyles = {
    control: (base, state) => ({
        ...base,
        borderRadius: "0.5rem",
        minHeight: "2.5rem",
        borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
        boxShadow: "none",
        "&:hover": { borderColor: "#2563eb" },
        width: "200px",
    }),
    menu: (base) => ({
        ...base,
        borderRadius: "0.5rem",
        marginTop: 6,
        boxShadow: "none",
        border: "1px solid #e5e7eb",
        zIndex: 9000,
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9000 }),
};

/* =========================
   Helpers
   ========================= */
const normalize = (s) => String(s ?? "").trim().toLowerCase();
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalISODate = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseDateSafe = (val) => {
    if (!val) return null;
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split("-").map((x) => parseInt(x, 10));
        return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    const d = new Date(val);
    return isNaN(d) ? null : d;
};

const formatDateTH = (val) => {
    const d = parseDateSafe(val);
    if (!d) return "-";
    return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
};

const pickFirst = (...vals) =>
    vals.find((v) => v !== undefined && v !== null && v !== "");

const getPOStatusRaw = (po) =>
    pickFirst(
        po?.po_status,
        po?.status,
        po?.status_text,
        po?.statusName,
        po?.state,
        po?.approval_status,
        po?.order_status
    );

const getPODateRaw = (po) =>
    pickFirst(
        po?.created_at,
        po?.po_date,
        po?.date,
        po?.createdAt,
        po?.createdDate,
        po?.issued_at,
        po?.document_date
    );

/* =========================
   Export PDF Wrapper
   ========================= */
const handleExportPDF = async (filteredData, filters, user) => {
    const columns = [
        "ลำดับ",
        "เลขที่ PO",
        "วันที่",
        "ซัพพลายเออร์",
        "รวม (ก่อน VAT)",
        "VAT",
        "ยอดสุทธิ",
        "สถานะ",
    ];

    const rows = filteredData.map((po, idx) => [
        idx + 1,
        po.po_no || "-",
        formatDateTH(getPODateRaw(po)),
        po.supplier_name || "-",
        Number(po.subtotal ?? 0).toLocaleString("th-TH"),
        Number(po.vat_amount ?? 0).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),
        Number(po.grand_total ?? 0).toLocaleString("th-TH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }),
        getPOStatusRaw(po) || "-",
    ]);

    await exportReportPO({
        data: filteredData,
        filters,
        user,
        filename: "report-po.pdf",
        title: "รายงานใบสั่งซื้อ (PO)",
        columns,
        rows,
    });
};

export default function ReportPO() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [statusFilter, setStatusFilter] = useState(null);
    const [dateRange, setDateRange] = useState(null);
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const [currentPage, setCurrentPage] = useState(1);

    const startDateRef = useRef(null);
    const endDateRef = useRef(null);

    const ITEMS_PER_PAGE = 12;

    const menuPortalTarget = useMemo(
        () => (typeof window !== "undefined" ? document.body : null),
        []
    );

    /* =========================
       Options
       ========================= */
    const statusOptions = [
        { value: "all", label: "ทั้งหมด" },
        { value: "pending", label: "รอดำเนินการ" },
        { value: "approved", label: "อนุมัติ" },
        { value: "completed", label: "เสร็จสิ้น" },
        { value: "canceled", label: "ยกเลิก" },
    ];

    const dateOptions = [
        { value: "all", label: "ทั้งหมด" },
        { value: "today", label: "วันนี้" },
        { value: "last1month", label: "1 เดือนที่ผ่านมา" },
        { value: "last3months", label: "3 เดือนที่ผ่านมา" },
        { value: "last6months", label: "6 เดือนที่ผ่านมา" },
        { value: "last9months", label: "9 เดือนที่ผ่านมา" },
        { value: "last12months", label: "12 เดือนที่ผ่านมา" },
        { value: "year", label: "ปีนี้" },
        { value: "custom", label: "กำหนดเอง" },
    ];

    /* =========================
       Date Handlers
       ========================= */
    const handleCustomStartChange = (e) => {
        const startDate = e.target.value;
        if (customEnd && startDate > customEnd) {
            toast.error("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
            return;
        }
        setCustomStart(startDate);
    };

    const handleCustomEndChange = (e) => {
        const endDate = e.target.value;
        if (customStart && endDate < customStart) {
            toast.error("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
            return;
        }
        setCustomEnd(endDate);
    };

    const openDatePicker = (ref) => {
        if (ref.current) {
            try {
                ref.current.showPicker?.();
            } catch {
                ref.current.focus();
            }
        }
    };

    /* =========================
       คำนวณช่วงวันที่
       ========================= */
    const getCurrentRange = useCallback(() => {
        const opt = dateRange?.value;
        if (!opt || opt === "all") return [null, null];

        const today = new Date();
        let start = null,
            end = null;

        if (opt === "today") {
            start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
            end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        } else if (opt === "year") {
            start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (opt?.startsWith("last")) {
            const months = parseInt(opt.replace("last", "").replace("months", "").replace("month", ""));
            const s = new Date(today);
            s.setMonth(s.getMonth() - months);
            start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
            end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        } else if (opt === "custom" && customStart && customEnd) {
            const s = new Date(customStart);
            const e = new Date(customEnd);
            if (s > e) return [null, null];
            start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0, 0);
            end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
        }

        return [start, end];
    }, [dateRange, customStart, customEnd]);

    /* =========================
       Fetch
       ========================= */
    const fetchReport = useCallback(async () => {
        try {
            setLoading(true);
            const res = await purchasingAxios.get("/po");
            setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
        } catch (err) {
            toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    /* =========================
       Filter & Sort
       ========================= */
    const filteredData = useMemo(() => {
        const [start, end] = getCurrentRange();
        return [...data].filter((po) => {
            if (statusFilter?.value && statusFilter.value !== "all") {
                const s = normalize(getPOStatusRaw(po));
                if (s !== statusFilter.value) return false;
            }
            if (start && end) {
                const d = parseDateSafe(getPODateRaw(po));
                if (!d || d < start || d > end) return false;
            }
            return true;
        });
    }, [data, statusFilter, getCurrentRange]);

    /* =========================
       Pagination
       ========================= */
    const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredData.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredData, currentPage]);

    const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

    const startDisplay = filteredData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
    const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredData.length);

    const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
    const goToNextPage = () =>
        currentPage * ITEMS_PER_PAGE < filteredData.length && setCurrentPage((c) => c + 1);

    const clearFilters = () => {
        setStatusFilter(null);
        setDateRange(null);
        setCustomStart("");
        setCustomEnd("");
        setCurrentPage(1);
    };

    /* =========================
       Render
       ========================= */
    return (
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <div className={styles.pageBar}>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.pageTitle}>
                            <ClipboardCheck size={28} />
                            รายงานใบสั่งซื้อ (PO)
                        </h1>
                    </div>
                    <div className={styles.searchCluster}>
                        <button
                            className={styles.btnSecondary}
                            onClick={() =>
                                handleExportPDF(filteredData, {
                                    dateValue: dateRange?.value,
                                    start: customStart,
                                    end: customEnd,
                                    statusLabel: statusFilter?.label,
                                })
                            }
                            disabled={loading}
                        >
                            <FileDown size={16} style={{ marginRight: "6px" }} /> PDF
                        </button>
                        <button
                            className={styles.btnSecondary}
                            onClick={() =>
                                exportPOCSV({ data: filteredData, filename: "report-po.csv" })
                            }
                            disabled={loading}
                        >
                            <FileDown size={16} style={{ marginRight: "6px" }} /> Excel
                        </button>
                    </div>
                </div>

                {/* ===== Toolbar ===== */}
                <div className={styles.toolbar}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <label className={styles.label}>สถานะ</label>
                            <DynamicSelect
                                options={statusOptions}
                                isClearable
                                isSearchable={false}
                                placeholder="เลือกสถานะ..."
                                styles={customSelectStyles}
                                value={statusFilter}
                                onChange={setStatusFilter}
                                menuPortalTarget={menuPortalTarget}
                            />
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.label}>ช่วงเวลา</label>
                            <DynamicSelect
                                options={dateOptions}
                                isClearable
                                isSearchable={false}
                                placeholder="เลือกช่วงเวลา..."
                                styles={customSelectStyles}
                                value={dateRange}
                                onChange={(option) => {
                                    setDateRange(option);
                                    if (!option || option.value !== "custom") {
                                        setCustomStart("");
                                        setCustomEnd("");
                                    }
                                }}
                                menuPortalTarget={menuPortalTarget}
                            />
                        </div>

                        {dateRange?.value === "custom" && (
                            <div className={styles.filterGroup}>
                                <label className={styles.label}>กำหนดวันที่</label>
                                <div className={styles.customDateBox}>
                                    <div className={styles.dateField}>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={handleCustomStartChange}
                                            className={styles.dateInput}
                                            ref={startDateRef}
                                        />
                                        <button
                                            className={styles.calendarButton}
                                            onClick={() => openDatePicker(startDateRef)}
                                            type="button"
                                        >
                                            <Calendar size={16} />
                                        </button>
                                    </div>
                                    <span className={styles.toLabel}>ถึง</span>
                                    <div className={styles.dateField}>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={handleCustomEndChange}
                                            className={styles.dateInput}
                                            ref={endDateRef}
                                        />
                                        <button
                                            className={styles.calendarButton}
                                            onClick={() => openDatePicker(endDateRef)}
                                            type="button"
                                        >
                                            <Calendar size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.searchCluster}>
                        <button className={styles.btnPrimary} onClick={fetchReport} disabled={loading}>
                            <Search size={16} style={{ marginRight: "6px" }} /> ค้นหา
                        </button>
                        <button
                            onClick={clearFilters}
                            className={`${styles.ghostBtn} ${styles.clearButton}`}
                            type="button"
                            disabled={loading}
                        >
                            <Trash2 size={18} /> ล้างตัวกรอง
                        </button>
                    </div>
                </div>

                {/* ===== Table + Pagination ===== */}
                {loading ? (
                    <div className={styles.loadingContainer} />
                ) : (
                    <div className={styles.tableSection}>
                        <div className={`${styles.tableGridPO} ${styles.tableHeader}`}>
                            <div className={styles.headerItem}>ลำดับ</div>
                            <div className={styles.headerItem}>เลขที่ PO</div>
                            <div className={styles.headerItem}>วันที่</div>
                            <div className={styles.headerItem}>ซัพพลายเออร์</div>
                            <div className={styles.headerItem}>รวม (ก่อน VAT)</div>
                            <div className={styles.headerItem}>VAT</div>
                            <div className={styles.headerItem}>ยอดสุทธิ</div>
                            <div className={styles.headerItem}>สถานะ</div>
                        </div>

                        <div className={styles.inventory} style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}>
                            {paginatedItems.length > 0 ? (
                                paginatedItems.map((po, index) => (
                                    <div key={po.po_id ?? `${po.po_no}-${index}`} className={`${styles.tableGridPO} ${styles.tableRow}`}>
                                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                        </div>
                                        <div className={styles.tableCell}>{po.po_no || "-"}</div>
                                        <div className={styles.tableCell}>{formatDateTH(getPODateRaw(po))}</div>
                                        <div className={styles.tableCell}>{po.supplier_name || "-"}</div>
                                        <div className={styles.tableCell}>
                                            {Number(po.subtotal ?? 0).toLocaleString("th-TH")} บาท
                                        </div>
                                        <div className={styles.tableCell}>
                                            {Number(po.vat_amount ?? 0).toLocaleString("th-TH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} บาท
                                        </div>
                                        <div className={styles.tableCell}>
                                            {Number(po.grand_total ?? 0).toLocaleString("th-TH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} บาท
                                        </div>
                                        <div className={styles.tableCell}>{getPOStatusRaw(po) || "-"}</div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
                            )}

                            {Array.from({ length: fillersCount }).map((_, i) => (
                                <div
                                    key={`filler-${i}`}
                                    className={`${styles.tableGridPO} ${styles.tableRow} ${styles.fillerRow}`}
                                    aria-hidden="true"
                                >
                                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                                    <div className={styles.tableCell}>&nbsp;</div>
                                    <div className={styles.tableCell}>&nbsp;</div>
                                    <div className={styles.tableCell}>&nbsp;</div>
                                    <div className={styles.tableCell}>&nbsp;</div>
                                    <div className={styles.tableCell}>&nbsp;</div>
                                    <div className={styles.tableCell}>&nbsp;</div>
                                    <div className={styles.tableCell}>&nbsp;</div>
                                </div>
                            ))}
                        </div>

                        {/* ===== Pagination ===== */}
                        <div className={styles.paginationBar}>
                            <div className={styles.paginationInfo}>
                                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredData.length} รายการ
                            </div>
                            <ul className={styles.paginationControls}>
                                <li>
                                    <button
                                        className={styles.pageButton}
                                        onClick={goToPreviousPage}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                </li>
                                {Array.from({ length: totalPages }).map((_, idx) => (
                                    <li key={`page-${idx + 1}`}>
                                        <button
                                            className={`${styles.pageButton} ${idx + 1 === currentPage ? styles.activePage : ""}`}
                                            onClick={() => setCurrentPage(idx + 1)}
                                        >
                                            {idx + 1}
                                        </button>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        className={styles.pageButton}
                                        onClick={goToNextPage}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
