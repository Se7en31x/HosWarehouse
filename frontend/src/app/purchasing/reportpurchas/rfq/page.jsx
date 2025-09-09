"use client";

import { useState, useEffect } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaSearch, FaFilter, FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function RFQReport() {
  const [rfqs, setRfqs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/rfq/report");
        setRfqs(res.data);
      } catch (err) {
        console.error("โหลดรายงาน RFQ ไม่สำเร็จ:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = rfqs.filter((rfq) => {
    const matchSearch = rfq.rfq_no
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const rfqDate = new Date(rfq.created_at);
    const matchDate =
      (!startDate || rfqDate >= new Date(startDate)) &&
      (!endDate || rfqDate <= new Date(endDate));
    return matchSearch && matchDate;
  });

  // ✅ Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("รายงานใบขอราคา (RFQ Report)", 14, 10);
    autoTable(doc, {
      head: [["RFQ No", "วันที่สร้าง", "ผู้สร้าง", "จำนวนสินค้า", "รวมจำนวน (Qty)", "สถานะ"]],
      body: filteredData.map((rfq) => [
        rfq.rfq_no,
        new Date(rfq.created_at).toLocaleDateString("th-TH"),
        `${rfq.firstname} ${rfq.lastname}`,
        rfq.item_count,
        rfq.total_qty,
        rfq.status,
      ]),
    });
    doc.save("rfq_report.pdf");
  };

  // ✅ Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filteredData.map((rfq) => ({
        "RFQ No": rfq.rfq_no,
        "วันที่สร้าง": new Date(rfq.created_at).toLocaleDateString("th-TH"),
        "ผู้สร้าง": `${rfq.firstname} ${rfq.lastname}`,
        "จำนวนสินค้า": rfq.item_count,
        "รวมจำนวน (Qty)": rfq.total_qty,
        "สถานะ": rfq.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RFQ Report");
    XLSX.writeFile(wb, "rfq_report.xlsx");
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            <FaFilePdf size={28} /> รายงานใบขอราคา (RFQ Report)
          </h1>
        </div>

        {/* ฟิลเตอร์ */}
        <div className={styles.filters}>
          <div className={styles.searchContainer}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ค้นหา RFQ No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.dateFilter}>
            <FaFilter className={styles.filterIcon} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.dateInput}
            />
            <span className={styles.dateSeparator}>ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <div className={styles.exportButtons}>
            <button
              className={`${styles.exportBtn} ${styles.pdf}`}
              onClick={exportPDF}
            >
              <FaFilePdf size={18} /> ส่งออก PDF
            </button>
            <button
              className={`${styles.exportBtn} ${styles.excel}`}
              onClick={exportExcel}
            >
              <FaFileExcel size={18} /> ส่งออก Excel
            </button>
          </div>
        </div>

        {/* ตาราง */}
        {loading ? (
          <div className={styles.loadingContainer}>⏳ กำลังโหลด...</div>
        ) : filteredData.length === 0 ? (
          <div className={styles.noDataMessage}>❌ ไม่พบข้อมูลใบขอราคา</div>
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div>RFQ No</div>
              <div>วันที่สร้าง</div>
              <div>ผู้สร้าง</div>
              <div className={styles.centerCell}>จำนวนสินค้า</div>
              <div className={styles.centerCell}>รวมจำนวน</div>
              <div>สถานะ</div>
            </div>
            {filteredData.map((rfq) => (
              <div
                key={rfq.rfq_id}
                className={`${styles.tableGrid} ${styles.tableRow}`}
              >
                <div className={styles.textWrap}>{rfq.rfq_no}</div>
                <div className={styles.textWrap}>
                  {new Date(rfq.created_at).toLocaleDateString("th-TH")}
                </div>
                <div className={styles.textWrap}>
                  {rfq.firstname} {rfq.lastname}
                </div>
                <div className={styles.centerCell}>{rfq.item_count}</div>
                <div className={styles.centerCell}>{rfq.total_qty}</div>
                <div className={styles.textWrap}>{rfq.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
