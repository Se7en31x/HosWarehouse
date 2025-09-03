"use client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { ClipboardList, FileDown, Search } from "lucide-react";
import {manageAxios} from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { saveAs } from "file-saver";

export default function ReturnReport() {
  const [department, setDepartment] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const departmentOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "ฉุกเฉิน", label: "ฉุกเฉิน" },
    { value: "ผู้ป่วยใน", label: "ผู้ป่วยใน" },
    { value: "ห้องผ่าตัด", label: "ห้องผ่าตัด" },
  ];

  const dateOptions = [
    { value: "today", label: "วันนี้" },
    { value: "month", label: "เดือนนี้" },
    { value: "year", label: "ปีนี้" },
  ];

  // ✅ แปลสถานะอนุมัติ
  const translateApprovalStatus = (status) => {
    switch (status) {
      case "approved":
        return { text: "อนุมัติ", className: styles.badgeGreen };
      case "rejected":
        return { text: "ไม่อนุมัติ", className: styles.badgeRed };
      case "partial":
        return { text: "อนุมัติบางส่วน", className: styles.badgeOrange };
      case "waiting_approval":
        return { text: "รออนุมัติ", className: styles.badgeGray };
      default:
        return { text: "-", className: styles.badgeGray };
    }
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
      const res = await manageAxios.get("/report/return", {
        params: {
          department: department?.value || "all",
          start: dateRange?.value === "month" ? "2025-08-01" : null,
          end: dateRange?.value === "month" ? "2025-08-31" : null,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching return report:", err);
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
    saveAs(blob, `return-report-${Date.now()}.csv`);
  };

  // ✅ Export PDF
  const exportPDF = () => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("รายงานการคืน (Return Report)", 14, 15);

    const tableData = data.map((item) => [
      item.request_code,
      item.item_name,
      item.approved_qty,
      item.approval_status,
      item.returned_qty,
      item.not_returned_qty,
      item.return_status,
      formatDate(item.last_return_date),
      item.department,
    ]);

    autoTable(doc, {
      head: [
        [
          "เลขที่คำขอ",
          "ชื่อพัสดุ",
          "จำนวนอนุมัติ",
          "สถานะอนุมัติ",
          "จำนวนคืนแล้ว",
          "จำนวนคงเหลือ",
          "สถานะการคืน",
          "วันคืนล่าสุด",
          "แผนก",
        ],
      ],
      body: tableData,
      startY: 25,
    });

    doc.save(`return-report-${Date.now()}.pdf`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardList size={32} color="#2563eb" />
        <h1>รายงานการคืน</h1>
      </div>

      {/* Filter */}
      <div className={styles.filterBar}>
        <Select
          className={styles.selectBox}
          options={departmentOptions}
          value={department}
          onChange={setDepartment}
          placeholder="แผนก"
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
                <th>เลขที่คำขอ</th>
                <th>ชื่อพัสดุ</th>
                <th>จำนวนอนุมัติ</th>
                <th>สถานะอนุมัติ</th>
                <th>จำนวนคืนแล้ว</th>
                <th>จำนวนคงเหลือ</th>
                <th>สถานะการคืน</th>
                <th>วันคืนล่าสุด</th>
                <th>แผนก</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => {
                  const approval = translateApprovalStatus(item.approval_status);
                  return (
                    <tr key={idx}>
                      <td>{item.request_code}</td>
                      <td>{item.item_name}</td>
                      <td style={{ textAlign: "right" }}>{item.approved_qty}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${approval.className}`}
                        >
                          {approval.text}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>{item.returned_qty}</td>
                      <td style={{ textAlign: "right" }}>
                        {item.not_returned_qty}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            item.return_status === "ยังไม่คืน"
                              ? styles.badgeRed
                              : item.return_status === "คืนบางส่วน"
                              ? styles.badgeOrange
                              : styles.badgeGreen
                          }`}
                        >
                          {item.return_status}
                        </span>
                      </td>
                      <td>{formatDate(item.last_return_date)}</td>
                      <td>{item.department}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    style={{ textAlign: "center", padding: "1rem" }}
                  >
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
