'use client';
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { connectSocket, disconnectSocket } from "../../utils/socket";
import { manageAxios } from "../../utils/axiosInstance";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2, Search, PackageCheck } from "lucide-react";
import { toast } from "react-toastify";

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

// ── react-select styles ─────────────────────────────
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    width: "250px",
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

const getStockStatus = (item) => {
  const qty = Number(item?.total_on_hand_qty ?? 0);
  const reorder = Number(item?.reorder_point ?? item?.min_qty ?? item?.reorder_level ?? 0);
  const safety = Number(item?.safety_stock ?? item?.safety_qty ?? 0);
  const stText = (item?.item_status || '').toLowerCase();

  if (stText === 'inactive' || stText === 'hold' || stText === 'พักใช้งาน') {
    return { text: 'พักใช้งาน', class: 'stHold' };
  }

  if (qty <= 0) return { text: 'หมดสต็อก', class: 'stOut' };
  if (reorder > 0 && qty <= reorder) return { text: 'ใกล้หมด', class: 'stLow' };
  if (safety > 0 && qty <= safety) return { text: 'ควรเติม', class: 'stLow' };

  return { text: 'พร้อมใช้งาน', class: 'stAvailable' };
};

export default function InventoryCheck() {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const ITEMS_PER_PAGE = 12; // ⬅️ ล็อค 12 แถวเสมอ

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  const categoryThaiMap = {
    medicine: "ยา",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์ทางการแพทย์",
    general: "ของใช้ทั่วไป",
  };

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

  // -------------------- ✅ โหลด+subscribe แบบ real-time --------------------
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const res = await manageAxios.get("/inventoryCheck/all");
        if (isMounted) {
          setAllItems(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("❌ โหลดข้อมูลเริ่มต้นไม่สำเร็จ:", err);
        toast.error("ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitialData();

    const socket = connectSocket();

    const handleItemUpdate = () => {
      if (isMounted) fetchInitialData();
    };

    socket.on("itemAdded", handleItemUpdate);
    socket.on("itemUpdated", handleItemUpdate);
    socket.on("itemLotUpdated", handleItemUpdate);
    socket.on("itemDeleted", handleItemUpdate);

    return () => {
      isMounted = false;
      socket.off("itemAdded", handleItemUpdate);
      socket.off("itemUpdated", handleItemUpdate);
      socket.off("itemLotUpdated", handleItemUpdate);
      socket.off("itemDeleted", handleItemUpdate);
      disconnectSocket();
    };
  }, []);
  // -----------------------------------------------------------------------

  const filteredInventory = useMemo(() => {
    const f = searchText.toLowerCase();
    let items = allItems.filter((item) => {
      const itemThaiCategory =
        categoryThaiMap[item.item_category?.toLowerCase()] || item.item_category;
      const matchCategory = selectedCategory ? itemThaiCategory === selectedCategory : true;
      const matchUnit = selectedUnit ? item.item_unit === selectedUnit : true;
      const matchSearchText = searchText
        ? (item.item_name || "").toLowerCase().includes(f) ||
          (getItemCode(item) || "").toLowerCase().includes(f)
        : true;
      return matchCategory && matchUnit && matchSearchText;
    });

    items.sort((a, b) => {
      const qtyA = Number(a?.total_on_hand_qty ?? 0);
      const qtyB = Number(b?.total_on_hand_qty ?? 0);

      if (qtyA === 0 && qtyB !== 0) return -1;
      if (qtyB === 0 && qtyA !== 0) return 1;

      if (qtyA !== qtyB) return qtyA - qtyB;

      return (a.item_name || "").localeCompare(b.item_name || "");
    });

    return items;
  }, [allItems, selectedCategory, selectedUnit, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInventory, currentPage]);

  // ⬇️ จำนวนแถวว่างที่ต้องเติมให้ครบ 12 แถวเสมอ
  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  // รีเซ็ตหน้าเมื่อฟิลเตอร์เปลี่ยน
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedCategory, selectedUnit]);

  // คลัมป์หน้าปัจจุบันเมื่อจำนวนหน้าลดลง (กันหน้าเกินแล้วว่าง)
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredInventory.length && setCurrentPage((c) => c + 1);
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
    setSearchText("");
    setSelectedCategory("");
    setSelectedUnit("");
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

  // ค่าข้อมูลหน้า
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const startDisplay = filteredInventory.length ? start + 1 : 0;
  const endDisplay = Math.min(start + ITEMS_PER_PAGE, filteredInventory.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <PackageCheck size={28} />
              ตรวจสอบยอดคงคลัง
            </h1>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>หมวดหมู่</label>
              <Select
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={
                  selectedCategory
                    ? categoryOptions.find((o) => o.value === selectedCategory)
                    : null
                }
                onChange={(opt) => setSelectedCategory(opt?.value || "")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>หน่วย</label>
              <Select
                options={unitOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหน่วย..."
                styles={customSelectStyles}
                value={selectedUnit ? unitOptions.find((o) => o.value === selectedUnit) : null}
                onChange={(opt) => setSelectedUnit(opt?.value || "")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
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
            <button onClick={clearFilters} className={`${styles.ghostBtn} ${styles.clearButton}`}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer} />
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
              <div className={styles.headerItem}>การดำเนินการ</div>
            </div>

            <div
              className={styles.inventory}
              style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}
            >
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <div key={item.item_id ?? `${getItemCode(item)}-${index}`} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </div>
                    <div className={styles.tableCell}>{getItemCode(item)}</div>
                    <div className={`${styles.tableCell} ${styles.imageCell}`}>
                      <img
                        src={
                          item.item_img
                            ? (String(item.item_img).startsWith("http")
                              ? item.item_img
                              : `http://localhost:5000/uploads/${item.item_img}`)
                            : "http://localhost:5000/public/defaults/landscape.png"
                        }
                        alt={item.item_name || "ไม่มีคำอธิบายภาพ"}
                      />
                    </div>
                    <div className={styles.tableCell} title={item.item_name}>
                      {item.item_name}
                    </div>
                    <div className={styles.tableCell}>
                      {categoryThaiMap[item.item_category?.toLowerCase()] || item.item_category}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.total_on_hand_qty}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.item_unit}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(() => {
                        const st = getStockStatus(item);
                        return (
                          <span className={`${styles.stBadge} ${styles[st.class]}`}>
                            {st.text}
                          </span>
                        );
                      })()}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <Link
                        href={`/manage/inventoryCheck/${item.item_id}/inventoryDetail`}
                        className={styles.actionButton}
                        title="ตรวจสอบ"
                        aria-label={`ตรวจสอบ ${item.item_name || ''}`}
                      >
                        <Search size={18} />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {/* เติมแถวว่างให้ครบ 12 แถวเสมอ */}
              {Array.from({ length: paginatedItems.length > 0 ? fillersCount : 0 }).map((_, i) => (
                <div
                  key={`filler-${i}`}
                  className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                  aria-hidden="true"
                >
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.imageCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                </div>
              ))}
            </div>

            {/* แถบข้อมูลหน้า + ปุ่มเปลี่ยนหน้า (คงโครง UL เดิมไว้) */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredInventory.length} รายการ
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
