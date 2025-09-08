"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ClipboardList, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { exportReturnPDF } from "@/app/components/pdf/templates/returnTemplate";
import { exportReturnCSV } from "@/app/components/Csv/templates/returnCSV";

// ใช้ dynamic import เพื่อแก้ Hydration Error ที่เกิดจาก react-select
const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

export default function ReturnReport() {
  const [department, setDepartment] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [customStart, setCustomStart] = useState("");   // ✅ state สำหรับ custom start
  const [customEnd, setCustomEnd] = useState("");       // ✅ state สำหรับ custom end
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const departmentOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "ฉุกเฉิน", label: "ฉุกเฉิน" },
    { value: "ผู้ป่วยใน", label: "ผู้ป่วยใน" },
    { value: "ห้องผ่าตัด", label: "ห้องผ่าตัด" },
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
    { value: "custom", label: "กำหนดเอง" },   // ✅ เพิ่ม option กำหนดเอง
  ];

  const approvalStatusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "approved", label: "อนุมัติ" },
    { value: "rejected", label: "ปฏิเสธ" },
    { value: "partial", label: "อนุมัติบางส่วน" },
    { value: "waiting_approval", label: "รออนุมัติ" },
    { value: "waiting_approval_detail", label: "รออนุมัติรายละเอียด" },
    { value: "approved_in_queue", label: "อนุมัติ (รอดำเนินการ)" },
  ];

  const translateApprovalStatus = (status) => {
    switch (status) {
      case "approved":
        return { text: "อนุมัติ", className: styles.badgeGreen };
      case "rejected":
        return { text: "ปฏิเสธ", className: styles.badgeRed };
      case "partial":
        return { text: "อนุมัติบางส่วน", className: styles.badgeOrange };
      case "waiting_approval":
      case "waiting_approval_detail":
        return { text: "รออนุมัติ", className: styles.badgeGray };
      case "approved_in_queue":
        return { text: "อนุมัติ (รอดำเนินการ)", className: styles.badgeBlue };
      default:
        return { text: "-", className: styles.badgeGray };
    }
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

  const toISODate = (date) => {
    return date.toISOString().split("T")[0];
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};

      if (department?.value && department.value !== "all") {
        params.department = department.value;
      }

      if (approvalStatus?.value && approvalStatus.value !== "all") {
        params.approvalStatus = approvalStatus.value;
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
        } else if (option === "custom") {
          if (customStart && customEnd) {
            start = new Date(customStart);
            end = new Date(customEnd);
          }
        }

        if (start && end) {
          params.start = toISODate(start);
          params.end = toISODate(end);
        }
      }

      const res = await manageAxios.get("/report/return", { params });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching return report:", err);
    } finally {
      setLoading(false);
    }
  }, [department, dateRange, approvalStatus, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardList size={32} color="#2563eb" />
        <h1>รายงานการคืน</h1>
      </div>

      {/* Filter */}
      <div className={styles.filterBar}>
        <DynamicSelect
          className={styles.selectBox}
          options={departmentOptions}
          value={department}
          onChange={setDepartment}
          placeholder="แผนก"
        />
        <DynamicSelect
          className={styles.selectBox}
          options={dateOptions}
          value={dateRange}
          onChange={setDateRange}
          placeholder="ช่วงเวลา"
        />

        {/* ✅ ถ้าเลือกกำหนดเอง → แสดงช่องเลือกวันที่ */}
        {dateRange?.value === "custom" && (
          <div className={styles.dateInputs}>
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

        <DynamicSelect
          className={styles.selectBox}
          options={approvalStatusOptions}
          value={approvalStatus}
          onChange={setApprovalStatus}
          placeholder="สถานะอนุมัติ"
        />

        <button className={styles.btnSecondary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          ค้นหา
        </button>
        <button
          className={styles.btnSecondary}
          onClick={() =>
            exportReturnPDF({
              data,
              filters: {
                departmentLabel: department?.label,
                dateLabel: dateRange?.label,
                dateValue: dateRange?.value,
                start: customStart,
                end: customEnd,
                approvalLabel: approvalStatus?.label,
              },
              user: { user_fname: "วัชรพล", user_lname: "อินทร์ทอง" },
            })
          }
        >
          <FileDown size={16} style={{ marginRight: "6px" }} />
          PDF
        </button>
        <button className={styles.btnSecondary} onClick={() => exportReturnCSV({ data })}>
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
                <th>แผนก</th>
                <th>ผู้ยืม</th>
                <th>ชื่อพัสดุ</th>
                <th>จำนวนอนุมัติ</th>
                <th>คืนแล้ว</th>
                <th>คงเหลือ</th>
                <th>สถานะการคืน</th>
                <th>วันคืนล่าสุด</th>
                <th>สถานะอนุมัติ</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => {
                  const approval = translateApprovalStatus(item.approval_status);
                  return (
                    <tr key={idx}>
                      <td>{item.request_code}</td>
                      <td>{item.department}</td>
                      <td>{item.borrower_name}</td>
                      <td>{item.item_name}</td>
                      <td style={{ textAlign: "right" }}>
                        {item.approved_qty?.toLocaleString("th-TH")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {item.returned_qty?.toLocaleString("th-TH")}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {item.not_returned_qty?.toLocaleString("th-TH")}
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${item.return_status === "ยังไม่คืน"
                            ? styles.badgeRed
                            : item.return_status === "คืนบางส่วน"
                              ? styles.badgeOrange
                              : item.return_status === "ปฏิเสธ"
                                ? styles.badgeGray
                                : styles.badgeGreen
                            }`}
                        >
                          {item.return_status}
                        </span>
                      </td>
                      <td>{formatDate(item.last_return_date)}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${approval.className}`}
                        >
                          {approval.text}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="11"
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