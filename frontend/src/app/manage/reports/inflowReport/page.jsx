"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { ClipboardList, FileDown, Search, Trash2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import { toast } from "react-toastify";
import styles from "./page.module.css";
import { exportInflowPDF } from "@/app/components/pdf/templates/inflowTemplate";
import { exportInflowCSV } from "@/app/components/Csv/templates/inflowCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "var(--accent)" : "var(--border)",
    boxShadow: "none",
    "&:hover": { borderColor: "var(--accent)" },
    width: "200px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    boxShadow: "none",
    border: "1px solid var(--border)",
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
};

export default function InflowReport() {
  const [type, setType] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 12;
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const menuPortalTarget = useMemo(() => (typeof window !== "undefined" ? document.body : null), []);

  const mockUser = {
    user_id: 1,
    user_fname: "วัชรพล",
    user_lname: "อินทร์ทอง",
    user_role: "เจ้าหน้าที่คลัง",
    department: "คลังกลาง",
  };

  const typeOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "general", label: "รับเข้าทั่วไป" },
    { value: "purchase", label: "รับเข้าจากการสั่งซื้อ" },
    { value: "return", label: "คืนพัสดุ" },
    { value: "repair_return", label: "คืนจากซ่อม" },
    { value: "adjustment", label: "ปรับปรุงยอด" },
  ];

  const dateOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "today", label: "วันนี้" },
    { value: "1m", label: "1 เดือนที่ผ่านมา" },
    { value: "3m", label: "3 เดือนที่ผ่านมา" },
    { value: "6m", label: "6 เดือนที่ผ่านมา" },
    { value: "9m", label: "9 เดือนที่ผ่านมา" },
    { value: "12m", label: "12 เดือนที่ผ่านมา" },
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

  const translateInflowType = (type) => {
    const map = {
      general: "รับเข้าทั่วไป",
      purchase: "รับเข้าจากการสั่งซื้อ",
      return: "คืนพัสดุ",
      repair_return: "คืนจากซ่อม",
      adjustment: "ปรับปรุงยอด",
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

  const toISODate = (date) => date.toISOString().split("T")[0];

  const handleCustomStartChange = (e) => {
    const val = e.target.value;
    if (customEnd && val > customEnd) {
      toast.error("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }
    setCustomStart(val);
  };
  const handleCustomEndChange = (e) => {
    const val = e.target.value;
    if (customStart && val < customStart) {
      toast.error("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
      return;
    }
    setCustomEnd(val);
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (type?.value && type.value !== "all") params.type = type.value;

      const today = new Date();
      let start = null,
        end = null;
      const option = dateRange?.value;

      if (option === "today") {
        start = toISODate(today);
        end = toISODate(today);
      } else if (["1m", "3m", "6m", "9m", "12m"].includes(option)) {
        const months = parseInt(option);
        start = new Date();
        start.setMonth(today.getMonth() - months);
        params.start = toISODate(start);
        params.end = toISODate(today);
      } else if (option === "custom" && customStart && customEnd) {
        params.start = customStart;
        params.end = customEnd;
      }

      const res = await manageAxios.get("/report/inflow", { params });
      setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("Error fetching inflow report:", err);
      toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, [type, dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const filteredData = useMemo(() => data.sort((a, b) => new Date(b.doc_date) - new Date(a.doc_date)), [data]);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - paginatedItems.length);

  const startDisplay = filteredData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredData.length);

  const clearFilters = () => {
    setType(null);
    setDateRange(null);
    setCustomStart("");
    setCustomEnd("");
    setCurrentPage(1);
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Page Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <ClipboardList size={28} /> รายงานการรับเข้า
            </h1>
          </div>
          <div className={styles.searchCluster}>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportInflowPDF({
                  data,
                  filters: {
                    typeLabel: type?.label,
                    dateValue: dateRange?.value,
                    start: customStart,
                    end: customEnd,
                  },
                  user: mockUser,
                })
              }
            >
              <FileDown size={16} style={{ marginRight: "6px" }} /> PDF
            </button>
            <button className={styles.btnSecondary} onClick={() => exportInflowCSV({ data })}>
              <FileDown size={16} style={{ marginRight: "6px" }} /> CSV
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภทการรับเข้า</label>
              <DynamicSelect
                options={typeOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกประเภท..."
                styles={customSelectStyles}
                value={type}
                onChange={setType}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ช่วงเวลา</label>
              <DynamicSelect
                options={dateOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกช่วงเวลา..."
                styles={customSelectStyles}
                value={dateRange}
                onChange={(opt) => {
                  setDateRange(opt);
                  if (!opt || opt.value !== "custom") {
                    setCustomStart("");
                    setCustomEnd("");
                  }
                }}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            {dateRange?.value === "custom" && (
              <div className={styles.filterGroup}>
                <label className={styles.label}>กำหนดวันที่</label>
                <div className={styles.customDateBox}>
                  <div className={styles.dateField}>
                    <input type="date" value={customStart} onChange={handleCustomStartChange} className={styles.dateInput} ref={startDateRef} />
                    <button className={styles.calendarButton} onClick={() => startDateRef.current?.showPicker?.()}>
                      <Calendar size={16} />
                    </button>
                  </div>
                  <span className={styles.toLabel}>ถึง</span>
                  <div className={styles.dateField}>
                    <input type="date" value={customEnd} onChange={handleCustomEndChange} className={styles.dateInput} ref={endDateRef} />
                    <button className={styles.calendarButton} onClick={() => endDateRef.current?.showPicker?.()}>
                      <Calendar size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className={styles.searchCluster}>
            <button className={styles.btnPrimary} onClick={fetchReport}>
              <Search size={16} style={{ marginRight: "6px" }} /> ค้นหา
            </button>
            <button className={`${styles.ghostBtn} ${styles.clearButton}`} onClick={clearFilters}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGridInventory} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>เลขที่เอกสาร</div>
              <div className={styles.headerItem}>วันที่</div>
              <div className={styles.headerItem}>ประเภทการรับเข้า</div>
              <div className={styles.headerItem}>ชื่อพัสดุ</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>Lot No</div>
              <div className={styles.headerItem}>จำนวน</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>ผู้ขาย/ซัพพลายเออร์</div>
              <div className={styles.headerItem}>ผู้ทำรายการ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, idx) => (
                  <div key={idx} className={`${styles.tableGridInventory} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{item.doc_no}</div>
                    <div className={styles.tableCell}>{formatDate(item.doc_date)}</div>
                    <div className={styles.tableCell}>{translateInflowType(item.inflow_type)}</div>
                    <div className={styles.tableCell}>{item.item_name}</div>
                    <div className={styles.tableCell}>{translateCategory(item.category)}</div>
                    <div className={styles.tableCell}>{item.lot_no || "-"}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.qty}</div>
                    <div className={styles.tableCell}>{item.unit}</div>
                    <div className={styles.tableCell}>{item.supplier_name || "-"}</div>
                    <div className={styles.tableCell}>{item.user_name || "-"}</div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {Array.from({ length: fillersCount }).map((_, i) => (
                <div
                  key={`filler-${i}`}
                  className={`${styles.tableGridInventory} ${styles.tableRow} ${styles.fillerRow}`}
                  aria-hidden="true"
                >
                  {Array.from({ length: 10 }).map((__, j) => (
                    <div key={j} className={styles.tableCell}>&nbsp;</div>
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
                  <button className={styles.pageButton} disabled={currentPage === 1} onClick={() => setCurrentPage((c) => c - 1)}>
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
          </div>
        )}
      </div>
    </div>
  );
}
