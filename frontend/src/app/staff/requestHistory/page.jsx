"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { useRouter } from "next/navigation";
import exportPDF from "@/app/components/pdf/PDFExporter";
import exportCSV from "@/app/components/CSVexport";

export default function RequestHistory() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // State for Filters
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgent, setFilterUrgent] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const router = useRouter();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axiosInstance.get("/my-requests");
        setRequests(res.data);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // Map request status to Thai
  const requestStatusMap = {
    waiting_approval: "รอการอนุมัติ",
    approved_all: "อนุมัติทั้งหมด",
    rejected_all: "ปฏิเสธทั้งหมด",
    approved_partial: "อนุมัติบางส่วน",
    rejected_partial: "ปฏิเสธบางส่วน",
    approved_partial_and_rejected_partial: "อนุมัติ/ปฏิเสธบางส่วน",
  };

  const getRequestStatusBadge = (status) => {
    let statusClass = styles.statusBadge;
    if (status === "approved_all") {
      statusClass += ` ${styles.statusSuccess}`;
    } else if (status === "rejected_all") {
      statusClass += ` ${styles.statusCancelled}`;
    } else if (
      status === "approved_partial" ||
      status === "rejected_partial" ||
      status === "approved_partial_and_rejected_partial"
    ) {
      statusClass += ` ${styles.statusMixed}`;
    } else {
      statusClass += ` ${styles.statusPending}`;
    }

    return (
      <span className={statusClass}>
        {requestStatusMap[status] || status}
      </span>
    );
  };

  const getTypeLabel = (type) => {
    if (type === "borrow") return "ยืม";
    if (type === "withdraw") return "เบิก";
    return type || "-";
  };

  const getUrgentBadge = (isUrgent) => {
    let urgentClass = styles.urgentBadge;
    if (isUrgent) {
      urgentClass += ` ${styles.urgentTrue}`;
      return <span className={urgentClass}>เร่งด่วน</span>;
    } else {
      urgentClass += ` ${styles.urgentFalse}`;
      return <span className={urgentClass}>ปกติ</span>;
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    let match = true;

    if (filterType !== "all" && req.request_type !== filterType) match = false;
    if (filterStatus !== "all" && req.request_status !== filterStatus)
      match = false;

    if (filterUrgent !== "all") {
      if (filterUrgent === "urgent" && !req.is_urgent) match = false;
      if (filterUrgent === "normal" && req.is_urgent) match = false;
    }

    if (startDate && new Date(req.request_date) < new Date(startDate)) {
      match = false;
    }
    if (endDate && new Date(req.request_date) > new Date(endDate)) {
      match = false;
    }

    return match;
  });

  
const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "-";
    }
  };

  // Prepare data for export
  const prepareTableData = () => {
    const columns = [
      "เลขคำขอ",
      "วันที่",
      "ประเภท",
      "สถานะการอนุมัติ",
      "ความเร่งด่วน",
      "ผู้ขอ",
    ];
    const rows = filteredRequests.map((req) => [
        req.request_code || "-",
        formatDate(req.request_date),
        getTypeLabel(req.request_type),
        requestStatusMap[req.request_status] || req.request_status || "-",
        req.is_urgent ? "เร่งด่วน" : "ปกติ",
        req.user_name || "-",
    ]);
    return { columns, rows };
  };

  // Export to PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const { columns, rows } = prepareTableData();
      await exportPDF({
        filename: `request_history_${new Date().toISOString().split("T")[0]}.pdf`,
        columns,
        rows,
        title: "ประวัติการเบิก-ยืม",
      });
    } catch (err) {
      console.error("Error exporting PDF:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { columns, rows } = prepareTableData();
      exportCSV({
        filename: `request_history_${new Date().toISOString().split("T")[0]}.csv`,
        columns,
        rows,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <h1 className={styles.pageTitle}>ประวัติการเบิก-ยืม</h1>

        {/* Controls: Filters + Export */}
        <div className={styles.controls}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.filterInput}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.filterInput}
          />

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">ทุกประเภท</option>
            <option value="withdraw">เบิก</option>
            <option value="borrow">ยืม</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="waiting_approval">รออนุมัติ</option>
            <option value="approved_all">อนุมัติแล้ว</option>
            <option value="rejected_all">ถูกปฏิเสธ</option>
            <option value="approved_partial">อนุมัติบางส่วน</option>
            <option value="rejected_partial">ปฏิเสธบางส่วน</option>
          </select>

          <select
            value={filterUrgent}
            onChange={(e) => setFilterUrgent(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">ทั้งหมด</option>
            <option value="urgent">เร่งด่วน</option>
            <option value="normal">ปกติ</option>
          </select>

          <button
            onClick={handleExportPDF}
            className={`${styles.btn} ${styles.exportBtn}`}
            disabled={isExporting}
          >
            {isExporting ? "กำลัง export..." : "Export PDF"}
          </button>
          <button
            onClick={handleExportCSV}
            className={`${styles.btn} ${styles.exportBtn}`}
            disabled={isExporting}
          >
            {isExporting ? "กำลัง export..." : "Export CSV"}
          </button>
        </div>

        {loading ? (
          <div className={styles.noDataCell}>⏳ กำลังโหลดข้อมูล...</div>
        ) : filteredRequests.length > 0 ? (
          <div className={styles.tableFrame}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div>เลขคำขอ</div>
              <div>วันที่</div>
              <div>ประเภท</div>
              <div>สถานะการอนุมัติ</div>
              <div>ความเร่งด่วน</div>
              <div>ผู้ขอ</div>
              <div></div>
            </div>
            {filteredRequests.map((req) => (
              <div
                key={req.request_id}
                className={`${styles.tableGrid} ${styles.tableRow}`}
              >
                <div>{req.request_code}</div>
                <div>{formatDate(req.request_date)}</div>
                <div>{getTypeLabel(req.request_type)}</div>
                <div>{getRequestStatusBadge(req.request_status)}</div>
                <div>{getUrgentBadge(req.is_urgent)}</div>
                <div>{req.user_name || "-"}</div>
                <div>
                  <button
                    className={`${styles.btn} ${styles.primaryBtn}`}
                    onClick={() =>
                      router.push(`/staff/requestHistory/${req.request_id}`)
                    }
                  >
                    ดูรายละเอียด
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noDataCell}>ไม่พบข้อมูล</div>
        )}
      </div>
    </div>
  );
}