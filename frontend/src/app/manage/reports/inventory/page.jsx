"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Package, FileDown, Search, Trash2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import { connectSocket, disconnectSocket } from "@/app/utils/socket";
import { toast } from "react-toastify";
import { exportInventoryPDF } from "@/app/components/pdf/templates/inventoryTemplate";
import { exportInventoryCSV } from "@/app/components/Csv/templates/inventoryCSV";
import styles from "./page.module.css";

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
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "var(--tint-100)" : "var(--panel)",
    color: "var(--text)",
    padding: "8px 12px",
    textAlign: "left",
  }),
  placeholder: (base) => ({ ...base, color: "var(--muted)" }),
  singleValue: (base) => ({ ...base, textAlign: "left" }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

export default function InventoryReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(null);
  const [sourceType, setSourceType] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null); // ✅ ใช้แทน mockUser

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const ITEMS_PER_PAGE = 12;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  // ✅ โหลดโปรไฟล์ผู้ใช้จาก backend
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

  const categoryOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "medicine", label: "ยา" },
    { value: "medsup", label: "เวชภัณฑ์" },
    { value: "equipment", label: "ครุภัณฑ์" },
    { value: "meddevice", label: "อุปกรณ์การแพทย์" },
    { value: "general", label: "ของใช้ทั่วไป" },
  ];

  const sourceOptions = [
    { value: "all", label: "ทุกแหล่งที่มา" },
    { value: "purchase", label: "จัดซื้อ" },
    { value: "return", label: "คืนพัสดุ" },
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

  const toISODate = (date) => date.toISOString().split("T")[0];

  const handleCustomStartChange = (e) => {
    const startDate = e.target.value;
    if (customEnd && startDate > customEnd) {
      toast.error("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }
    setCustomStart(startDate);
  };

  const handleCustomEndChange = (e) => {
    const endDate = e.target.value;
    if (customStart && endDate < customStart) {
      toast.error("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
      return;
    }
    setCustomEnd(endDate);
  };

  const openDatePicker = (ref) => {
    if (ref.current) {
      try {
        ref.current.showPicker();
      } catch {
        ref.current.focus();
      }
    }
  };

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (category?.value && category.value !== "all") params.category = category.value;
      if (sourceType?.value && sourceType.value !== "all") params.source = sourceType.value;

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
      } else if (["1m", "3m", "6m", "9m", "12m"].includes(option)) {
        const months = parseInt(option.replace("m", ""));
        start = new Date();
        start.setMonth(today.getMonth() - months);
        end = today;
      } else if (option === "custom" && customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
        if (start > end) {
          toast.error("วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด");
          setLoading(false);
          return;
        }
        params.start_date = customStart;
        params.end_date = customEnd;
      }

      if (start && end && option !== "custom") {
        params.start_date = toISODate(start);
        params.end_date = toISODate(end);
      }

      const res = await manageAxios.get("/report/inventory/summary", { params });
      setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("Error fetching inventory report:", err);
      toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, [category, sourceType, dateRange, customStart, customEnd]);

  useEffect(() => {
    let isMounted = true;
    fetchReport();
    const socket = connectSocket();
    const handleReportUpdate = () => {
      if (isMounted) fetchReport();
    };
    socket.on("inventoryReportUpdated", handleReportUpdate);
    return () => {
      isMounted = false;
      socket.off("inventoryReportUpdated", handleReportUpdate);
      disconnectSocket();
    };
  }, [fetchReport]);

  const filteredData = useMemo(() => {
    return data.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  useEffect(() => {
    setCurrentPage(1);
  }, [category, sourceType, dateRange, customStart, customEnd]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

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

  const clearFilters = () => {
    setCategory(null);
    setSourceType(null);
    setDateRange(null);
    setCustomStart("");
    setCustomEnd("");
    setCurrentPage(1);
  };

  const startDisplay = filteredData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredData.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <Package size={28} />
              รายงานคงคลัง
            </h1>
          </div>
          <div className={styles.searchCluster}>
            <button
              className={styles.btnSecondary}
              onClick={() =>
                exportInventoryPDF({
                  data,
                  filters: {
                    categoryLabel: category?.label,
                    sourceLabel: sourceType?.label,
                    dateLabel: dateRange?.label,
                    dateValue: dateRange?.value,
                    start: customStart,
                    end: customEnd,
                  },
                  user: user, // ✅ ใช้ข้อมูลจริงจาก DB
                })
              }
              disabled={!user}
            >
              <FileDown size={16} style={{ marginRight: "6px" }} /> PDF
            </button>
            <button
              className={styles.btnSecondary}
              onClick={() => exportInventoryCSV({ data, filename: "inventory_report.csv" })}
            >
              <FileDown size={16} style={{ marginRight: "6px" }} /> CSV
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภทพัสดุ</label>
              <DynamicSelect
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกประเภทพัสดุ..."
                styles={customSelectStyles}
                value={category}
                onChange={setCategory}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>แหล่งที่มา</label>
              <DynamicSelect
                options={sourceOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกแหล่งที่มา..."
                styles={customSelectStyles}
                value={sourceType}
                onChange={setSourceType}
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
                onChange={(option) => {
                  setDateRange(option);
                  if (!option || option.value !== "custom") {
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
                    <input
                      type="date"
                      value={customStart}
                      onChange={handleCustomStartChange}
                      className={styles.dateInput}
                      ref={startDateRef}
                    />
                    <button
                      className={styles.calendarButton}
                      onClick={() => openDatePicker(startDateRef)}
                      aria-label="เปิดปฏิทินวันที่เริ่มต้น"
                    >
                      <Calendar size={16} />
                    </button>
                  </div>
                  <span className={styles.toLabel}>ถึง</span>
                  <div className={styles.dateField}>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={handleCustomEndChange}
                      className={styles.dateInput}
                      ref={endDateRef}
                    />
                    <button
                      className={styles.calendarButton}
                      onClick={() => openDatePicker(endDateRef)}
                      aria-label="เปิดปฏิทินวันที่สิ้นสุด"
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
              <Search size={16} style={{ marginRight: "6px" }} /> ค้นหา
            </button>
            <button onClick={clearFilters} className={`${styles.ghostBtn} ${styles.clearButton}`}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGridInventory} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>รหัสพัสดุ</div>
              <div className={styles.headerItem}>ชื่อพัสดุ</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>รับเข้า</div>
              <div className={styles.headerItem}>เบิกออก</div>
              <div className={styles.headerItem}>คงเหลือ</div>
              <div className={styles.headerItem}>มูลค่า (บาท)</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const balance = parseInt(item.balance, 10) || 0;
                  return (
                    <div
                      key={item.code ?? `${item.code}-${index}`}
                      className={`${styles.tableGridInventory} ${styles.tableRow}`}
                    >
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </div>
                      <div className={styles.tableCell}>{item.code || "-"}</div>
                      <div className={styles.tableCell}>{item.name || "-"}</div>
                      <div className={styles.tableCell}>{translateCategory(item.category)}</div>
                      <div className={styles.tableCell}>{item.unit || "-"}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.received || 0}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.issued || 0}
                      </div>
                      <div
                        className={`${styles.tableCell} ${styles.centerCell} ${
                          balance <= 0 ? styles.negativeStock : balance <= 10 ? styles.lowStock : ""
                        }`}
                      >
                        {balance}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {(item.total_value !== undefined
                          ? parseFloat(item.total_value) || 0
                          : balance * (parseFloat(item.unit_cost) || 0)
                        ).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {Array.from({ length: fillersCount }).map((_, i) => (
                <div
                  key={`filler-${i}`}
                  className={`${styles.tableGridInventory} ${styles.tableRow} ${styles.fillerRow}`}
                  aria-hidden="true"
                >
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
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
                    aria-label="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
                  ) : (
                    <li key={`page-${p}`}>
                      <button
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                        onClick={() => setCurrentPage(p)}
                        aria-current={p === currentPage ? "page" : undefined}
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
                    aria-label="หน้าถัดไป"
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
