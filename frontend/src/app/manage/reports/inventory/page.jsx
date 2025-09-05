"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Package, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import {
  exportInventoryPDF,
  exportInventoryCSV,
} from "@/app/utils/PDF_CSV/exportInventoryReport";
import styles from "./page.module.css";

// ✅ react-select render ฝั่ง client เท่านั้น
const Select = dynamic(() => import("react-select"), { ssr: false });

export default function InventoryReport() {
  const [category, setCategory] = useState({ value: "all", label: "ทั้งหมด" });
  const [dateRange, setDateRange] = useState({ value: "all", label: "ทุกช่วงเวลา" });
  const [sourceType, setSourceType] = useState({ value: "all", label: "ทุกแหล่งที่มา" });
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const mockUser = {
    user_id: 1,
    user_fname: "วัชรพล",
    user_lname: "อินทร์ทอง",
    user_role: "เจ้าหน้าที่คลัง",
    department: "คลังกลาง",
  };

  const categoryOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "medicine", label: "ยา" },
    { value: "medsup", label: "เวชภัณฑ์" },
    { value: "equipment", label: "ครุภัณฑ์" },
    { value: "meddevice", label: "อุปกรณ์การแพทย์" },
    { value: "general", label: "ของใช้ทั่วไป" },
  ];

  const dateOptions = [
    { value: "all", label: "ทุกช่วงเวลา" },
    { value: "today", label: "วันนี้" },
    { value: "1m", label: "1 เดือนย้อนหลัง" },
    { value: "3m", label: "3 เดือนย้อนหลัง" },
    { value: "6m", label: "6 เดือนย้อนหลัง" },
    { value: "9m", label: "9 เดือนย้อนหลัง" },
    { value: "12m", label: "12 เดือนย้อนหลัง" },
    { value: "year", label: "ปีนี้" },
    { value: "custom", label: "กำหนดเอง" },
  ];

  const sourceOptions = [
    { value: "all", label: "ทุกแหล่งที่มา" },
    { value: "purchase", label: "จัดซื้อ" },
    { value: "return", label: "คืนพัสดุ" },
    { value: "adjustment", label: "ปรับปรุงยอด" },
  ];

  const translateCategory = (cat) => {
    const map = {
      medicine: "ยา",
      medsup: "เวชภัณฑ์",
      equipment: "ครุภัณฑ์",
      meddevice: "อุปกรณ์การแพทย์",
      general: "ของใช้ทั่วไป",
    };
    return map[cat] || cat || "-";
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);

      let start = null;
      let end = null;
      const now = new Date();

      if (dateRange?.value === "today") {
        start = now.toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
      } else if (["1m", "3m", "6m", "9m", "12m"].includes(dateRange?.value)) {
        const months = parseInt(dateRange.value);
        const past = new Date();
        past.setMonth(now.getMonth() - months);
        start = past.toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
      } else if (dateRange?.value === "year") {
        const year = now.getFullYear();
        start = `${year}-01-01`;
        end = `${year}-12-31`;
      } else if (dateRange?.value === "custom") {
        start = customStart || null;
        end = customEnd || null;
      }

      if (dateRange?.value === "custom" && (!start || !end)) {
        console.error("Please select a valid date range.");
        setLoading(false);
        return;
      }

      // ✅ แก้ไขตรงนี้: ส่งค่า start และ end เป็นพารามิเตอร์ระดับบนสุด
      const params = {
        category: category?.value || "all",
        source: sourceType?.value || "all",
        start,
        end,
      };

      const res = await manageAxios.get("/report/inventory/summary", { params });

      setData(res.data);
    } catch (err) {
      console.error("Error fetching inventory report:", err);
    } finally {
      setLoading(false);
    }
  }, [category, dateRange, sourceType, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Package size={32} color="#2563eb" />
        <h1>รายงานคงคลัง</h1>
      </div>

      <div className={styles.filterBar}>
        <Select
          className={styles.selectBox}
          options={categoryOptions}
          placeholder="เลือกประเภทพัสดุ"
          value={category}
          onChange={setCategory}
        />
        <Select
          className={styles.selectBox}
          options={dateOptions}
          placeholder="เลือกช่วงเวลา"
          value={dateRange}
          onChange={setDateRange}
        />

        {dateRange?.value === "custom" && (
          <div className={styles.dateInputs}>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className={styles.dateInput}
            />
            <span>ถึง</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        )}

        <Select
          className={styles.selectBox}
          options={sourceOptions}
          placeholder="เลือกแหล่งที่มา"
          value={sourceType}
          onChange={setSourceType}
        />

        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          ค้นหา
        </button>

        <button
          className={styles.btnSecondary}
          onClick={() =>
            exportInventoryPDF({
              data,
              filters: {
                categoryLabel: category?.label,
                dateLabel: dateRange?.label,
                sourceLabel: sourceType?.label,
                start: dateRange?.value === "custom" ? customStart : null,
                end: dateRange?.value === "custom" ? customEnd : null,
              },
              user: mockUser,
            })
          }
        >
          <FileDown size={16} style={{ marginRight: "6px" }} />
          PDF
        </button>

        <button
          className={styles.btnSecondary}
          onClick={() => exportInventoryCSV({ data, user: mockUser })}
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
                <th>รหัสพัสดุ</th>
                <th>ชื่อพัสดุ</th>
                <th>ประเภท</th>
                <th>หน่วย</th>
                <th>รับเข้า</th>
                <th>เบิกออก</th>
                <th>คงเหลือ</th>
                <th>มูลค่า (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => {
                  const balance = parseInt(item.balance, 10) || 0;
                  return (
                    <tr key={idx}>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>{translateCategory(item.category)}</td>
                      <td>{item.unit || "-"}</td>
                      <td>{item.received}</td>
                      <td>{item.issued}</td>
                      <td
                        className={
                          balance <= 0
                            ? styles.negativeStock
                            : balance <= 10
                            ? styles.lowStock
                            : ""
                        }
                      >
                        {balance}
                      </td>
                      <td>
                        {(item.total_value !== undefined
                          ? parseFloat(item.total_value) || 0
                          : balance * (parseFloat(item.unit_cost) || 0)
                        ).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "1rem" }}>
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