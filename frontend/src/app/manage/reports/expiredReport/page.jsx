"use client";
import { useState, useEffect } from "react";
import { ClipboardX, FileDown, Search } from "lucide-react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { saveAs } from "file-saver";

export default function ExpiredReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ โหลดข้อมูลรายงานหมดอายุ
  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/report/expired");
      setData(res.data);
    } catch (err) {
      console.error("Error fetching expired report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // ✅ แปลประเภท
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

  // ✅ แปลงวันที่
  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // ✅ Export CSV
  const exportCSV = () => {
    if (!data.length) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `expired-report-${Date.now()}.csv`);
  };

  // ✅ Export PDF
  const exportPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("รายงานพัสดุหมดอายุ (Expired Report)", 14, 15);

    const tableData = data.map((item) => [
      item.item_name,
      translateCategory(item.category),
      item.lot_no,
      formatDate(item.exp_date),
      item.expired_qty,
      item.disposed_qty,
      item.remaining_qty,
      item.manage_status,
    ]);

    autoTable(doc, {
      head: [
        [
          "ชื่อพัสดุ",
          "ประเภท",
          "Lot No.",
          "วันหมดอายุ",
          "จำนวนหมดอายุ",
          "จำนวนที่จัดการแล้ว",
          "คงเหลือ",
          "สถานะ",
        ],
      ],
      body: tableData,
      startY: 25,
    });

    doc.save(`expired-report-${Date.now()}.pdf`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardX size={32} color="#dc2626" />
        <h1>รายงานพัสดุหมดอายุ</h1>
      </div>

      {/* Action Buttons */}
      <div className={styles.filterBar}>
        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          โหลดข้อมูล
        </button>
        <button className={styles.btnSecondary} onClick={exportPDF}>
          <FileDown size={16} style={{ marginRight: "6px" }} />
          PDF
        </button>
        <button className={styles.btnSecondary} onClick={exportCSV}>
          <FileDown size={16} style={{ marginRight: "6px" }} />
          CSV
        </button>
      </div>

      {/* Table */}
      <div className={styles.card}>
        {loading ? (
          <p>⏳ กำลังโหลดข้อมูล...</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ชื่อพัสดุ</th>
                <th>ประเภท</th>
                <th>Lot No.</th>
                <th>วันหมดอายุ</th>
                <th>จำนวนหมดอายุ</th>
                <th>จำนวนที่จัดการแล้ว</th>
                <th>คงเหลือ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.item_name}</td>
                    <td>{translateCategory(item.category)}</td>
                    <td>{item.lot_no}</td>
                    <td>{formatDate(item.exp_date)}</td>
                    <td style={{ color: "red", fontWeight: "600" }}>{item.expired_qty}</td>
                    <td>{item.disposed_qty}</td>
                    <td>{item.remaining_qty}</td>
                    <td>{item.manage_status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "1rem" }}>
                    ไม่พบข้อมูล
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
