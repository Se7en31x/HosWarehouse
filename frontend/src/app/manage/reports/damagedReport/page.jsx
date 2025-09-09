"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { ClipboardCheck, FileDown, Search, Trash2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { manageAxios } from "@/app/utils/axiosInstance";
import { connectSocket, disconnectSocket } from "@/app/utils/socket";
import { toast } from "react-toastify";
import styles from "./page.module.css";
import { exportDamagedPDF } from "@/app/components/pdf/templates/damagedTemplate";
import { exportDamagedCSV } from "@/app/components/Csv/templates/damagedCSV";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    width: "200px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    boxShadow: "none",
    border: "1px solid #e5e7eb",
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "8px 12px",
    textAlign: "left",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  singleValue: (base) => ({ ...base, textAlign: "left" }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

export default function DamagedReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemCategory, setItemCategory] = useState(null);
  const [damageType, setDamageType] = useState(null);
  const [manageStatus, setManageStatus] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const ITEMS_PER_PAGE = 12;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

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
        return { text: "ยังไม่จัดการ", class: "stOut" };
      case "managed":
        return { text: "จัดการแล้ว", class: "stAvailable" };
      case "partially_managed":
        return { text: "จัดการบางส่วน", class: "stLow" };
      default:
        return { text: "-", class: "stHold" };
    }
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

      const res = await manageAxios.get("/report/damaged", { params });
      setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      console.error("Error fetching damaged report:", err);
      toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  }, [itemCategory, damageType, manageStatus, dateRange, customStart, customEnd]);

  useEffect(() => {
    let isMounted = true;

    fetchReport();

    const socket = connectSocket();

    const handleReportUpdate = () => {
      if (isMounted) fetchReport();
    };

    socket.on("damagedReportUpdated", handleReportUpdate);

    return () => {
      isMounted = false;
      socket.off("damagedReportUpdated", handleReportUpdate);
      disconnectSocket();
    };
  }, [fetchReport]);

  const filteredData = useMemo(() => {
    return data.sort((a, b) => {
      const dateA = new Date(a.damaged_date || 0);
      const dateB = new Date(b.damaged_date || 0);
      return dateB - dateA;
    });
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  useEffect(() => {
    setCurrentPage(1);
  }, [itemCategory, damageType, manageStatus, dateRange, customStart, customEnd]);

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
    setItemCategory(null);
    setDamageType(null);
    setManageStatus(null);
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
              <ClipboardCheck size={28} />
              รายงานพัสดุชำรุด/เสียหาย
            </h1>
          </div>
          <div className={styles.searchCluster}>
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
                value={itemCategory}
                onChange={setItemCategory}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ความเสียหาย</label>
              <DynamicSelect
                options={damageTypeOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกความเสียหาย..."
                styles={customSelectStyles}
                value={damageType}
                onChange={setDamageType}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <DynamicSelect
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานะ..."
                styles={customSelectStyles}
                value={manageStatus}
                onChange={setManageStatus}
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
            <div className={`${styles.tableGridDamaged} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>ชื่อพัสดุ</div>
              <div className={styles.headerItem}>รหัสพัสดุ</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>Lot No.</div>
              <div className={styles.headerItem}>วันรายงาน</div>
              <div className={styles.headerItem}>ผู้รายงาน</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>จำนวน</div>
              <div className={styles.headerItem}>จัดการแล้ว</div>
              <div className={styles.headerItem}>คงเหลือ</div>
              <div className={styles.headerItem}>สถานะ</div>
            </div>

            <div
              className={styles.inventory}
              style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}
            >
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const status = translateManageStatus(item.manage_status);
                  return (
                    <div
                      key={item.item_id ?? `${item.item_code}-${index}`}
                      className={`${styles.tableGridDamaged} ${styles.tableRow}`}
                    >
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </div>
                      <div className={styles.tableCell} title={item.item_name}>
                        {item.item_name || "-"}
                      </div>
                      <div className={styles.tableCell}>{item.item_code || "-"}</div>
                      <div className={styles.tableCell}>
                        {translateCategory(item.category)}
                      </div>
                      <div className={styles.tableCell}>{item.lot_no || "-"}</div>
                      <div className={styles.tableCell}>{formatDate(item.damaged_date)}</div>
                      <div className={styles.tableCell}>{item.reported_by || "-"}</div>
                      <div className={styles.tableCell}>
                        {translateDamageType(item.damage_type)}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.damaged_qty || 0}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.managed_qty || 0}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.remaining_qty || 0}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <span className={`${styles.stBadge} ${styles[status.class]}`}>
                          {status.text}
                        </span>
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
                  className={`${styles.tableGridDamaged} ${styles.tableRow} ${styles.fillerRow}`}
                  aria-hidden="true"
                >
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
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