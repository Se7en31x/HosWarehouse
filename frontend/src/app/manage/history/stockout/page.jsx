"use client";
import { useEffect, useState, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";

// ── react-select ─────────────────────
const Select = dynamic(() => import("react-select"), { ssr: false });
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },

    minWidth: "260px",   // ✅ ปรับความยาวขั้นต่ำ
    width: "100%",       // ✅ ขยายเต็ม container
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    border: "1px solid #e5e7eb",
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "8px 12px",
  }),
};

// ── Options ──────────────────────────
const categoryOptions = [
  { value: "all", label: "ทุกประเภท" },
  { value: "withdraw", label: "เบิกพัสดุ" },
  { value: "borrow", label: "ยืมออก" },
  { value: "return_damaged", label: "คืนสภาพชำรุด" },
  { value: "damaged_dispose", label: "ทำลายชำรุด" },
  { value: "expired_dispose", label: "ทำลายหมดอายุ" },
  { value: "adjust_out", label: "ปรับปรุงยอดตัดออก" },
  { value: "return_lost", label: "สูญหาย (ตรวจนับ)" },
];

// ── Map ──────────────────────────────
const typeMap = {
  withdraw: "เบิกพัสดุ",
  borrow: "ยืมออก",
  return_damaged: "คืนสภาพชำรุด",
  damaged_dispose: "ทำลายชำรุด",
  expired_dispose: "ทำลายหมดอายุ",
  adjust_out: "ปรับปรุงยอดตัดออก",
  return_lost: "สูญหาย (ตรวจนับ)",
};

export default function StockOutHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState([]);

  // filter
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // pagination
  const ROWS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    axiosInstance
      .get("/history/stockout")
      .then((res) => setRecords(res.data || []))
      .catch((err) => console.error("❌ Error fetching stockout history:", err));
  }, []);

  // ✅ Filter
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesType =
        typeFilter === "all" || r.stockout_type === typeFilter;
      const matchesSearch =
        search === "" ||
        r.stockout_no?.toLowerCase().includes(search.toLowerCase()) ||
        r.user_name?.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [records, typeFilter, search]);

  // ✅ Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / ROWS_PER_PAGE)
  );
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredRecords.slice(start, start + ROWS_PER_PAGE);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setCurrentPage(1);
  };

  // ✅ โหลดรายละเอียดเอกสาร
  const handleShowDetail = async (doc) => {
    setSelected(doc);
    try {
      const res = await axiosInstance.get(
        `/history/stockout/${doc.stockout_id}`
      );
      setDetails(res.data || []);
    } catch (err) {
      console.error("❌ Error fetching stockout detail:", err);
      setDetails([]);
    }
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>📦 ประวัติการตัดออกจากคลัง</h1>
        </div>

        {/* ✅ Filter Bar */}
        <div className={styles.toolbar}>
          {/* ซ้าย: ประเภท */}
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภทเอกสาร</label>
              <Select
                options={categoryOptions}
                isClearable={false}
                isSearchable={false}
                placeholder="เลือกประเภท..."
                styles={customSelectStyles}
                value={categoryOptions.find((o) => o.value === typeFilter)}
                onChange={(opt) => setTypeFilter(opt?.value || "all")}
              />
            </div>
          </div>

          {/* ขวาสุด: ค้นหา + ล้าง */}
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="ค้นหาเลขที่เอกสาร หรือผู้ดำเนินการ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={clearFilters}
              className={`${styles.ghostBtn} ${styles.clearButton}`}
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* ✅ Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div>วันที่</div>
            <div>เลขที่เอกสาร</div>
            <div>ผู้ดำเนินการ</div>
            <div>ประเภท</div>
            <div className={styles.centerCell}>จัดการ</div>
          </div>

          <div
            className={styles.inventory}
            style={{ "--rows-per-page": ROWS_PER_PAGE }}
          >
            {pageRows.length > 0 ? (
              pageRows.map((r) => (
                <div
                  key={r.stockout_id}
                  className={`${styles.tableGrid} ${styles.tableRow}`}
                >
                  <div>
                    {new Date(r.stockout_date).toLocaleDateString("th-TH")}
                  </div>
                  <div>{r.stockout_no || "-"}</div>
                  <div>{r.user_name}</div>
                  <div>{typeMap[r.stockout_type] || "อื่น ๆ"}</div>
                  <div className={styles.centerCell}>
                    <button
                      className={styles.detailButton}
                      onClick={() => handleShowDetail(r)}
                    >
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div
                className={`${styles.tableGrid} ${styles.tableRow} ${styles.noDataRow}`}
              >
                ไม่พบข้อมูล
              </div>
            )}
          </div>

          {/* ✅ Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            {Array.from({ length: totalPages }).map((_, i) => (
              <li key={i}>
                <button
                  className={`${styles.pageButton} ${currentPage === i + 1 ? styles.activePage : ""
                    }`}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
            <li>
              <button
                className={styles.pageButton}
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>

        {/* ✅ Modal */}
        {selected && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h3>📋 รายละเอียดเอกสาร</h3>
                <button
                  className={styles.closeIcon}
                  onClick={() => {
                    setSelected(null);
                    setDetails([]);
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.detailGrid}>
                <div>
                  <b>เลขที่เอกสาร:</b> {selected.stockout_no || "-"}
                </div>
                <div>
                  <b>ตัดออกโดย:</b> {selected.user_name}
                </div>
                <div>
                  <b>ประเภท:</b> {typeMap[selected.stockout_type] || "อื่น ๆ"}
                </div>
                <div>
                  <b>สร้างเมื่อ:</b>{" "}
                  {selected.created_at
                    ? new Date(selected.created_at).toLocaleDateString("th-TH")
                    : "-"}
                </div>
              </div>

              <h4 style={{ marginTop: "1rem" }}>📦 รายการพัสดุ</h4>
              <div className={styles.popupTableWrapper}>
                {/* Header */}
                <div className={`${styles.popupTable} ${styles.popupTableHeader}`}>
                  <div>พัสดุ</div>
                  <div>จำนวน</div>
                  <div>Lot No</div>
                  <div>วันหมดอายุ</div>
                </div>

                {/* แถวข้อมูลจริง */}
                {details.length > 0 ? (
                  details.map((d) => (
                    <div key={d.stockout_detail_id} className={`${styles.popupTable} ${styles.popupTableRow}`}>
                      <div>{d.item_name}</div>
                      <div>{d.qty} {d.unit}</div>
                      <div>{d.lot_no || "-"}</div>
                      <div>{d.exp_date ? new Date(d.exp_date).toLocaleDateString("th-TH") : "-"}</div>
                    </div>
                  ))
                ) : (
                  <div className={`${styles.popupTable} ${styles.popupTableRow} ${styles.noDataRow}`}>
                    ไม่มีข้อมูลรายการพัสดุ
                  </div>
                )}

                {/* ✅ เติมแถวเปล่า */}
                {Array.from({ length: Math.max(0, 5 - details.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className={`${styles.popupTable} ${styles.popupTableRow}`}>
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                    <div>&nbsp;</div>
                  </div>
                ))}
              </div>
            <button
              className={styles.closeBtn}
              onClick={() => {
                setSelected(null);
                setDetails([]);
              }}
            >
              ปิด
            </button>
          </div>
          </div>
        )}
    </div>
    </div >
  );
}
