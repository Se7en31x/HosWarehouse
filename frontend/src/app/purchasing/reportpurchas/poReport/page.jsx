"use client";

import { useState, useEffect, useMemo } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaSearch, FaFilter, FaFileExcel, FaFilePdf } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const statusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "pending", label: "รอดำเนินการ" },
    { value: "approved", label: "อนุมัติ" },
    { value: "completed", label: "เสร็จสิ้น" },
    { value: "canceled", label: "ยกเลิก" },
];

export default function ReportPO() {
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await purchasingAxios.get("/po");
                setData(res.data);
            } catch (err) {
                console.error("Error loading PO report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // ✅ ฟิลเตอร์ข้อมูล
    const filtered = useMemo(() => {
        return data.filter((po) => {
            const matchSearch =
                po.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchStatus =
                statusFilter === "all" ||
                po.po_status?.toLowerCase() === statusFilter.toLowerCase();

            const poDate = new Date(po.created_at);
            const matchDate =
                (!startDate || poDate >= new Date(startDate)) &&
                (!endDate || poDate <= new Date(endDate));

            return matchSearch && matchStatus && matchDate;
        });
    }, [data, searchTerm, statusFilter, startDate, endDate]);

    // ✅ สรุปยอดรวม
    const summary = useMemo(() => {
        const totalPOs = filtered.length;
        const subtotalSum = filtered.reduce((sum, po) => sum + Number(po.subtotal || 0), 0);
        const vatSum = filtered.reduce((sum, po) => sum + Number(po.vat_amount || 0), 0);
        const grandTotalSum = filtered.reduce((sum, po) => sum + Number(po.grand_total || 0), 0);

        return { totalPOs, subtotalSum, vatSum, grandTotalSum };
    }, [filtered]);

    // ✅ Export Excel
    const exportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(
            filtered.map((po) => ({
                "เลขที่ PO": po.po_no,
                "วันที่": new Date(po.created_at).toLocaleDateString("th-TH"),
                "ซัพพลายเออร์": po.supplier_name,
                "รวม (ก่อน VAT)": po.subtotal,
                "VAT": po.vat_amount,
                "ยอดสุทธิ": po.grand_total,
                "สถานะ": po.po_status,
            }))
        );
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PO Report");
        XLSX.writeFile(wb, "report-po.xlsx");
    };

    // ✅ Export PDF
    const exportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text("รายงานใบสั่งซื้อ (PO)", 14, 16);

        autoTable(doc, {
            startY: 22,
            head: [["เลขที่ PO", "วันที่", "ซัพพลายเออร์", "รวม", "VAT", "ยอดสุทธิ", "สถานะ"]],
            body: filtered.map((po) => [
                po.po_no,
                new Date(po.created_at).toLocaleDateString("th-TH"),
                po.supplier_name,
                Number(po.subtotal).toLocaleString(),
                Number(po.vat_amount).toFixed(2),
                Number(po.grand_total).toFixed(2),
                po.po_status,
            ]),
        });

        doc.save("report-po.pdf");
    };

    return (
        <div className={styles.mainHome}>
            <div className={styles.pageBar}>
                <h1 className={styles.pageTitle}>📊 รายงานใบสั่งซื้อ (PO)</h1>

                <div className={styles.filters}>
                    <div className={styles.searchBar}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="ค้นหา: PO No หรือ ซัพพลายเออร์..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={styles.input}
                    >
                        {statusOptions.map((s) => (
                            <option key={s.value} value={s.value}>
                                {s.label}
                            </option>
                        ))}
                    </select>

                    <div className={styles.dateFilter}>
                        <FaFilter className={styles.filterIcon} />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={styles.input}
                        />
                        <span className={styles.dateSeparator}>ถึง</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    {/* ✅ ปุ่ม Export */}
                    <button onClick={exportExcel} className={styles.exportBtn}>
                        <FaFileExcel /> Excel
                    </button>
                    <button onClick={exportPDF} className={styles.exportBtn}>
                        <FaFilePdf /> PDF
                    </button>
                </div>
            </div>

            {/* ✅ สรุปยอดรวม */}
            <div className={styles.summaryBox}>
                <p>จำนวน PO: <strong>{summary.totalPOs}</strong> รายการ</p>
                <p>รวม (ก่อน VAT): <strong>{summary.subtotalSum.toLocaleString()} บาท</strong></p>
                <p>VAT รวม: <strong>{summary.vatSum.toLocaleString()} บาท</strong></p>
                <p>ยอดสุทธิรวม: <strong>{summary.grandTotalSum.toLocaleString()} บาท</strong></p>
            </div>

            {loading ? (
                <div className={styles.loadingContainer}>⏳ กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบข้อมูลตามเงื่อนไข</div>
            ) : (
                <div className={styles.tableSection}>
                    <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                        <div>เลขที่ PO</div>
                        <div>วันที่</div>
                        <div>ซัพพลายเออร์</div>
                        <div>รวม (ก่อน VAT)</div>
                        <div>VAT</div>
                        <div>ยอดสุทธิ</div>
                        <div>สถานะ</div>
                    </div>
                    {filtered.map((po) => (
                        <div key={po.po_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                            <div>{po.po_no}</div>
                            <div>{new Date(po.created_at).toLocaleDateString("th-TH")}</div>
                            <div>{po.supplier_name}</div>
                            <div>{Number(po.subtotal).toLocaleString()} บาท</div>
                            <div>{Number(po.vat_amount).toFixed(2)} บาท</div>
                            <div>{Number(po.grand_total).toFixed(2)} บาท</div>
                            <div>{po.po_status}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
