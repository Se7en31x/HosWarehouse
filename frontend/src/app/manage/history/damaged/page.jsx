"use client";
import { useEffect, useState, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import dynamic from "next/dynamic";

// ── react-select ──────────────────────
const Select = dynamic(() => import("react-select"), { ssr: false });

// ── Options ──────────────────────────
const statusOptions = [
  { value: "all", label: "สถานะทั้งหมด" },
  { value: "waiting", label: "รอดำเนินการ" },
  { value: "sent_repair", label: "ส่งซ่อม" },
  { value: "repaired", label: "ซ่อมเสร็จแล้ว" },
  { value: "discarded", label: "จำหน่ายทิ้ง" },
  { value: "disposed", label: "เลิกใช้งาน" }, // ✅ เพิ่มใหม่
];

const typeOptions = [
  { value: "all", label: "ทุกประเภท" },
  { value: "damaged", label: "ชำรุด" },
  { value: "lost", label: "สูญหาย" },
];

const sourceMap = {
  borrow_return: "คืนจากการยืม",
  stock_check: "ตรวจสต็อก",
};

// ── react-select styles ───────────────
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
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
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

export default function DamagedHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);

  // filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // pagination
  const ROWS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  useEffect(() => {
    axiosInstance
      .get("/history/damaged")
      .then((res) => setRecords(res.data || []))
      .catch((err) =>
        console.error("❌ Error fetching damaged history:", err)
      );
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Filter
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        search === "" ||
        r.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.reported_by?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || r.damaged_status === statusFilter;

      const matchesType =
        typeFilter === "all" || r.damage_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [records, search, statusFilter, typeFilter]);

  // ✅ Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ROWS_PER_PAGE));
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredRecords.slice(start, start + ROWS_PER_PAGE);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setCurrentPage(1);
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>⚠️ ประวัติชำรุด / สูญหาย</h1>
        </div>

        {/* ✅ Filter Bar */}
        <div className={styles.toolbar}>
          {/* ซ้าย: สถานะ + ประเภท */}
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <Select
                options={statusOptions}
                isClearable={false}
                isSearchable={false}
                placeholder="เลือกสถานะ..."
                styles={customSelectStyles}
                value={statusOptions.find((o) => o.value === statusFilter)}
                onChange={(opt) => setStatusFilter(opt?.value || "all")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภท</label>
              <Select
                options={typeOptions}
                isClearable={false}
                isSearchable={false}
                placeholder="เลือกประเภท..."
                styles={customSelectStyles}
                value={typeOptions.find((o) => o.value === typeFilter)}
                onChange={(opt) => setTypeFilter(opt?.value || "all")}
                menuPortalTarget={menuPortalTarget}
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
                placeholder="ค้นหาพัสดุ หรือผู้รายงาน..."
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
            <div>พัสดุ</div>
            <div>จำนวน</div>
            <div>ประเภท</div>
            <div>ที่มา</div>
            <div className={styles.centerCell}>สถานะ</div>
            <div>ผู้รายงาน</div>
            <div className={styles.centerCell}>จัดการ</div>
          </div>

          <div className={styles.inventory} style={{ "--rows-per-page": ROWS_PER_PAGE }}>
            {pageRows.length > 0 ? (
              pageRows.map((r) => (
                <div key={r.damaged_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div>{formatDate(r.damaged_date)}</div>
                  <div>{r.item_name}</div>
                  <div>{r.damaged_qty} {r.item_unit}</div>
                  <div>{typeOptions.find((t) => t.value === r.damage_type)?.label || r.damage_type}</div>
                  <div>{sourceMap[r.source_type] || "-"}</div>
                  <div className={styles.centerCell}>
                    <span className={styles.statusBadge}>
                      {statusOptions.find((s) => s.value === r.damaged_status)?.label || r.damaged_status}
                    </span>
                  </div>
                  <div>{r.reported_by}</div>
                  <div className={styles.centerCell}>
                    <button className={styles.detailButton} onClick={() => setSelected(r)}>
                      ดูรายละเอียด
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={`${styles.tableGrid} ${styles.tableRow} ${styles.noDataRow}`}>
                ไม่พบข้อมูล
              </div>
            )}
          </div>

          {/* ✅ Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button className={styles.pageButton} disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft size={16} />
              </button>
            </li>
            {Array.from({ length: totalPages }).map((_, i) => (
              <li key={i}>
                <button className={`${styles.pageButton} ${currentPage === i + 1 ? styles.activePage : ""}`}
                  onClick={() => setCurrentPage(i + 1)}>
                  {i + 1}
                </button>
              </li>
            ))}
            <li>
              <button className={styles.pageButton} disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
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
                <h3>📋 รายละเอียด</h3>
                <button className={styles.closeIcon} onClick={() => setSelected(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.detailGrid}>
                <div><b>พัสดุ:</b> {selected.item_name} ({selected.damaged_qty} {selected.item_unit})</div>
                <div><b>ประเภท:</b> {typeOptions.find((t) => t.value === selected.damage_type)?.label}</div>
                <div><b>ที่มา:</b> {sourceMap[selected.source_type] || "-"}</div>
                <div><b>สถานะ:</b> {statusOptions.find((s) => s.value === selected.damaged_status)?.label}</div>
                <div><b>รายงานโดย:</b> {selected.reported_by}</div>
                <div><b>หมายเหตุ:</b> {selected.damaged_note || "-"}</div>
              </div>
              {selected.damage_type === "lost" ? (
                <div className={styles.lostNotice}>❌ สูญหาย - ไม่สามารถดำเนินการเพิ่มเติมได้</div>
              ) : (
                <div>📌 (โหลด actions เพิ่มเติม...)</div>
              )}
              <button className={styles.closeBtn} onClick={() => setSelected(null)}>ปิด</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
