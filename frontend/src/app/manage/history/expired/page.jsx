"use client";
import { useEffect, useState, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* react-select styles */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.3rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

/* Map สถานะ */
const statusMap = {
  pending: "รอดำเนินการ",
  partial: "ทำลายบางส่วนแล้ว",
  done: "ทำลายครบแล้ว",
};
const STATUS_OPTIONS = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "pending", label: "รอดำเนินการ" },
  { value: "partial", label: "ทำลายบางส่วนแล้ว" },
  { value: "done", label: "ทำลายครบแล้ว" },
];

export default function ExpiredHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);

  // ฟิลเตอร์
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Pagination
  const rowsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/expired");
        setRecords(res.data || []);
      } catch (err) {
        console.error("Error fetching expired history:", err);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString("th-TH") : "-";

  const getStatusKey = (expiredQty, disposedQty) => {
    const remaining = (expiredQty || 0) - (disposedQty || 0);
    if (remaining <= 0) return "done";
    if (disposedQty > 0) return "partial";
    return "pending";
  };

  // ✅ Filtered data
  const filteredData = useMemo(() => {
    return records.filter((r) => {
      const statusKey = getStatusKey(r.expired_qty, r.disposed_qty);
      const okStatus = statusFilter === "all" || statusKey === statusFilter;
      const okSearch =
        search === "" ||
        r.lot_no?.toLowerCase().includes(search.toLowerCase()) ||
        r.item_name?.toLowerCase().includes(search.toLowerCase());
      return okStatus && okSearch;
    });
  }, [records, statusFilter, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const start = (currentPage - 1) * rowsPerPage;
  const pageRows = filteredData.slice(start, start + rowsPerPage);

  const clearFilters = () => {
    setStatusFilter("all");
    setSearch("");
    setCurrentPage(1);
  };

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>⏳ ประวัติของหมดอายุ (Expired)</h1>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>สถานะ</label>
            <Select
              isClearable
              isSearchable={false}
              options={STATUS_OPTIONS}
              value={STATUS_OPTIONS.find((o) => o.value === statusFilter) || null}
              onChange={(opt) => setStatusFilter(opt?.value || "all")}
              styles={customSelectStyles}
              menuPortalTarget={
                typeof window !== "undefined" ? document.body : undefined
              }
            />
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.input}
                placeholder="ค้นหา Lot No หรือชื่อพัสดุ"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
            >
              <Trash2 size={16} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div>วันที่บันทึก</div>
            <div>Lot No</div>
            <div>พัสดุ</div>
            <div>รับเข้า</div>
            <div>หมดอายุ</div>
            <div>วันหมดอายุ</div>
            <div className={styles.centerCell}>สถานะ</div>
            <div className={styles.centerCell}>จัดการ</div>
          </div>

          <div className={styles.inventory}>
            {pageRows.length === 0 ? (
              <div className={`${styles.tableGrid} ${styles.tableRow} ${styles.noDataRow}`}>
                ✅ ยังไม่มีประวัติของหมดอายุ
              </div>
            ) : (
              pageRows.map((r) => {
                const statusKey = getStatusKey(r.expired_qty, r.disposed_qty);
                return (
                  <div key={r.expired_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div>{formatDate(r.expired_date)}</div>
                    <div>{r.lot_no}</div>
                    <div>{r.item_name}</div>
                    <div>{r.qty_imported} {r.item_unit}</div>
                    <div>{r.expired_qty} {r.item_unit}</div>
                    <div className={styles.expiredDate}>{formatDate(r.exp_date)}</div>
                    <div className={styles.centerCell}>
                      <span className={`${styles.statusBadge} ${styles[statusKey]}`}>
                        {statusMap[statusKey]}
                      </span>
                    </div>
                    <div className={styles.centerCell}>
                      <button className={styles.detailButton} onClick={() => setSelected(r)}>
                        ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            {Array.from({ length: totalPages }).map((_, i) => (
              <li key={i}>
                <button
                  className={`${styles.pageButton} ${
                    currentPage === i + 1 ? styles.activePage : ""
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>📋 รายละเอียดพัสดุที่หมดอายุ</h3>
            <div className={styles.detailGrid}>
              <div><b>Lot No:</b> {selected.lot_no}</div>
              <div><b>พัสดุ:</b> {selected.item_name}</div>
              <div><b>จำนวนรับเข้า:</b> {selected.qty_imported} {selected.item_unit}</div>
              <div><b>จำนวนหมดอายุ:</b> {selected.expired_qty} {selected.item_unit}</div>
              <div><b>ทำลายแล้ว:</b> {selected.disposed_qty || 0} {selected.item_unit}</div>
              <div><b>คงเหลือ:</b> {(selected.expired_qty || 0) - (selected.disposed_qty || 0)} {selected.item_unit}</div>
              <div><b>วันหมดอายุ:</b> {formatDate(selected.exp_date)}</div>
              <div><b>รายงานโดย:</b> {selected.user_name || "ระบบ"}</div>
              <div><b>จัดการโดย:</b> {selected.last_disposed_by || "ยังไม่มีข้อมูล"}</div>
              {selected.note && <div className={styles.note}><b>หมายเหตุ:</b> {selected.note}</div>}
            </div>
            <button className={styles.closeBtn} onClick={() => setSelected(null)}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}
