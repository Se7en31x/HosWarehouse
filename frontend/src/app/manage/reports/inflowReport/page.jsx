"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ClipboardList, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { exportInflowPDF } from "@/app/components/pdf/templates/inflowTemplate";
import { exportInflowCSV } from "@/app/components/Csv/templates/inflowCSV";

const Select = dynamic(() => import("react-select"), { ssr: false });

export default function InflowReport() {
  const [type, setType] = useState({ value: "all", label: "ทั้งหมด" });
  const [dateRange, setDateRange] = useState({ value: "all", label: "ทุกช่วงเวลา" });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const typeOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "general", label: "รับเข้าทั่วไป" },
    { value: "purchase", label: "รับเข้าจากการสั่งซื้อ" },
    { value: "return", label: "คืนพัสดุ" },
    { value: "repair_return", label: "คืนจากซ่อม" },
    { value: "adjustment", label: "ปรับปรุงยอด" },
  ];

  const dateOptions = [
    { value: "all", label: "ทุกช่วงเวลา" },
    { value: "today", label: "วันนี้" },
    { value: "last_1_month", label: "ย้อนหลัง 1 เดือน" },
    { value: "last_3_months", label: "ย้อนหลัง 3 เดือน" },
    { value: "last_6_months", label: "ย้อนหลัง 6 เดือน" },
    { value: "last_9_months", label: "ย้อนหลัง 9 เดือน" },
    { value: "last_12_months", label: "ย้อนหลัง 12 เดือน" },
    { value: "custom", label: "กำหนดเอง" },
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

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);

      let start = null;
      let end = null;
      const now = new Date();

      switch (dateRange?.value) {
        case "today":
          start = now.toISOString().split("T")[0];
          end = now.toISOString().split("T")[0];
          break;
        case "last_1_month":
        case "last_3_months":
        case "last_6_months":
        case "last_9_months":
        case "last_12_months": {
          const monthsAgo = parseInt(dateRange.value.split("_")[1]); // ดึงเลขเดือน
          const d = new Date(now);
          d.setMonth(now.getMonth() - monthsAgo);
          start = d.toISOString().split("T")[0];
          end = now.toISOString().split("T")[0];
          break;
        }
        case "custom":
          start = customStart || null;
          end = customEnd || null;
          if (!start || !end) {
            setLoading(false);
            return; // ✅ ไม่ยิง API ถ้ายังไม่เลือกวัน
          }
          break;
        default:
          start = null;
          end = null;
          break;
      }

      const res = await manageAxios.get("/report/inflow", {
        params: {
          type: type?.value || "all",
          start,
          end,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching inflow report:", err);
    } finally {
      setLoading(false);
    }
  }, [type, dateRange, customStart, customEnd]);

  useEffect(() => {
    if (dateRange?.value !== "custom" || (customStart && customEnd)) {
      fetchReport();
    }
  }, [fetchReport, dateRange, customStart, customEnd]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardList size={32} color="#2563eb" />
        <h1>รายงานการรับเข้า</h1>
      </div>

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

        {dateRange?.value === "custom" && (
          <div className={`${styles.dateInputs} ${styles.customDateRange}`}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className={styles.dateInput}
            />
            <span className={styles.dateSeparator}>ถึง</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        )}

        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          ค้นหา
        </button>

        <button
          className={styles.btnSecondary}
          onClick={() =>
            exportInflowPDF({
              data,
              filters: {
                typeLabel: type?.label,
                dateLabel: dateRange?.label,
                dateValue: dateRange?.value,
                start: customStart,
                end: customEnd,
              },
              user: { user_fname: "วัชรพล", user_lname: "อินทร์ทอง" },
            })
          }
        >
          <FileDown size={16} style={{ marginRight: "6px" }} />
          PDF
        </button>

        <button
          className={styles.btnSecondary}
          onClick={() =>
            exportInflowCSV({
              data,
              user: { user_fname: "วัชรพล", user_lname: "อินทร์ทอง" },
            })
          }
        >
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
                <th>เลขที่เอกสาร</th>
                <th>วันที่</th>
                <th>ประเภทการรับเข้า</th>
                <th>ชื่อพัสดุ</th>
                <th>ประเภท</th>
                <th>Lot No</th>
                <th>จำนวน</th>
                <th>หน่วย</th>
                <th>ผู้ขาย/ซัพพลายเออร์</th>
                <th>ผู้ทำรายการ</th>
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
                    <td>{item.lot_no || "-"}</td>
                    <td>{item.qty}</td>
                    <td>{item.unit}</td>
                    <td>{item.supplier_name || "-"}</td>
                    <td>{item.user_name || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: "center", padding: "1rem" }}>
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
