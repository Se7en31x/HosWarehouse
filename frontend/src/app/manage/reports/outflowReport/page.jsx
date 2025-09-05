"use client";
import { useState, useEffect, useCallback } from "react";
import Select from "react-select";
import { ClipboardList, FileDown, Search } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

export default function OutflowReport() {
  // ✅ แก้ไขค่าเริ่มต้นของ state ให้เป็น 'all'
  const [type, setType] = useState({ value: "all", label: "ทั้งหมด" });
  const [department, setDepartment] = useState({ value: "all", label: "ทั้งหมด" });
  const [dateRange, setDateRange] = useState({ value: "all", label: "ทั้งหมด" });
  
  const [sortBy, setSortBy] = useState({ value: "date_desc", label: "ล่าสุดก่อน" });
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

  // ✅ เพิ่มตัวเลือก 'all' สำหรับช่วงเวลา
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

  const sortOptions = [
    { value: "date_desc", label: "ล่าสุดก่อน" },
    { value: "date_asc", label: "เก่าก่อน" },
    { value: "request_code", label: "เลขที่คำขอ" },
    { value: "status", label: "สถานะการดำเนินการ" },
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

  const translateRequestType = (type) => {
    const map = { withdraw: "เบิก", borrow: "ยืม" };
    return map[type] || type;
  };

  const translateApprovalStatus = (status) => {
    const map = {
      waiting_approval: "รออนุมัติ",
      waiting_approval_detail: "รออนุมัติ",
      approved: "อนุมัติ",
      approved_in_queue: "อนุมัติรอดำเนินการ",
      rejected: "ไม่อนุมัติ",
      partial: "อนุมัติบางส่วน",
    };
    return map[status] || status;
  };

  const translateProcessingStatus = (status) => {
    const map = {
      pending: { text: "รอจ่าย", className: styles.badgeGray },
      preparing: { text: "กำลังเตรียม", className: styles.badgeBlue },
      delivering: { text: "กำลังนำส่ง", className: styles.badgeOrange },
      completed: { text: "เสร็จสิ้น", className: styles.badgeGreen },
      rejected: { text: "ปฏิเสธ", className: styles.badgeRed },
      waiting_approval: { text: "รออนุมัติ", className: styles.badgeGray },
      approved_in_queue: { text: "อนุมัติรอดำเนินการ", className: styles.badgeBlue },
    };
    return map[status] || { text: "-", className: styles.badgeGray };
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
      const today = new Date();
      const option = dateRange?.value;

      if (option === "today") {
        start = today.toISOString().split("T")[0];
        end = today.toISOString().split("T")[0];
      } else if (option === "year") {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        const lastDay = new Date(today.getFullYear(), 11, 31);
        start = firstDay.toISOString().split("T")[0];
        end = lastDay.toISOString().split("T")[0];
      } else if (option?.startsWith("last")) {
        const months = parseInt(option.replace("last", "").replace("months", ""));
        end = today.toISOString().split("T")[0];
        const pastDate = new Date();
        pastDate.setMonth(pastDate.getMonth() - months);
        start = pastDate.toISOString().split("T")[0];
      }

      const params = {
        type: type?.value || "all",
        department: department?.value || "all",
      };
      if (start) {
        params.start = start;
        params.end = end;
      }

      const res = await manageAxios.get("/report/outflow", { params });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching outflow report:", err);
    } finally {
      setLoading(false);
    }
  }, [type, department, dateRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const sortedData = [...data].sort((a, b) => {
    if (sortBy.value === "date_desc") {
      return new Date(b.request_date) - new Date(a.request_date);
    }
    if (sortBy.value === "date_asc") {
      return new Date(a.request_date) - new Date(b.request_date);
    }
    if (sortBy.value === "request_code") {
      return a.request_code.localeCompare(b.request_code);
    }
    if (sortBy.value === "status") {
      const order = [
        "waiting_approval",
        "approved_in_queue",
        "pending",
        "preparing",
        "delivering",
        "completed",
        "rejected",
      ];
      return order.indexOf(a.processing_status) - order.indexOf(b.processing_status);
    }
    return 0;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <ClipboardList size={32} color="#2563eb" />
        <h1>รายงานการเบิก ยืม</h1>
      </div>
      <div className={styles.filterBar}>
        <Select
          className={styles.selectBox}
          options={typeOptions}
          value={type}
          onChange={setType}
          placeholder="ประเภทคำขอ"
        />
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
        <Select
          className={styles.selectBox}
          options={sortOptions}
          value={sortBy}
          onChange={setSortBy}
          placeholder="เรียงตาม"
        />
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
              {sortedData.length > 0 ? (
                sortedData.map((item, idx) => {
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