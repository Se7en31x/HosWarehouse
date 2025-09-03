"use client";
import { useState, useEffect } from "react";
import Select from "react-select";
import { ClipboardList, FileDown, Search } from "lucide-react";
import {manageAxios} from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

export default function OutflowReport() {
  const [type, setType] = useState(null);
  const [department, setDepartment] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const typeOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "withdraw", label: "เบิก" },
    { value: "borrow", label: "ยืม" },
  ];

  const departmentOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "er", label: "ฉุกเฉิน" },
    { value: "ipd", label: "ผู้ป่วยใน" },
    { value: "or", label: "ห้องผ่าตัด" },
  ];

  const dateOptions = [
    { value: "today", label: "วันนี้" },
    { value: "month", label: "เดือนนี้" },
    { value: "year", label: "ปีนี้" },
  ];

  // ✅ ตัวช่วยแปลง category
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

  // ✅ ประเภทคำขอ
  const translateRequestType = (type) => {
    const map = { withdraw: "เบิก", borrow: "ยืม" };
    return map[type] || type;
  };

  // ✅ สถานะอนุมัติ
  const translateApprovalStatus = (status) => {
  const map = {
    waiting_approval: "รออนุมัติ",
    waiting_approval_detail: "รออนุมัติ", // ✅ เพิ่มตัวนี้
    approved: "อนุมัติ",
    rejected: "ไม่อนุมัติ",
    partial: "อนุมัติบางส่วน",
  };
  return map[status] || status;
};

// ✅ สถานะการดำเนินการ
const translateProcessingStatus = (status) => {
  const map = {
    pending: { text: "รอจ่าย", className: styles.badgeGray },
    preparing: { text: "กำลังเตรียม", className: styles.badgeBlue },
    delivering: { text: "กำลังนำส่ง", className: styles.badgeOrange },
    completed: { text: "เสร็จสิ้น", className: styles.badgeGreen },
    rejected: { text: "ปฏิเสธ", className: styles.badgeRed },          // ✅ เพิ่มตรงนี้
    waiting_approval: { text: "รออนุมัติ", className: styles.badgeGray },  // ✅ กันไว้ด้วย
  };
  return map[status] || { text: "-", className: styles.badgeGray };
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

  // ✅ ดึงข้อมูล
  // ✅ ดึงข้อมูล
const fetchReport = async () => {
  try {
    setLoading(true);

    let start = null;
    let end = null;
    const today = new Date();

    if (dateRange?.value === "today") {
      // กำหนดเป็นวันเดียว
      start = today.toISOString().split("T")[0];
      end = today.toISOString().split("T")[0];
    } else if (dateRange?.value === "month") {
      // หาวันแรกและวันสุดท้ายของเดือน
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = firstDay.toISOString().split("T")[0];
      end = lastDay.toISOString().split("T")[0];
    } else if (dateRange?.value === "year") {
      // หาวันแรกและวันสุดท้ายของปี
      const firstDay = new Date(today.getFullYear(), 0, 1);
      const lastDay = new Date(today.getFullYear(), 11, 31);
      start = firstDay.toISOString().split("T")[0];
      end = lastDay.toISOString().split("T")[0];
    }

    const res = await manageAxios.get("/report/outflow", {
      params: {
        type: type?.value || "all",
        department: department?.value || "all",
        start,
        end,
      },
    });
    setData(res.data);
  } catch (err) {
    console.error("Error fetching outflow report:", err);
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
        <ClipboardList size={32} color="#2563eb" />
        <h1>รายงานการนำออก (เบิก + ยืม)</h1>
      </div>

      {/* Filter */}
      <div className={styles.filterBar}>
        <Select className={styles.selectBox} options={typeOptions} value={type} onChange={setType} placeholder="ประเภทคำขอ" />
        <Select className={styles.selectBox} options={departmentOptions} value={department} onChange={setDepartment} placeholder="แผนก" />
        <Select className={styles.selectBox} options={dateOptions} value={dateRange} onChange={setDateRange} placeholder="ช่วงเวลา" />

        <button className={styles.btnPrimary} onClick={fetchReport}>
          <Search size={16} style={{ marginRight: "6px" }} />
          ค้นหา
        </button>
        <button className={styles.btnSecondary}>
          <FileDown size={16} style={{ marginRight: "6px" }} />
          PDF
        </button>
        <button className={styles.btnSecondary}>
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
                <th>รหัสคำขอ</th>
                <th>วันที่</th>
                <th>ชื่อพัสดุ</th>
                <th>ประเภท</th>
                <th>จำนวนอนุมัติ</th>
                <th>จำนวนจ่ายจริง</th>
                <th>หน่วย</th>
                <th>ประเภทคำขอ</th>
                <th>แผนก</th>
                <th>สถานะอนุมัติ</th>
                <th>สถานะการดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, idx) => {
                  const proc = translateProcessingStatus(item.processing_status);
                  return (
                    <tr key={idx}>
                      <td>{item.request_code}</td>
                      <td>{formatDate(item.request_date)}</td>
                      <td>{item.item_name}</td>
                      <td>{translateCategory(item.category)}</td>
                      <td>{item.approved_qty}</td>
                      <td>{item.issued_qty || "-"}</td>
                      <td>{item.unit}</td>
                      <td>{translateRequestType(item.request_type)}</td>
                      <td>{item.department}</td>
                      <td>{translateApprovalStatus(item.approval_status)}</td>
                      <td>
                        <span className={`${styles.badge} ${proc.className}`}>
                          {proc.text}
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
