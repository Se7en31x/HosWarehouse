"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ClipboardList, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { saveAs } from "file-saver";

// ✅ ใช้ dynamic import แก้ hydration error
const Select = dynamic(() => import("react-select"), { ssr: false });


export default function InflowReport() {
  const [type, setType] = useState(null);
  const [data, setData] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [loading, setLoading] = useState(false);

  const typeOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "general", label: "รับเข้าทั่วไป" },
    { value: "purchase", label: "รับเข้าจากการสั่งซื้อ" },
  ];

  const dateOptions = [
    { value: "today", label: "วันนี้" },
    { value: "month", label: "เดือนนี้" },
    { value: "year", label: "ปีนี้" },
  ];

  // ✅ แปลประเภทพัสดุ
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

  // ✅ แปลประเภทการรับเข้า
  const translateInflowType = (type) => {
    const map = {
      general: "รับเข้าทั่วไป",
      purchase: "รับเข้าจากการสั่งซื้อ",
      return: "คืนพัสดุ",
      repair_return: "คืนจากซ่อม",
      adjustment: "ปรับปรุงยอด",
    };
    return map[type] || type || "-";
  };

  // ✅ ฟอร์แมตวันที่
  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ ดึงข้อมูลรายงาน
  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await manageAxios.get("/report/inflow", {
        params: {
          type: type?.value || "all",
          start: dateRange?.value === "month" ? "2025-08-01" : null,
          end: dateRange?.value === "month" ? "2025-08-31" : null,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching inflow report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // ✅ Export CSV
  const exportCSV = () => {
    if (!data.length) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `inflow-report-${Date.now()}.csv`);
  };

  // ✅ Export PDF
  const exportPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("รายงานการรับเข้า (Inflow Report)", 14, 15);

    const tableData = data.map((item) => [
      item.doc_no,
      formatDate(item.doc_date),
      translateInflowType(item.inflow_type),
      item.item_name,
      translateCategory(item.category),
      item.qty,
      item.unit,
      item.lot_no || "-",
      item.supplier_name || "-",
    ]);

    autoTable(doc, {
      head: [
        [
          "เลขที่เอกสาร",
          "วันที่",
          "ประเภทการรับเข้า",
          "ชื่อพัสดุ",
          "ประเภท",
          "จำนวน",
          "หน่วย",
          "Lot No",
          "ผู้ขาย/ซัพพลายเออร์",
        ],
      ],
      body: tableData,
      startY: 25,
    });

    doc.save(`inflow-report-${Date.now()}.pdf`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardList size={32} color="#2563eb" />
        <h1>รายงานการรับเข้า</h1>
      </div>

      {/* Filter */}
      <div className={styles.filterBar}>
        <Select
          className={styles.selectBox}
          options={typeOptions}
          value={type}
          onChange={setType}
          placeholder="ประเภทการรับเข้า"
        />
        <Select
          className={styles.selectBox}
          options={dateOptions}
          value={dateRange}
          onChange={setDateRange}
          placeholder="ช่วงเวลา"
        />

        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          ค้นหา
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
                <th>เลขที่เอกสาร</th>
                <th>วันที่</th>
                <th>ประเภทการรับเข้า</th>
                <th>ชื่อพัสดุ</th>
                <th>ประเภท</th>
                <th>จำนวน</th>
                <th>หน่วย</th>
                <th>Lot No</th>
                <th>ผู้ขาย/ซัพพลายเออร์</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.doc_no}</td>
                    <td>{formatDate(item.doc_date)}</td>
                    <td>{translateInflowType(item.inflow_type)}</td>
                    <td>{item.item_name}</td>
                    <td>{translateCategory(item.category)}</td>
                    <td>{item.qty}</td>
                    <td>{item.unit}</td>
                    <td>{item.lot_no || "-"}</td>
                    <td>{item.supplier_name || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "1rem" }}>
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
