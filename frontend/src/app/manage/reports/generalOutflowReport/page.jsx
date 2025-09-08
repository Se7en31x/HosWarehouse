"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Send, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { exportGeneralOutflowPDF } from "@/app/components/pdf/templates/generalOutflowTemplate";
import { exportGeneralOutflowCSV } from "@/app/components/Csv/templates/generalOutflowCSV";

const Select = dynamic(() => import("react-select"), { ssr: false });

export default function GeneralOutflowReport() {
  const [type, setType] = useState({ value: "all", label: "ทั้งหมด" });
  const [data, setData] = useState([]);
  const [dateRange, setDateRange] = useState({ value: "all", label: "ทุกช่วงเวลา" });
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(false);

  const typeOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "withdraw", label: "ตัดสต็อก" },
    { value: "damaged", label: "ชำรุด" },
    { value: "expired_dispose", label: "หมดอายุ" },
  ];

  const dateOptions = [
    { value: "all", label: "ทุกช่วงเวลา" },
    { value: "today", label: "วันนี้" },
    { value: "1m", label: "1 เดือนย้อนหลัง" },
    { value: "3m", label: "3 เดือนย้อนหลัง" },
    { value: "6m", label: "6 เดือนย้อนหลัง" },
    { value: "9m", label: "9 เดือนย้อนหลัง" },
    { value: "12m", label: "12 เดือนย้อนหลัง" },
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

  const translateOutflowType = (type) => {
    const map = {
      withdraw: "ตัดสต็อกจากการเบิก",
      damaged: "ชำรุด",
      expired_dispose: "หมดอายุ",
      borrow: "ตัดสต็อกจากการยืม",
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

  /* ---------- Fetch Users ---------- */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await manageAxios.get("/users");
      const userOptions = res.data.map((u) => ({
        value: u.user_id,
        label: `${u.user_fname} ${u.user_lname}`,
      }));
      setUsers([{ value: "all", label: "ผู้ใช้งานทั้งหมด" }, ...userOptions]);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);

  /* ---------- Fetch Report ---------- */
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
        const months = parseInt(dateRange.value.split("m")[0]);
        const past = new Date();
        past.setMonth(now.getMonth() - months);
        start = past.toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
      } else if (dateRange?.value === "custom") {
        start = customStart || null;
        end = customEnd || null;
      }

      const res = await manageAxios.get("/report/general-outflow", {
        params: {
          type: type?.value || "all",
          start,
          end,
          user_id: user?.value || "all",
        },
      });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching general outflow report:", err);
    } finally {
      setLoading(false);
    }
  }, [type, dateRange, customStart, customEnd, user]);

  useEffect(() => {
    fetchUsers();
    fetchReport();
  }, [fetchReport, fetchUsers]);

  /* ---------- Render ---------- */
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Send size={32} color="#f97316" />
        <h1>รายงานการนำออก</h1>
      </div>

      <div className={styles.filterBar}>
        <Select
          className={styles.selectBox}
          options={typeOptions}
          value={type}
          onChange={setType}
          placeholder="ประเภทการนำออก"
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

        {users.length > 0 && (
          <Select
            className={styles.selectBox}
            options={users}
            value={user}
            onChange={setUser}
            placeholder="ผู้ทำรายการ"
          />
        )}

        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          ค้นหา
        </button>

        <button
          className={styles.btnSecondary}
          onClick={() =>
            exportGeneralOutflowPDF({
              data,
              filters: {
                typeLabel: type?.label,
                dateLabel: dateRange?.label,
                dateValue: dateRange?.value,
                start: customStart,
                end: customEnd,
                userLabel: user?.label,
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
            exportGeneralOutflowCSV({
              data,
              filename: "general-outflow-report.csv",
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
                <th>ประเภทการนำออก</th>
                <th>ชื่อพัสดุ</th>
                <th>ประเภท</th>
                <th>Lot No</th>
                <th>จำนวน</th>
                <th>หน่วย</th>
                <th>ผู้ทำรายการ</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.doc_no}</td>
                    <td>{formatDate(item.doc_date)}</td>
                    <td>{translateOutflowType(item.outflow_type)}</td>
                    <td>{item.item_name}</td>
                    <td>{translateCategory(item.category)}</td>
                    <td>{item.lot_no || "-"}</td>
                    <td>{item.qty}</td>
                    <td>{item.unit}</td>
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
