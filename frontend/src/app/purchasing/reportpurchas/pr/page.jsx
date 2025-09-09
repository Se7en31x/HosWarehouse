"use client";

import { useState, useEffect } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaSearch, FaFilter, FaFilePdf, FaFileExcel, FaCalendarAlt } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function PRReport() {
  const [prs, setPRs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthRange, setMonthRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async (range = "all", start = "", end = "") => {
    try {
      setLoading(true);
      const res = await purchasingAxios.get("/pr/report", {
        params: { monthRange: range, startDate: start, endDate: end },
      });
      setPRs(res.data);
    } catch (err) {
      console.error("❌ โหลดรายงาน PR ไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(monthRange, startDate, endDate);
  }, [monthRange, startDate, endDate]);

  const filteredData = prs.filter((pr) =>
    (pr.pr_no + " " + (pr.firstname || "") + " " + (pr.lastname || "") + " " + (pr.item_name || ""))
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("รายงานใบขอซื้อ (PR Report)", 14, 10);
    autoTable(doc, {
      head: [["PR No", "วันที่สร้าง", "ผู้ขอซื้อ", "สินค้า", "จำนวน", "หน่วย", "สถานะ"]],
      body: filteredData.map((pr) => [
        pr.pr_no,
        new Date(pr.created_at).toLocaleDateString("th-TH"),
        `${pr.firstname || ""} ${pr.lastname || ""}`,
        pr.item_name,
        pr.qty_requested,
        pr.unit,
        pr.status,
      ]),
    });
    doc.save("pr_report.pdf");
  };

  // ✅ Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredData.map((pr) => ({
        "PR No": pr.pr_no,
        "วันที่สร้าง": new Date(pr.created_at).toLocaleDateString("th-TH"),
        "ผู้ขอซื้อ": `${pr.firstname || ""} ${pr.lastname || ""}`,
        "สินค้า": pr.item_name,
        "จำนวน": pr.qty_requested,
        "หน่วย": pr.unit,
        "สถานะ": pr.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PR Report");
    XLSX.writeFile(wb, "pr_report.xlsx");
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>📑 รายงานใบขอซื้อ (PR Report)</h1>

        {/* 🔎 Filters */}
        <div className={styles.filters}>
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ค้นหา PR No / ผู้ขอซื้อ / สินค้า..."
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

        {/* 📊 Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div>PR No</div>
            <div>วันที่สร้าง</div>
            <div>ผู้ขอซื้อ</div>
            <div>สินค้า</div>
            <div className={styles.centerCell}>จำนวน</div>
            <div className={styles.centerCell}>หน่วย</div>
            <div>สถานะ</div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>⏳ กำลังโหลด...</div>
          ) : filteredData.length === 0 ? (
            <div className={`${styles.tableGrid} ${styles.tableRow}`}>
              <div
                className={styles.centerCell}
                style={{ gridColumn: "1 / -1", color: "#64748b", padding: "16px" }}
              >
                ❌ ไม่พบข้อมูลใบขอซื้อ
              </div>
            </div>
          ) : (
            filteredData.map((pr, idx) => (
              <div key={pr.pr_id + "-" + idx} className={`${styles.tableGrid} ${styles.tableRow}`}>
                <div className={styles.textWrap}>{pr.pr_no}</div>
                <div>{new Date(pr.created_at).toLocaleDateString("th-TH")}</div>
                <div>{`${pr.firstname || ""} ${pr.lastname || ""}`}</div>
                <div className={styles.textWrap}>{pr.item_name}</div>
                <div className={styles.centerCell}>{pr.qty_requested}</div>
                <div className={styles.centerCell}>{pr.unit}</div>
                <div className={styles.textWrap}>{pr.status}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
