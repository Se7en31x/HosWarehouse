"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";
import Select from "react-select";

// ── Options (ข้อมูลเดิม) ──────────────────────────────────────────
const categoryOptions = [
  { value: "ยา", label: "ยา" },
  { value: "เวชภัณฑ์", label: "เวชภัณฑ์" },
  { value: "ครุภัณฑ์", label: "ครุภัณฑ์" },
  { value: "อุปกรณ์ทางการแพทย์", label: "อุปกรณ์ทางการแพทย์" },
  { value: "ของใช้ทั่วไป", label: "ของใช้ทั่วไป" },
];
const unitOptions = [
  { value: "ขวด", label: "ขวด" },
  { value: "แผง", label: "แผง" },
  { value: "ชุด", label: "ชุด" },
  { value: "ชิ้น", label: "ชิ้น" },
  { value: "กล่อง", label: "กล่อง" },
  { value: "ห่อ", label: "ห่อ" },
];
const storageOptions = [
  { value: "ห้องเก็บยา", label: "ห้องเก็บยา" },
  { value: "คลังสินค้า", label: "คลังสินค้า" },
  { value: "ห้องเวชภัณฑ์", label: "ห้องเวชภัณฑ์" },
];

// ── react-select styles (layer เหมือนต้นแบบ) ─────────────────────
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

export default function InventoryCheck() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(""); // เก็บเป็น "ไทย"
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedStorage, setSelectedStorage] = useState("");
  const [allInventoryItems, setAllInventoryItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  // แผนที่ EN -> TH (ข้อมูลเดิม)
  const categoryThaiMap = {
    medicine: "ยา",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์ทางการแพทย์",
    general: "ของใช้ทั่วไป",
  };

  // ดึงรหัสสินค้า ตามหมวด (ข้อมูลเดิม)
  const getItemCode = (item) => {
    switch (item.item_category?.toLowerCase()) {
      case "medicine":
        return item.med_code || "-";
      case "medsup":
        return item.medsup_code || "-";
      case "equipment":
        return item.equip_code || "-";
      case "meddevice":
        return item.meddevice_code || "-";
      case "general":
        return item.gen_code || "-";
      default:
        return "-";
    }
  };

  // โหลดข้อมูลผ่าน socket (ข้อมูลเดิม)
  useEffect(() => {
    const socket = connectSocket();
    socket.emit("requestInventoryData");
    socket.on("itemsData", (items) => {
      setAllInventoryItems(Array.isArray(items) ? items.filter(Boolean) : []);
    });
    return () => disconnectSocket();
  }, []);

  // คัดกรอง (ข้อมูลเดิม)
  const filteredInventory = useMemo(() => {
    const f = searchText.toLowerCase();
    return allInventoryItems.filter((item) => {
      const itemThaiCategory =
        categoryThaiMap[item.item_category?.toLowerCase()] || item.item_category;
      const matchCategory = selectedCategory ? itemThaiCategory === selectedCategory : true;
      const matchUnit = selectedUnit ? item.item_unit === selectedUnit : true;
      const matchStorage = selectedStorage ? item.item_location === selectedStorage : true;
      const matchSearchText = searchText
        ? (item.item_name || "").toLowerCase().includes(f) ||
          (getItemCode(item) || "").toLowerCase().includes(f)
        : true;
      return matchCategory && matchUnit && matchStorage && matchSearchText;
    });
  }, [allInventoryItems, selectedCategory, selectedUnit, selectedStorage, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInventory, currentPage]);

  // รีเซ็ตหน้าเมื่อกรอง/ค้นหาเปลี่ยน (ข้อมูลเดิม)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedCategory, selectedUnit, selectedStorage]);

  // เพจจิเนชัน (ข้อมูลเดิม)
  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredInventory.length && setCurrentPage((c) => c + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  const clearFilters = () => {
    setSearchText("");
    setSelectedCategory("");
    setSelectedUnit("");
    setSelectedStorage("");
    setCurrentPage(1);
  };

  const formatDateTime = (d) => {
    try {
      return d
        ? new Date(d).toLocaleString("th-TH", {
            timeZone: "Asia/Bangkok",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-";
    } catch {
      return "-";
    }
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>ตรวจสอบยอดคงคลัง</h1>
          </div>
        </div>

        {/* Filters (UI ตามต้นแบบ) */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="category">หมวดหมู่</label>
              <Select
                inputId="category"
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={categoryOptions.find((o) => o.value === selectedCategory) || null}
                onChange={(opt) => setSelectedCategory(opt?.value || "")}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="unit">หน่วย</label>
              <Select
                inputId="unit"
                options={unitOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหน่วย..."
                styles={customSelectStyles}
                value={unitOptions.find((o) => o.value === selectedUnit) || null}
                onChange={(opt) => setSelectedUnit(opt?.value || "")}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="storage">สถานที่จัดเก็บ</label>
              <Select
                inputId="storage"
                options={storageOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานที่จัดเก็บ..."
                styles={customSelectStyles}
                value={storageOptions.find((o) => o.value === selectedStorage) || null}
                onChange={(opt) => setSelectedStorage(opt?.value || "")}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="filter">ค้นหา</label>
              <input
                id="filter"
                className={styles.input}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ค้นหาด้วยรายการ หรือรหัส..."
              />
            </div>
          </div>

          <div className={styles.searchCluster}>
            <button
              onClick={clearFilters}
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              aria-label="ล้างตัวกรอง"
              title="ล้างตัวกรอง"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          {/* Header */}
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>ลำดับ</div>
            <div className={styles.headerItem}>รหัส</div>
            <div className={styles.headerItem}>รูปภาพ</div>
            <div className={styles.headerItem}>รายการ</div>
            <div className={styles.headerItem}>หมวดหมู่</div>
            <div className={styles.headerItem}>คงเหลือ</div>
            <div className={styles.headerItem}>หน่วย</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={styles.headerItem}>สถานที่จัดเก็บ</div>
            <div className={styles.headerItem}>อัปเดตล่าสุด</div>
            <div className={styles.headerItem}>ดำเนินการ</div>
          </div>

          {/* Rows */}
          <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item, index) => (
                <div key={item.item_id || index} className={`${styles.tableGrid} ${styles.tableRow}`}>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  </div>
                  <div className={styles.tableCell}>{getItemCode(item)}</div>
                  <div className={`${styles.tableCell} ${styles.imageCell}`}>
                    <img
                      src={
                        item.item_img
                          ? `http://localhost:5000/uploads/${item.item_img}`
                          : "http://localhost:5000/public/defaults/landscape.png"
                      }
                      alt={item.item_name}
                    />
                  </div>
                  <div className={styles.tableCell} title={item.item_name}>{item.item_name}</div>
                  <div className={styles.tableCell}>
                    {categoryThaiMap[item.item_category?.toLowerCase()] || item.item_category}
                  </div>
                  <div className={styles.tableCell}>{item.item_qty}</div>
                  <div className={styles.tableCell}>{item.item_unit}</div>
                  <div className={styles.tableCell}>พร้อมใช้งาน</div>
                  <div className={styles.tableCell}>{item.item_location}</div>
                  <div className={styles.tableCell}>{formatDateTime(item.item_update)}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <Link
                      href={`/manage/inventoryCheck/${item.item_id}/inventoryDetail`}
                      className={styles.actionButton}
                      title="ตรวจสอบ"
                    >
                      <Search size={18} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noDataMessage}>ไม่พบข้อมูลตามเงื่อนไข</div>
            )}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls} role="navigation" aria-label="เปลี่ยนหน้า">
            <li>
              <button
                className={styles.pageButton}
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                aria-label="หน้าก่อนหน้า"
                title="หน้าก่อนหน้า"
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
                title="หน้าถัดไป"
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}