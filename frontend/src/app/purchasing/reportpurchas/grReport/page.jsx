"use client";

import { useState, useEffect } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaSearch, FaFilter, FaFilePdf, FaFileExcel, FaCalendarAlt } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ✅ ฟังก์ชันแปลสถานะ
const translateStatus = (status) => {
  switch (status) {
    case "pending":
      return "รอดำเนินการ";
    case "partial":
      return "รับบางส่วน";
    case "completed":
      return "เสร็จสิ้น";
    default:
      return status || "-";
  }
};

export default function GRReport() {
  const [grs, setGRs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthRange, setMonthRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async (range = "all", start = "", end = "") => {
    try {
      setLoading(true);
      const res = await purchasingAxios.get("/gr/report", {
        params: { monthRange: range, startDate: start, endDate: end },
      });
      setGRs(res.data);
    } catch (err) {
      console.error("❌ โหลดรายงาน GR ไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(monthRange, startDate, endDate);
  }, [monthRange, startDate, endDate]);

  const filteredData = grs.filter((gr) =>
    (gr.gr_no + " " + (gr.supplier_name || "") + " " + (gr.po_no || "") + " " + (gr.item_name || ""))
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("รายงานการรับสินค้า (GR Report)", 14, 10);
    autoTable(doc, {
      head: [["GR No", "วันที่รับ", "ซัพพลายเออร์", "PO No", "สินค้า", "สั่ง", "รับจริง", "สถานะ"]],
      body: filteredData.map((gr) => [
        gr.gr_no,
        new Date(gr.gr_date).toLocaleDateString("th-TH"),
        gr.supplier_name,
        gr.po_no,
        gr.item_name,
        gr.qty_ordered,
        gr.qty_received,
        translateStatus(gr.status),
      ]),
    });
    doc.save("gr_report.pdf");
  };

  // ✅ Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredData.map((gr) => ({
        "GR No": gr.gr_no,
        "วันที่รับ": new Date(gr.gr_date).toLocaleDateString("th-TH"),
        "ซัพพลายเออร์": gr.supplier_name,
        "PO No": gr.po_no,
        "สินค้า": gr.item_name,
        "จำนวนที่สั่ง": gr.qty_ordered,
        "จำนวนที่รับจริง": gr.qty_received,
        "สถานะ": translateStatus(gr.status),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GR Report");
    XLSX.writeFile(wb, "gr_report.xlsx");
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>🚚 รายงานการรับสินค้า (GR Report)</h1>

        {/* ฟิลเตอร์ */}
        <div className={styles.filters}>
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ค้นหา GR No / ซัพพลายเออร์ / PO No / สินค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.dateFilter}>
            <FaFilter className={styles.filterIcon} />
            <select
              value={monthRange}
              onChange={(e) => setMonthRange(e.target.value)}
              className={styles.dateInput}
            >
              <option value="all">ทั้งหมด</option>
              <option value="1">1 เดือน</option>
              <option value="3">3 เดือน</option>
              <option value="6">6 เดือน</option>
              <option value="12">12 เดือน</option>
            </select>
          </div>

          <div className={styles.dateFilter}>
            <FaCalendarAlt className={styles.filterIcon} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setMonthRange("custom");
              }}
              className={styles.dateInput}
            />
            <span className={styles.dateSeparator}>ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setMonthRange("custom");
              }}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.exportButtons}>
            <button className={`${styles.exportBtn} ${styles.pdf}`} onClick={exportPDF}>
              <FaFilePdf size={18} /> PDF
            </button>
            <button className={`${styles.exportBtn} ${styles.excel}`} onClick={exportExcel}>
              <FaFileExcel size={18} /> Excel
            </button>
          </div>
        </div>

        {/* ตาราง */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div>GR No</div>
            <div>วันที่รับ</div>
            <div>ซัพพลายเออร์</div>
            <div>PO No</div>
            <div>สินค้า</div>
            <div className={styles.centerCell}>สั่ง</div>
            <div className={styles.centerCell}>รับจริง</div>
            <div>สถานะ</div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>⏳ กำลังโหลด...</div>
          ) : filteredData.length === 0 ? (
            <div className={`${styles.tableGrid} ${styles.tableRow}`}>
              <div className={styles.emptyRow}>❌ ไม่พบข้อมูลการรับสินค้า</div>
            </div>
          ) : (
            filteredData.map((gr, idx) => (
              <div key={gr.gr_id + "-" + idx} className={`${styles.tableGrid} ${styles.tableRow}`}>
                <div className={styles.textWrap}>{gr.gr_no}</div>
                <div>{new Date(gr.gr_date).toLocaleDateString("th-TH")}</div>
                <div>{gr.supplier_name}</div>
                <div>{gr.po_no}</div>
                <div className={styles.textWrap}>{gr.item_name}</div>
                <div className={styles.centerCell}>{gr.qty_ordered}</div>
                <div className={styles.centerCell}>{gr.qty_received}</div>
                <div className={styles.textWrap}>{translateStatus(gr.status)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
