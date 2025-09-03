"use client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { Package, FileDown, Search } from "lucide-react";
import {manageAxios} from "@/app/utils/axiosInstance";
import {
  exportInventoryPDF,
  exportInventoryCSV,
} from "@/app/utils/PDF_CSV/exportInventoryReport";
import styles from "./page.module.css";

export default function InventoryReport() {
  const [category, setCategory] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ จำลอง user (ยังไม่มีระบบ login)
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
    { value: "today", label: "วันนี้" },
    { value: "month", label: "เดือนนี้" },
    { value: "year", label: "ปีนี้" },
    { value: "custom", label: "กำหนดเอง" },
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

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await manageAxios.get("/report/inventory/summary", {
        params: {
          category: category?.value || "all",
          start: dateRange?.value === "month" ? "2025-08-01" : null,
          end: dateRange?.value === "month" ? "2025-08-31" : null,
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching inventory report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Package size={32} color="#2563eb" />
        <h1>รายงานคงคลัง</h1>
      </div>

      {/* Filter */}
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

        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          ค้นหา
        </button>

        {/* PDF */}
        <button
          className={styles.btnSecondary}
          onClick={() =>
            exportInventoryPDF({
              data,
              filters: {
                categoryLabel: category?.label,
                dateLabel: dateRange?.label,
              },
              user: mockUser, // ✅ ส่ง mock user
            })
          }
        >
          <FileDown size={16} style={{ marginRight: "6px" }} />
          PDF
        </button>

        {/* CSV */}
        <button
          className={styles.btnSecondary}
          onClick={() => exportInventoryCSV({ data, user: mockUser })}
        >
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
                <th>รหัสพัสดุ</th>
                <th>ชื่อพัสดุ</th>
                <th>ประเภท</th>
                <th>รับเข้า</th>
                <th>เบิกออก</th>
                <th>คงเหลือ</th>
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
                      <td>{item.received}</td>
                      <td>{item.issued}</td>
                      <td
                        className={
                          balance < 0
                            ? styles.negativeStock
                            : balance <= 10
                            ? styles.lowStock
                            : ""
                        }
                      >
                        {balance}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "1rem" }}>
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
