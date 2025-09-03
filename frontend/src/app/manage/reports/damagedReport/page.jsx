"use client";
import { useState, useEffect } from "react";
import { Wrench, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { saveAs } from "file-saver";

export default function DamagedReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ โหลดข้อมูลรายงานพัสดุชำรุด
  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await manageAxios.get("/report/damaged");
      setData(res.data);
    } catch (err) {
      console.error("Error fetching damaged report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // ✅ แปลประเภทหมวดหมู่
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

  // ✅ แปลประเภทความเสียหาย
  const translateDamageType = (type) => {
    const map = {
      damaged: "ชำรุด",
      lost: "สูญหาย",
    };
    return map[type] || type || "-";
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

  // ✅ กำหนดสีสถานะ
  const renderStatus = (status) => {
    if (status === "ยังไม่จัดการ")
      return <span style={{ color: "red", fontWeight: "600" }}>{status}</span>;
    if (status === "จัดการบางส่วน")
      return <span style={{ color: "orange", fontWeight: "600" }}>{status}</span>;
    if (status === "จัดการครบแล้ว")
      return <span style={{ color: "green", fontWeight: "600" }}>{status}</span>;
    return status;
  };

  // ✅ Export CSV
  const exportCSV = () => {
    if (!data.length) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `damaged-report-${Date.now()}.csv`);
  };

  // ✅ Export PDF
  const exportPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("รายงานพัสดุชำรุด/เสียหาย (Damaged Report)", 14, 15);

    const tableData = data.map((item) => [
      item.item_name,
      translateCategory(item.category),
      item.lot_no,
      item.damaged_qty,
      formatDate(item.damaged_date),
      translateDamageType(item.damage_type),
      item.damaged_note || "-",
      item.reported_by,
      item.managed_qty,
      item.remaining_qty,
      item.manage_status,
    ]);

    autoTable(doc, {
      head: [
        [
          "ชื่อพัสดุ",
          "ประเภท",
          "Lot No.",
          "จำนวนที่เสียหาย",
          "วันที่เสียหาย",
          "ประเภทความเสียหาย",
          "หมายเหตุ",
          "ผู้รายงาน",
          "จำนวนที่จัดการแล้ว",
          "คงเหลือ",
          "สถานะ",
        ],
      ],
      body: tableData,
      startY: 25,
    });

    doc.save(`damaged-report-${Date.now()}.pdf`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Wrench size={32} color="#f97316" />
        <h1>รายงานพัสดุชำรุด/เสียหาย</h1>
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
                <th>หมวดหมู่</th>
                <th>Lot No.</th>
                <th>จำนวน</th>
                <th>วันที่เสียหาย</th>
                <th>ประเภท</th>
                <th>ผู้รายงาน</th>
                <th>จัดการแล้ว</th>
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
                    <td style={{ color: "red", fontWeight: "600" }}>{item.damaged_qty}</td>
                    <td>{formatDate(item.damaged_date)}</td>
                    <td>{translateDamageType(item.damage_type)}</td>
                    <td>{item.reported_by}</td>
                    <td>{item.managed_qty}</td>
                    <td>{item.remaining_qty}</td>
                    <td>{renderStatus(item.manage_status)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "1rem" }}>
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
