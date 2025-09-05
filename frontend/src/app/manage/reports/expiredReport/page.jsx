"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic';
import { ClipboardX, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { saveAs } from "file-saver";

const DynamicSelect = dynamic(() => import('react-select'), { ssr: false });

export default function ExpiredReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemCategory, setItemCategory] = useState(null);
  const [manageStatus, setManageStatus] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const categoryOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "general", label: "ของใช้ทั่วไป" },
    { value: "medsup", label: "เวชภัณฑ์" },
    { value: "equipment", label: "ครุภัณฑ์" },
    { value: "meddevice", label: "อุปกรณ์การแพทย์" },
    { value: "medicine", label: "ยา" },
  ];

  const statusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "managed", label: "จัดการแล้ว" },
    { value: "unmanaged", label: "ยังไม่จัดการ" },
    { value: "partially_managed", label: "จัดการบางส่วน" },
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
  ];

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

  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const toISODate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (itemCategory?.value && itemCategory.value !== "all") {
        params.category = itemCategory.value;
      }
      if (manageStatus?.value && manageStatus.value !== "all") {
        params.status = manageStatus.value;
      }
      if (dateRange?.value && dateRange.value !== "all") {
        const today = new Date();
        let start = null;
        let end = null;
        const option = dateRange.value;

        if (option === "today") {
          start = today;
          end = today;
        } else if (option === "year") {
          start = new Date(today.getFullYear(), 0, 1);
          end = new Date(today.getFullYear(), 11, 31);
        } else if (option.startsWith("last")) {
          const months = parseInt(option.replace("last", "").replace("months", ""));
          start = new Date();
          start.setMonth(today.getMonth() - months);
          end = today;
        }

        if (start && end) {
          params.start_date = toISODate(start);
          params.end_date = toISODate(end);
        }
      }

      const res = await manageAxios.get("/report/expired", { params });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching expired report:", err);
    } finally {
      setLoading(false);
    }
  }, [itemCategory, manageStatus, dateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const translateManageStatus = (status) => {
    switch (status) {
      case 'unmanaged':
        return { text: "ยังไม่จัดการ", className: styles.badgeRed };
      case 'managed':
        return { text: "จัดการแล้ว", className: styles.badgeGreen };
      case 'partially_managed':
        return { text: "จัดการบางส่วน", className: styles.badgeOrange };
      default:
        return { text: "-", className: styles.badgeGray };
    }
  };

  const exportCSV = useCallback(() => {
    if (!data.length) return;
    const csvData = data.map(item => ({
        "ชื่อพัสดุ": item.item_name,
        "ประเภท": translateCategory(item.category),
        "Lot No.": item.lot_no,
        "จำนวนที่นำเข้า": item.qty_imported,
        "วันหมดอายุ": formatDate(item.exp_date),
        "จำนวนหมดอายุ": item.expired_qty,
        "จำนวนที่จัดการแล้ว": item.disposed_qty,
        "คงเหลือ": item.remaining_qty,
        "สถานะ": translateManageStatus(item.manage_status).text,
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `expired-report-${Date.now()}.csv`);
  }, [data]);

  const exportPDF = useCallback(() => {
    if (!data.length) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("รายงานพัสดุหมดอายุ (Expired Report)", 14, 15);

    const tableData = data.map((item) => [
      item.item_name,
      translateCategory(item.category),
      item.lot_no,
      item.qty_imported,
      formatDate(item.exp_date),
      item.expired_qty,
      item.disposed_qty,
      item.remaining_qty,
      translateManageStatus(item.manage_status).text,
    ]);

    autoTable(doc, {
      head: [
        [
          "ชื่อพัสดุ",
          "ประเภท",
          "Lot No.",
          "จำนวนที่นำเข้า",
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
  }, [data]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardX size={32} color="#dc2626" />
        <h1>รายงานพัสดุหมดอายุ</h1>
      </div>

      <div className={styles.filterBar}>
        <DynamicSelect
          className={styles.selectBox}
          options={categoryOptions}
          value={itemCategory}
          onChange={setItemCategory}
          placeholder="ประเภทพัสดุ"
        />
        <DynamicSelect
          className={styles.selectBox}
          options={statusOptions}
          value={manageStatus}
          onChange={setManageStatus}
          placeholder="สถานะ"
        />
        <DynamicSelect
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
                <th>จำนวนที่นำเข้า</th>
                <th>วันหมดอายุ</th>
                <th>จำนวนหมดอายุ</th>
                <th>จำนวนที่จัดการแล้ว</th>
                <th>คงเหลือ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => {
                  const status = translateManageStatus(item.manage_status);
                  return (
                    <tr key={idx}>
                      <td>{item.item_name}</td>
                      <td>{translateCategory(item.category)}</td>
                      <td>{item.lot_no}</td>
                      <td style={{ textAlign: "right" }}>{item.qty_imported}</td>
                      <td>{formatDate(item.exp_date)}</td>
                      <td style={{ textAlign: "right", color: "red", fontWeight: "600" }}>{item.expired_qty}</td>
                      <td style={{ textAlign: "right" }}>{item.disposed_qty}</td>
                      <td style={{ textAlign: "right" }}>{item.remaining_qty}</td>
                      <td>
                        <span className={`${styles.badge} ${status.className}`}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
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