"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Send,
  FileDown,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { exportGeneralOutflowPDF } from "@/app/components/pdf/templates/generalOutflowTemplate";
import { exportGeneralOutflowCSV } from "@/app/components/Csv/templates/generalOutflowCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

export default function GeneralOutflowReport() {
  const [type, setType] = useState(null);
  const [data, setData] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [user, setUser] = useState(null); // ✅ filter by user
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // ✅ ผู้ใช้จริงที่ login
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const ITEMS_PER_PAGE = 12;

  const typeOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "withdraw", label: "ตัดสต็อก" },
    { value: "damaged", label: "ชำรุด" },
    { value: "expired_dispose", label: "หมดอายุ" },
    { value: "borrow", label: "ตัดสต็อกจากการยืม" },
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

  const translateCategory = (cat) => ({
    general: "ของใช้ทั่วไป",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์การแพทย์",
    medicine: "ยา",
  }[cat] || "-");

  const translateOutflowType = (t) => ({
    withdraw: "ตัดสต็อกจากการเบิก",
    damaged: "ชำรุด",
    expired_dispose: "หมดอายุ",
    borrow: "ตัดสต็อกจากการยืม",
  }[t] || "-");

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

  /* ---------- โหลด user profile (จริง) ---------- */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await manageAxios.get("/profile");
        setCurrentUser(res.data);
      } catch (err) {
        console.error("โหลดข้อมูลผู้ใช้ล้มเหลว:", err);
      }
    };
    fetchProfile();
  }, []);

  /* ---------- Fetch Users ---------- */
  const fetchUsers = useCallback(async () => {
    try {
      // ✅ ตรวจสอบให้แน่ใจว่า backend มี route นี้
      const res = await manageAxios.get("/user/all");
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

      const opt = dateRange?.value;
      if (opt === "today") {
        start = now.toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
      } else if (opt === "year") {
        start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        end = new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0];
      } else if (["1m", "3m", "6m", "9m", "12m"].includes(opt)) {
        const months = parseInt(opt.replace("m", ""));
        const past = new Date();
        past.setMonth(now.getMonth() - months);
        start = past.toISOString().split("T")[0];
        end = now.toISOString().split("T")[0];
      } else if (opt === "custom") {
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

  /* ---------- Pagination ---------- */
  const filteredData = useMemo(() => data, [data]);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredData.length && setCurrentPage((c) => c + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  const startDisplay = filteredData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredData.length);

  const clearFilters = () => {
    setType(null);
    setDateRange(null);
    setUser(null);
    setCustomStart("");
    setCustomEnd("");
    setCurrentPage(1);
  };

  /* ---------- Render ---------- */
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <Send size={28} color="#f97316" />
              รายงานการนำออก
            </h1>
          </div>
          <div className={styles.searchCluster}>
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
                  user: currentUser, // ✅ ใช้ผู้ใช้จริง
                })
              }
              disabled={!currentUser}
            >
              <FileDown size={16} /> PDF
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
              <FileDown size={16} /> CSV
            </button>
          </div>
        </div>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภทการนำออก</label>
              <DynamicSelect
                options={typeOptions}
                isClearable
                value={type}
                onChange={setType}
                placeholder="เลือกประเภท..."
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>ช่วงเวลา</label>
              <DynamicSelect
                options={dateOptions}
                isClearable
                value={dateRange}
                onChange={setDateRange}
                placeholder="เลือกช่วงเวลา..."
              />
            </div>

            {dateRange?.value === "custom" && (
              <div className={styles.filterGroup}>
                <label className={styles.label}>กำหนดวันที่</label>
                <div className={styles.customDateBox}>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className={styles.dateInput}
                    ref={startDateRef}
                  />
                  <span className={styles.toLabel}>ถึง</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className={styles.dateInput}
                    ref={endDateRef}
                  />
                </div>
              </div>
            )}

            {users.length > 0 && (
              <div className={styles.filterGroup}>
                <label className={styles.label}>ผู้ทำรายการ</label>
                <DynamicSelect
                  options={users}
                  isClearable
                  value={user}
                  onChange={setUser}
                  placeholder="เลือกผู้ใช้..."
                />
              </div>
            )}
          </div>

          <div className={styles.searchCluster}>
            <button className={styles.btnPrimary} onClick={fetchReport}>
              <Search size={16} /> ค้นหา
            </button>
            <button onClick={clearFilters} className={`${styles.ghostBtn} ${styles.clearButton}`}>
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingContainer}>⏳ กำลังโหลดข้อมูล...</div>
        ) : filteredData.length === 0 ? (
          <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGridOutflow} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>เลขที่เอกสาร</div>
              <div className={styles.headerItem}>วันที่</div>
              <div className={styles.headerItem}>ประเภทการนำออก</div>
              <div className={styles.headerItem}>ชื่อพัสดุ</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>Lot No</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>จำนวน</div> {/* ✅ ตรงกลาง */}
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>ผู้ทำรายการ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.map((item, index) => (
                <div key={index} className={`${styles.tableGridOutflow} ${styles.tableRow}`}>
                  <div className={styles.tableCell}>{item.doc_no}</div>
                  <div className={styles.tableCell}>{formatDate(item.doc_date)}</div>
                  <div className={styles.tableCell}>{translateOutflowType(item.outflow_type)}</div>
                  <div className={styles.tableCell}>{item.item_name}</div>
                  <div className={styles.tableCell}>{translateCategory(item.category)}</div>
                  <div className={styles.tableCell}>{item.lot_no || "-"}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.qty}</div> {/* ✅ ตรงกลาง */}
                  <div className={styles.tableCell}>{item.unit}</div>
                  <div className={styles.tableCell}>{item.user_name || "-"}</div>
                </div>
              ))}

              {Array.from({ length: fillersCount }).map((_, i) => (
                <div
                  key={`filler-${i}`}
                  className={`${styles.tableGridOutflow} ${styles.tableRow} ${styles.fillerRow}`}
                >
                  {Array.from({ length: 9 }).map((__, c) => (
                    <div
                      key={c}
                      className={`${styles.tableCell} ${c === 6 ? styles.centerCell : ""}`}  // ✅ filler ตรงกลางเฉพาะคอลัมน์จำนวน
                    >
                      &nbsp;
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredData.length} รายการ
              </div>
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <li key={`ellipsis-${idx}`} className={styles.ellipsis}>
                      …
                    </li>
                  ) : (
                    <li key={`page-${p}`}>
                      <button
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    </li>
                  )
                )}
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
