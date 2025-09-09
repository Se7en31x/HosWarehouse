"use client";

import { useState, useEffect } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaSearch, FaFilter, FaFilePdf, FaFileExcel, FaCalendarAlt, FaTimes } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SupplierReport() {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [monthRange, setMonthRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async (range = "all", start = "", end = "") => {
    try {
      setLoading(true);
      console.log("📥 Fetching supplier report:", { range, start, end });

      const res = await purchasingAxios.get("/suppliers/report", {
        params: { monthRange: range, startDate: start, endDate: end },
      });

      setSuppliers(res.data);
    } catch (err) {
      console.error("❌ โหลดรายงาน Supplier ไม่สำเร็จ:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(monthRange, startDate, endDate);
  }, [monthRange, startDate, endDate]);

  const filteredData = suppliers.filter((s) =>
    (s.supplier_name + " " + (s.supplier_contact_name || ""))
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ✅ Reset Filters
  const resetFilters = () => {
    setSearchTerm("");
    setMonthRange("all");
    setStartDate("");
    setEndDate("");
  };

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("รายงานซัพพลายเออร์ (Supplier Report)", 14, 10);
    autoTable(doc, {
      head: [["ชื่อซัพพลายเออร์", "ผู้ติดต่อ", "เบอร์โทร", "Email", "PO Count", "ยอดรวม"]],
      body: filteredData.map((s) => [
        s.supplier_name,
        s.supplier_contact_name,
        s.supplier_phone,
        s.supplier_email,
        s.total_po,
        parseFloat(s.total_spent).toLocaleString("th-TH", { minimumFractionDigits: 2 }),
      ]),
    });
    doc.save("supplier_report.pdf");
  };

  // ✅ Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredData.map((s) => ({
        "ชื่อซัพพลายเออร์": s.supplier_name,
        "ผู้ติดต่อ": s.supplier_contact_name,
        "เบอร์โทร": s.supplier_phone,
        Email: s.supplier_email,
        "PO Count": s.total_po,
        ยอดรวม: parseFloat(s.total_spent).toLocaleString("th-TH", {
          minimumFractionDigits: 2,
        }),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Report");
    XLSX.writeFile(wb, "supplier_report.xlsx");
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>📊 รายงานซัพพลายเออร์ (Supplier Report)</h1>

        <div className={styles.filters}>
          {/* 🔎 ค้นหา */}
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ค้นหาซัพพลายเออร์ / ผู้ติดต่อ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>

          {/* 📅 เลือกช่วงเดือน */}
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
              <option value="9">9 เดือน</option>
              <option value="12">12 เดือน</option>
            </select>
          </div>

          {/* 📅 Custom Date */}
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

          {/* 📤 Export */}
          <div className={styles.exportButtons}>
            <button className={`${styles.exportBtn} ${styles.pdf}`} onClick={exportPDF}>
              <FaFilePdf size={18} /> PDF
            </button>
            <button className={`${styles.exportBtn} ${styles.excel}`} onClick={exportExcel}>
              <FaFileExcel size={18} /> Excel
            </button>
            <button className={`${styles.exportBtn} ${styles.reset}`} onClick={resetFilters}>
              <FaTimes size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* 📊 ตาราง */}
        {loading ? (
          <div className={styles.loadingContainer}>⏳ กำลังโหลด...</div>
        ) : filteredData.length === 0 ? (
          <div className={styles.noDataMessage}>❌ ไม่พบข้อมูลซัพพลายเออร์</div>
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div>ชื่อซัพพลายเออร์</div>
              <div>ผู้ติดต่อ</div>
              <div>เบอร์โทร</div>
              <div>Email</div>
              <div className={styles.centerCell}>PO Count</div>
              <div className={styles.centerCell}>ยอดรวม</div>
            </div>
            {filteredData.map((s) => (
              <div key={s.supplier_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                <div className={styles.textWrap}>{s.supplier_name}</div>
                <div className={styles.textWrap}>{s.supplier_contact_name}</div>
                <div>{s.supplier_phone}</div>
                <div>{s.supplier_email}</div>
                <div className={styles.centerCell}>{s.total_po}</div>
                <div className={styles.centerCell}>
                  {parseFloat(s.total_spent).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
