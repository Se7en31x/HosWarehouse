"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import Swal from "sweetalert2";
import { manageAxios } from "@/app/utils/axiosInstance";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    fontSize: "0.9rem",
    width: "250px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    border: "1px solid #e5e7eb",
    zIndex: 9000,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "6px 10px",
    fontSize: "0.9rem",
  }),
};

/* mapping */
const stockinTypeMap = {
  purchase: "จัดซื้อ",
  "purchase-extra": "รับเพิ่มเติมจากการสั่งซื้อ",
  general: "รับเข้าทั่วไป",
  return: "คืนพัสดุ",
  repair_return: "คืนจากซ่อม",
  adjustment: "ปรับปรุงยอด",
};

const stockinStatusMap = {
  posted: "บันทึกแล้ว",
  completed: "เสร็จสิ้น",
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  canceled: "ยกเลิก",
};

const TYPE_OPTIONS = [
  { value: "all", label: "ทุกประเภท" },
  ...Object.entries(stockinTypeMap).map(([k, v]) => ({
    value: k,
    label: v,
  })),
];
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  ...Object.entries(stockinStatusMap).map(([k, v]) => ({
    value: k,
    label: v,
  })),
];

/* badge */
const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case "posted":
    case "completed":
      return "stAvailable";
    case "draft":
    case "waiting_approval":
      return "stLow";
    case "canceled":
      return "stOut";
    default:
      return "stHold";
  }
};

// ✅ ฟังก์ชันช่วย render extra info แบบเรียบง่าย
const renderExtraInfo = (row) => {
  switch (row.stockin_type) {
    case "purchase":
    case "purchase-extra":
      return `<p><b>หมายเหตุ GR:</b> ${row.gr_note || "-"}</p>`;
    case "adjustment":
      return `<p><b>เหตุผลการปรับปรุง:</b> ${row.stockin_note || "-"}</p>`;
    default:
      return `<p><b>หมายเหตุ:</b> ${row.stockin_note || "-"}</p>`;
  }
};

export default function ImportHistory() {
  const [data, setData] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const rowsPerPage = 10;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  // ดึงข้อมูล
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const res = await manageAxios.get("/history/stockin");
        if (isMounted) {
          setData(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
        }
      } catch (err) {
        console.error("Error fetching stockin history:", err);
        Swal.fire({
          icon: "error",
          title: "ข้อผิดพลาด",
          text: "ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้",
          confirmButtonColor: "#008dda",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("th-TH", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";

  // filter
  const filtered = useMemo(() => {
    return data.filter((row) => {
      const okType = typeFilter === "all" || row.stockin_type === typeFilter;
      const okStatus =
        statusFilter === "all" || row.stockin_status === statusFilter;
      const okSearch =
        search === "" ||
        row.stockin_no?.toLowerCase().includes(search.toLowerCase()) ||
        row.user_name?.toLowerCase().includes(search.toLowerCase());
      return okType && okStatus && okSearch;
    });
  }, [data, typeFilter, statusFilter, search]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, search]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages
      );
    }
    return pages;
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  // popup detail
  const showDetail = (row) => {
    const detailsHtml = row.details
      ?.map(
        (item, index) => `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px 8px;">${index + 1}</td>
            <td style="padding: 12px 8px;">${item.item_name || "-"}</td>
            <td style="padding: 12px 8px; text-align: right;">
              ${item.qty || 0} ${item.unit || "-"}
            </td>
            <td style="padding: 12px 8px;">${item.lot_no || "-"}</td>
            <td style="padding: 12px 8px;">${item.note || "-"}</td>
          </tr>
        `
      )
      .join("");

    Swal.fire({
      title: `<h2 style="font-size: 1.5rem; color: #1f2937;">รายละเอียดการนำเข้า</h2>`,
      html: `
        <div style="display: grid; grid-template-columns: repeat(2,1fr); gap: 1rem; margin-bottom: 1rem;">
          <p><b>เลขที่เอกสาร:</b> ${row.stockin_no || "-"}</p>
          <p><b>วันที่นำเข้า:</b> ${formatDate(row.stockin_date)}</p>
          <p><b>ประเภท:</b> ${stockinTypeMap[row.stockin_type] || row.stockin_type}</p>
          <p><b>สถานะ:</b> ${stockinStatusMap[row.stockin_status] || row.stockin_status}</p>
          <p><b>ผู้นำเข้า:</b> ${row.user_name || "-"}</p>
          ${renderExtraInfo(row)}
        </div>
        <h3 style="font-size:1.25rem;margin:1rem 0;">รายการพัสดุ</h3>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <thead style="background:#f3f4f6;">
            <tr>
              <th style="padding:8px;text-align:left;">#</th>
              <th style="padding:8px;text-align:left;">ชื่อพัสดุ</th>
              <th style="padding:8px;text-align:right;">จำนวน</th>
              <th style="padding:8px;text-align:left;">Lot</th>
              <th style="padding:8px;text-align:left;">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${
              detailsHtml ||
              `<tr><td colspan="5" style="text-align:center;color:#6b7280;">ไม่พบรายการ</td></tr>`
            }
          </tbody>
        </table>
      `,
      width: "800px",
      confirmButtonColor: "#008dda",
    });
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>ประวัติการนำเข้า</h1>
        </div>

        {/* toolbar */}
        <div className={styles.filterBar}>
          <div className={styles.filterLeft}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภท</label>
              <Select
                isClearable
                isSearchable={false}
                options={TYPE_OPTIONS}
                value={TYPE_OPTIONS.find((o) => o.value === typeFilter) || null}
                onChange={(opt) => setTypeFilter(opt?.value || "all")}
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
                placeholder="เลือกประเภท..."
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <Select
                isClearable
                isSearchable={false}
                options={STATUS_OPTIONS}
                value={
                  STATUS_OPTIONS.find((o) => o.value === statusFilter) || null
                }
                onChange={(opt) => setStatusFilter(opt?.value || "all")}
                styles={customSelectStyles}
                menuPortalTarget={menuPortalTarget}
                placeholder="เลือกสถานะ..."
              />
            </div>
          </div>
          <div className={styles.filterRight}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.input}
                  placeholder="ค้นหาเลขที่เอกสารหรือผู้นำเข้า"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* table */}
        {isLoading ? (
          <div className={styles.loadingContainer}>กำลังโหลด...</div>
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>วันที่</div>
              <div className={styles.headerItem}>เลขที่เอกสาร</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>ผู้นำเข้า</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>
                สถานะ
              </div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>
                ตรวจสอบ
              </div>
            </div>

            <div className={styles.inventory}>
              {paginatedRows.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              ) : (
                paginatedRows.map((row) => (
                  <div
                    key={row.stockin_id}
                    className={`${styles.tableGrid} ${styles.tableRow}`}
                  >
                    <div className={styles.tableCell}>
                      {formatDate(row.stockin_date)}
                    </div>
                    <div className={styles.tableCell}>
                      {row.stockin_no || "-"}
                    </div>
                    <div className={styles.tableCell}>
                      {stockinTypeMap[row.stockin_type] || row.stockin_type}
                    </div>
                    <div className={styles.tableCell}>
                      {row.user_name || "-"}
                    </div>
                    <div
                      className={`${styles.tableCell} ${styles.centerCell}`}
                    >
                      <span
                        className={`${styles.stBadge} ${styles[getStatusBadgeClass(
                          row.stockin_status
                        )]}`}
                      >
                        {stockinStatusMap[row.stockin_status] ||
                          row.stockin_status}
                      </span>
                    </div>
                    <div
                      className={`${styles.tableCell} ${styles.centerCell}`}
                    >
                      <button
                        onClick={() => showDetail(row)}
                        className={styles.actionButton}
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* pagination */}
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
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
                      className={`${styles.pageButton} ${
                        p === currentPage ? styles.activePage : ""
                      }`}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage >= totalPages}
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
