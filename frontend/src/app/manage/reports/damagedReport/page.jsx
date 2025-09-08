"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ClipboardCheck, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

import { exportDamagedPDF } from "@/app/components/pdf/templates/damagedTemplate";
import { exportDamagedCSV } from "@/app/components/Csv/templates/damagedCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

export default function DamagedReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemCategory, setItemCategory] = useState(null);
  const [damageType, setDamageType] = useState(null);
  const [manageStatus, setManageStatus] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const categoryOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "general", label: "ของใช้ทั่วไป" },
    { value: "medsup", label: "เวชภัณฑ์" },
    { value: "equipment", label: "ครุภัณฑ์" },
    { value: "meddevice", label: "อุปกรณ์การแพทย์" },
    { value: "medicine", label: "ยา" },
  ];

  const damageTypeOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "damaged", label: "ชำรุด" },
    { value: "lost", label: "สูญหาย" },
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

  const translateDamageType = (type) => {
    const map = { damaged: "ชำรุด", lost: "สูญหาย" };
    return map[type] || type || "-";
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  const translateManageStatus = (status) => {
    switch (status) {
      case "unmanaged":
        return { text: "ยังไม่จัดการ", className: styles.badgeRed };
      case "managed":
        return { text: "จัดการแล้ว", className: styles.badgeGreen };
      case "partially_managed":
        return { text: "จัดการบางส่วน", className: styles.badgeOrange };
      default:
        // ✅ คืน object เสมอ ป้องกัน undefined
        return { text: "-", className: styles.badgeGray || "" };
    }
  };

  const toISODate = (date) => date.toISOString().split("T")[0];

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (itemCategory?.value && itemCategory.value !== "all")
        params.category = itemCategory.value;
      if (damageType?.value && damageType.value !== "all")
        params.damage_type = damageType.value;
      if (manageStatus?.value && manageStatus.value !== "all")
        params.status = manageStatus.value;

      const today = new Date();
      let start = null,
        end = null;
      const option = dateRange?.value;

      if (option === "today") {
        start = today;
        end = today;
      } else if (option === "year") {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
      } else if (option?.startsWith("last")) {
        const months = parseInt(option.replace("last", "").replace("months", ""));
        start = new Date();
        start.setMonth(today.getMonth() - months);
        end = today;
      } else if (option === "custom" && customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      }

      if (start && end) {
        params.start_date = toISODate(start);
        params.end_date = toISODate(end);
      }

      const res = await manageAxios.get("/report/damaged", { params });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching damaged report:", err);
    } finally {
      setLoading(false);
    }
  }, [itemCategory, damageType, manageStatus, dateRange, customStart, customEnd]);

  useEffect(() => {
    if (dateRange?.value !== "custom" || (customStart && customEnd)) {
      fetchReport();
    }
  }, [fetchReport, dateRange, customStart, customEnd]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardCheck size={32} color="#f97316" />
        <h1>รายงานพัสดุชำรุด/เสียหาย</h1>
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
          options={damageTypeOptions}
          value={damageType}
          onChange={setDamageType}
          placeholder="ประเภทความเสียหาย"
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

        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} /> ค้นหา
        </button>
        <button
          className={styles.btnSecondary}
          onClick={() =>
            exportDamagedPDF({
              data,
              filters: {
                categoryLabel: itemCategory?.label,
                damageTypeLabel: damageType?.label,
                statusLabel: manageStatus?.label,
                dateLabel: dateRange?.label,
                dateValue: dateRange?.value,
                start: customStart,
                end: customEnd,
              },
              user: { user_fname: "วัชรพล", user_lname: "อินทร์ทอง" },
            })
          }
        >
          <FileDown size={16} style={{ marginRight: "6px" }} /> PDF
        </button>
        <button
          className={styles.btnSecondary}
          onClick={() => exportDamagedCSV({ data })}
        >
          <FileDown size={16} style={{ marginRight: "6px" }} /> CSV
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
                <th>รหัสพัสดุ</th>
                <th>ประเภท</th>
                <th>Lot No.</th>
                <th>วันรายงาน</th>
                <th>ผู้รายงาน</th>
                <th>ประเภทความเสียหาย</th>
                <th>จำนวน</th>
                <th>จัดการแล้ว</th>
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
                      <td>{item.item_code}</td>
                      <td>{translateCategory(item.category)}</td>
                      <td>{item.lot_no}</td>
                      <td>{formatDate(item.damaged_date)}</td>
                      <td>{item.reported_by}</td>
                      <td>{translateDamageType(item.damage_type)}</td>
                      <td style={{ textAlign: "right" }}>{item.damaged_qty}</td>
                      <td style={{ textAlign: "right" }}>{item.managed_qty}</td>
                      <td style={{ textAlign: "right" }}>{item.remaining_qty}</td>
                      <td>
                        <span className={`${styles.badge} ${status?.className || ""}`}>
                          {status?.text || "-"}
                        </span>
                      </td>
                    </tr>
                  );
                })
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
