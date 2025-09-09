"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  ClipboardList,
  FileDown,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import { toast } from "react-toastify";
import styles from "./page.module.css";
import { exportOutflowPDF } from "@/app/components/pdf/templates/outflowTemplate";
import { exportOutflowCSV } from "@/app/components/Csv/templates/outflowCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

export default function OutflowReport() {
  const [type, setType] = useState(null);
  const [department, setDepartment] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null); // ✅ user จริงจาก API

  const ITEMS_PER_PAGE = 12;
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  /* ---- โหลด user profile ---- */
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await manageAxios.get("/profile");
        setUser(res.data);
      } catch (err) {
        console.error("โหลดข้อมูลผู้ใช้ล้มเหลว:", err);
        toast.error("ไม่สามารถโหลดข้อมูลผู้ใช้");
      }
    };
    fetchUserProfile();
  }, []);

  /* ---- Options ---- */
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
    { value: "all", label: "ทั้งหมด" },
    { value: "today", label: "วันนี้" },
    { value: "1m", label: "1 เดือนที่ผ่านมา" },
    { value: "3m", label: "3 เดือนที่ผ่านมา" },
    { value: "6m", label: "6 เดือนที่ผ่านมา" },
    { value: "9m", label: "9 เดือนที่ผ่านมา" },
    { value: "12m", label: "12 เดือนที่ผ่านมา" },
    { value: "year", label: "ปีนี้" },
    { value: "custom", label: "กำหนดเอง" },
  ];

  /* ---- Helpers ---- */
  const translateCategory = (cat) => ({
    general: "ของใช้ทั่วไป",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์การแพทย์",
    medicine: "ยา",
  }[cat] || "-");

  const translateRequestType = (t) => ({ withdraw: "เบิก", borrow: "ยืม" }[t] || "-");

  const translateApprovalStatus = (s) =>
    ({
      waiting_approval: "รออนุมัติ",
      waiting_approval_detail: "รออนุมัติ",
      approved: "อนุมัติ",
      approved_in_queue: "อนุมัติรอดำเนินการ",
      rejected: "ไม่อนุมัติ",
      partial: "อนุมัติบางส่วน",
    }[s] || "-");

  const translateProcessingStatus = (s) =>
    ({
      pending: "รอจ่าย",
      preparing: "กำลังเตรียม",
      delivering: "กำลังนำส่ง",
      completed: "เสร็จสิ้น",
      rejected: "ปฏิเสธ",
      waiting_approval: "รออนุมัติ",
      approved_in_queue: "อนุมัติรอดำเนินการ",
    }[s] || "-");

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("th-TH", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  /* ---- Fetch ---- */
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      let start = null,
        end = null;
      const today = new Date();
      const opt = dateRange?.value;

      if (opt === "today") {
        start = end = today.toISOString().split("T")[0];
      } else if (opt === "year") {
        start = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0];
        end = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0];
      } else if (["1m", "3m", "6m", "9m", "12m"].includes(opt)) {
        const months = parseInt(opt.replace("m", ""));
        const past = new Date();
        past.setMonth(today.getMonth() - months);
        start = past.toISOString().split("T")[0];
        end = today.toISOString().split("T")[0];
      } else if (opt === "custom") {
        if (!customStart || !customEnd) {
          setLoading(false);
          return;
        }
        start = customStart;
        end = customEnd;
      }

      const params = { type: type?.value || "all", department: department?.value || "all" };
      if (start) {
        params.start = start;
        params.end = end;
      }
      const res = await manageAxios.get("/report/outflow", { params });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching outflow:", err);
      toast.error("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, [type, department, dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(start, start + ITEMS_PER_PAGE);
  }, [data, currentPage]);
  const fillersCount = Math.max(0, ITEMS_PER_PAGE - paginatedItems.length);
  const startDisplay = data.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, data.length);

  /* ---- Render ---- */
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>
            <ClipboardList size={28} /> รายงานการเบิก/ยืม
          </h1>
          <div className={styles.searchCluster}>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportOutflowPDF({
                  data,
                  filters: {
                    typeLabel: type?.label,
                    departmentLabel: department?.label,
                    dateLabel: dateRange?.label,
                    dateValue: dateRange?.value,
                    start: customStart,
                    end: customEnd,
                  },
                  user: user, // ✅ ใช้ user จริง
                })
              }
              disabled={!user}
            >
              <FileDown size={16} /> PDF
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => exportOutflowCSV({ data, filename: "outflow-report.csv" })}
            >
              <FileDown size={16} /> CSV
            </button>
          </div>
        </div>


        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภทคำขอ</label>
              <DynamicSelect options={typeOptions} value={type} onChange={setType} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>แผนก</label>
              <DynamicSelect options={departmentOptions} value={department} onChange={setDepartment} />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ช่วงเวลา</label>
              <DynamicSelect options={dateOptions} value={dateRange} onChange={setDateRange} />
            </div>
            {dateRange?.value === "custom" && (
              <div className={styles.filterGroup}>
                <label className={styles.label}>กำหนดวันที่</label>
                <div className={styles.customDateBox}>
                  <div className={styles.dateField}>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className={styles.dateInput}
                      ref={startDateRef}
                    />
                    <button
                      className={styles.calendarButton}
                      onClick={() => startDateRef.current?.showPicker?.()}
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                  <span className={styles.toLabel}>ถึง</span>
                  <div className={styles.dateField}>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className={styles.dateInput}
                      ref={endDateRef}
                    />
                    <button
                      className={styles.calendarButton}
                      onClick={() => endDateRef.current?.showPicker?.()}
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className={styles.searchCluster}>
            <button className={styles.btnPrimary} onClick={fetchReport}>
              <Search size={16} /> ค้นหา
            </button>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={() => {
                setType(null);
                setDepartment(null);
                setDateRange(null);
                setCustomStart("");
                setCustomEnd("");
              }}
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGridOutflow} ${styles.tableHeader}`}>
            <div>รหัสคำขอ</div>
            <div>วันที่</div>
            <div>ชื่อพัสดุ</div>
            <div>ประเภท</div>
            <div>จำนวนอนุมัติ</div>
            <div>จำนวนจ่ายจริง</div>
            <div>หน่วย</div>
            <div>ประเภทคำขอ</div>
            <div>แผนก</div>
            <div>สถานะอนุมัติ</div>
            <div>สถานะการดำเนินการ</div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>⏳ กำลังโหลด...</div>
          ) : data.length === 0 ? (
            <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
          ) : (
            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.map((item, idx) => (
                <div key={idx} className={`${styles.tableGridOutflow} ${styles.tableRow}`}>
                  <div className={styles.tableCell} title={item.request_code}>
                    {item.request_code}
                  </div>
                  <div className={styles.tableCell} title={formatDate(item.request_date)}>
                    {formatDate(item.request_date)}
                  </div>
                  <div className={`${styles.tableCell} ${styles.cellName}`} title={item.item_name}>
                    {item.item_name}
                  </div>
                  <div className={styles.tableCell} title={translateCategory(item.category)}>
                    {translateCategory(item.category)}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`} title={item.approved_qty}>
                    {item.approved_qty}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`} title={item.issued_qty || "-"}>
                    {item.issued_qty || "-"}
                  </div>
                  <div className={styles.tableCell} title={item.unit}>
                    {item.unit}
                  </div>
                  <div className={styles.tableCell} title={translateRequestType(item.request_type)}>
                    {translateRequestType(item.request_type)}
                  </div>
                  <div className={`${styles.tableCell} ${styles.cellDepartment}`} title={item.department}>
                    {item.department}
                  </div>
                  <div
                    className={`${styles.tableCell} ${styles.cellStatus}`}
                    title={translateApprovalStatus(item.approval_status)}
                  >
                    {translateApprovalStatus(item.approval_status)}
                  </div>
                  <div
                    className={`${styles.tableCell} ${styles.cellStatus}`}
                    title={translateProcessingStatus(item.processing_status)}
                  >
                    {translateProcessingStatus(item.processing_status)}
                  </div>
                </div>
              ))}
              {Array.from({ length: fillersCount }).map((_, i) => (
                <div
                  key={i}
                  className={`${styles.tableGridOutflow} ${styles.tableRow} ${styles.fillerRow}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data.length > 0 && (
          <div className={styles.paginationBar}>
            <div className={styles.paginationInfo}>
              กำลังแสดง {startDisplay}-{endDisplay} จาก {data.length} รายการ
            </div>
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((c) => c - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <li key={p}>
                  <button
                    className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                </li>
              ))}
              <li>
                <button
                  className={styles.pageButton}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((c) => c + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
