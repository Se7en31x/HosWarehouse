"use client";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import axiosInstance from "../../utils/axiosInstance";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";

import dynamic from "next/dynamic";
const Select = dynamic(() => import("react-select"), { ssr: false });

// ── Options ──────────────────────────────────────────
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

// ── react-select styles ─────────────────────────────
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
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedStorage, setSelectedStorage] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const ITEMS_PER_PAGE = 10;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  // EN → TH map
  const categoryThaiMap = {
    medicine: "ยา",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์ทางการแพทย์",
    general: "ของใช้ทั่วไป",
  };

  // รหัสสินค้า
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

  // ✅ Hybrid REST + Socket
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const res = await axiosInstance.get("/inventoryCheck/all");
        if (isMounted) {
          setAllItems(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
        }
      } catch (err) {
        console.error("❌ โหลด REST ไม่สำเร็จ:", err);
        toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitialData();

    // ── 2. เปิด socket realtime ─────────────────────
    const socket = connectSocket();

    // อัปเดตเฉพาะ record
    socket.on("itemUpdated", (updatedItem) => {
      console.log("📦 itemUpdated ได้รับ:", updatedItem);

      setAllItems((prevItems) => {
        const index = prevItems.findIndex((i) => i.item_id === updatedItem.item_id);
        if (index !== -1) {
          const newItems = [...prevItems];
          newItems[index] = {
            ...newItems[index],
            ...updatedItem,
            total_on_hand_qty: updatedItem.current_stock, // ✅ map ให้ตรง
            item_img: updatedItem.item_img || updatedItem.item_img_url // กันกรณีชื่อไม่ตรง
          };
          return newItems;
        } else {
          return [
            ...prevItems,
            {
              ...updatedItem,
              total_on_hand_qty: updatedItem.current_stock, // ✅ ให้ค่าเริ่มต้นตรง
              item_img: updatedItem.item_img || updatedItem.item_img_url
            }
          ];
        }
      });
    });

    // ── 3. cleanup ─────────────────────
    return () => {
      isMounted = false;
      socket.off("itemUpdated");

      disconnectSocket();
    };
  }, []);

  // คัดกรอง
  const filteredInventory = useMemo(() => {
    const f = searchText.toLowerCase();
    return allItems.filter((item) => {
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
  }, [allItems, selectedCategory, selectedUnit, selectedStorage, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInventory, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedCategory, selectedUnit, selectedStorage]);

  // Pagination
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
      pages.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
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

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            {/* หมวดหมู่ */}
            <div className={styles.filterGroup}>
              <label className={styles.label}>หมวดหมู่</label>
              <Select
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={categoryOptions.find((o) => o.value === selectedCategory) || null}
                onChange={(opt) => setSelectedCategory(opt?.value || "")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            {/* หน่วย */}
            <div className={styles.filterGroup}>
              <label className={styles.label}>หน่วย</label>
              <Select
                options={unitOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหน่วย..."
                styles={customSelectStyles}
                value={unitOptions.find((o) => o.value === selectedUnit) || null}
                onChange={(opt) => setSelectedUnit(opt?.value || "")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            {/* ที่เก็บ */}
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานที่จัดเก็บ</label>
              <Select
                options={storageOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานที่..."
                styles={customSelectStyles}
                value={storageOptions.find((o) => o.value === selectedStorage) || null}
                onChange={(opt) => setSelectedStorage(opt?.value || "")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            {/* ค้นหา */}
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <input
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
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* แสดงสถานะ Loading ก่อนแสดงตาราง */}
        {isLoading ? (
          <div className={styles.loadingContainer}>
            {/* อาจเพิ่ม animation loading ที่นี่ */}
          </div>
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>รหัส</div>
              <div className={styles.headerItem}>รูปภาพ</div>
              <div className={styles.headerItem}>รายการ</div>
              <div className={styles.headerItem}>หมวดหมู่</div>
              <div className={styles.headerItem}>คงเหลือ</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>สถานะ</div>
              <div className={styles.headerItem}>ที่เก็บ</div>
              <div className={styles.headerItem}>อัปเดตล่าสุด</div>
              <div className={styles.headerItem}>ดำเนินการ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <div key={item.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
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
                    <div className={styles.tableCell}>{item.total_on_hand_qty}</div>
                    <div className={styles.tableCell}>{item.item_unit}</div>
                    <div className={styles.tableCell}>พร้อมใช้งาน</div>
                    <div className={styles.tableCell}>{item.item_location}</div>
                    <div className={styles.tableCell}>{formatDateTime(item.created_at)}</div>
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
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}
            </div>

            {/* Pagination */}
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
                  <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
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
        )}
      </div>
    </div>
  );
}