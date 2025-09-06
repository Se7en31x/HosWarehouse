'use client';
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import { manageAxios } from "@/app/utils/axiosInstance";
import { FaPlus, FaSearch, FaShoppingCart } from "react-icons/fa";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { ChevronLeft, ChevronRight, PackageCheck, Trash2 } from "lucide-react";
import { connectSocket, disconnectSocket } from "@/app/utils/socket";
import dynamic from "next/dynamic";
const Select = dynamic(() => import("react-select"), { ssr: false });

const MySwal = withReactContent(Swal);

/* ----------------------- react-select styles ----------------------- */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    width: 'clamp(220px, 24vw, 240px)', // ← ปรับค่าตามต้องการ เช่น '280px'
    borderRadius: 8,
    minHeight: 40,
    borderColor: state.isFocused ? "#3B82F6" : "#D1D5DB",
    boxShadow: "none",
    "&:hover": { borderColor: "#3B82F6" },
    fontSize: "0.95rem",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const mapCategoryToThai = (category) => {
  switch ((category || "").toLowerCase()) {
    case "medicine": return "ยา";
    case "medsup": return "เวชภัณฑ์";
    case "equipment": return "ครุภัณฑ์";
    case "meddevice": return "เครื่องมือแพทย์";
    case "general": return "ของใช้ทั่วไป";
    default: return "-";
  }
};

const getItemCode = (item) => {
  switch (item?.item_category?.toLowerCase()) {
    case "medicine": return item.med_code || "-";
    case "medsup": return item.medsup_code || "-";
    case "equipment": return item.equip_code || "-";
    case "meddevice": return item.meddevice_code || "-";
    case "general": return item.gen_code || "-";
    default: return "-";
  }
};

const getImageUrl = (imgName) => {
  const baseUrl = "http://localhost:5000"; // ปรับตาม URL เซิร์ฟเวอร์จริง
  if (!imgName) return `${baseUrl}/public/defaults/landscape.png`;
  if (String(imgName).startsWith("http") || String(imgName).startsWith("data:")) return imgName;
  return `${baseUrl}/uploads/${imgName}`;
};

const getStockStatus = (item) => {
  const qty = Number(item?.current_stock ?? 0);
  const min = Number(item?.item_min ?? 0);
  const nearThreshold = min + 10;

  if (qty < min) return { text: "ต่ำกว่ากำหนด", class: "stLow" };
  if (qty >= min && qty <= nearThreshold) return { text: "ใกล้จุดต่ำสุด", class: "stNearLow" };
  return { text: "", class: "" };
};

export default function RequestPurchasePage() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  /* เดิมของหน้า (ยังคงไว้) */
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  /* เพิ่มสำหรับบล็อกใหม่ */
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [menuPortalTarget, setMenuPortalTarget] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const categoryOptions = [
    { value: "medicine", label: "ยา" },
    { value: "medsup", label: "เวชภัณฑ์" },
    { value: "equipment", label: "ครุภัณฑ์" },
    { value: "meddevice", label: "เครื่องมือแพทย์" },
    { value: "general", label: "ของใช้ทั่วไป" },
  ];

  useEffect(() => {
    setMenuPortalTarget(typeof window !== "undefined" ? document.body : null);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const itemsRes = await manageAxios.get("/pr/items");
      const data = Array.isArray(itemsRes.data) ? itemsRes.data.filter(Boolean) : [];
      setItems(data);
      setError(null);
      console.log("Fetched items:", data); // Debug
    } catch (err) {
      console.error("Fetch error:", err);
      setError("ไม่สามารถดึงข้อมูลได้: " + (err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let mounted = true;
    const socket = connectSocket();
    const handleItemUpdate = () => {
      if (mounted) fetchData();
    };
    socket?.on?.("itemAdded", handleItemUpdate);
    socket?.on?.("itemUpdated", handleItemUpdate);
    socket?.on?.("itemLotUpdated", handleItemUpdate);
    socket?.on?.("itemDeleted", handleItemUpdate);

    return () => {
      mounted = false;
      socket?.off?.("itemAdded", handleItemUpdate);
      socket?.off?.("itemUpdated", handleItemUpdate);
      socket?.off?.("itemLotUpdated", handleItemUpdate);
      socket?.off?.("itemDeleted", handleItemUpdate);
      disconnectSocket?.();
    };
  }, []);

  /* Debounce: ใช้แหล่งคำค้นจาก searchText (ใหม่) ถ้าไม่มีก็ใช้ searchQuery (เก่า) */
  useEffect(() => {
    const t = setTimeout(() => {
      const src = (searchText ?? "").trim() || (searchQuery ?? "").trim();
      setDebouncedQ(src.toLowerCase());
    }, 350);
    return () => clearTimeout(t);
  }, [searchText, searchQuery]);

  /* ฟังก์ชันล้างตัวกรอง (สำหรับปุ่มใน searchCluster) */
  const clearFilters = () => {
    setSelectedCategory("");
    setSearchText("");
    setSearchQuery("");
    setDebouncedQ("");
    setCurrentPage(1);
  };

  /* กรองข้อมูล: หมวดหมู่ + คำค้น */
  const filteredItems = useMemo(() => {
    const q = debouncedQ;
    const result = items.filter((item) => {
      const name = (item.item_name || "").toLowerCase();
      const unit = (item.item_purchase_unit || item.item_unit || "").toLowerCase();
      const code = (getItemCode(item) || "").toLowerCase();
      const matchQuery = !q || name.includes(q) || unit.includes(q) || code.includes(q);

      const cat = (item.item_category || "").toLowerCase();
      const matchCategory = !selectedCategory || cat === selectedCategory;

      return matchQuery && matchCategory;
    });
    console.log("Filtered items:", result.length);
    return result;
  }, [items, debouncedQ, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQ, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const result = filteredItems.slice(start, start + ITEMS_PER_PAGE);
    console.log("Paginated items:", result.length, "Page:", currentPage, "Total pages:", totalPages);
    return result;
  }, [filteredItems, currentPage, totalPages]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));
  const startDisplay = filteredItems.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + paginatedItems.length, filteredItems.length);

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

  const handleAddItem = (item) => {
    if (selectedItems.some((i) => i.item_id === item.item_id)) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "สินค้านี้อยู่ในตะกร้าแล้ว",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    MySwal.fire({
      title: `เพิ่ม ${item.item_name} ลงในตะกร้า`,
      text: "กรุณาระบุจำนวนที่ต้องการ",
      input: "number",
      inputAttributes: { min: 1, step: 1 },
      inputValue: 1,
      showCancelButton: true,
      confirmButtonText: "เพิ่ม",
      cancelButtonText: "ยกเลิก",
      customClass: {
        confirmButton: styles.swalButton,
        cancelButton: styles.swalCancelButton,
      },
      inputValidator: (value) => {
        if (!value || isNaN(value) || Number(value) < 1) {
          return "กรุณาระบุจำนวนที่มากกว่า 0";
        }
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const quantity = Number(result.value);
        setSelectedItems((prev) => [...prev, { ...item, requested_qty: quantity, note: "" }]);
      }
    });
  };

  const handleRemoveItem = (id, itemName) => {
    MySwal.fire({
      title: `ลบ ${itemName} ออกจากตะกร้า?`,
      text: "คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      customClass: {
        confirmButton: styles.swalButton,
        cancelButton: styles.swalCancelButton,
      },
    }).then((result) => {
      if (result.isConfirmed) {
        setSelectedItems((prev) => prev.filter((i) => i.item_id !== id));
        MySwal.fire({
          title: "ลบสำเร็จ",
          text: `${itemName} ถูกลบออกจากตะกร้าเรียบร้อย`,
          icon: "success",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      } else {
        showCartPopup();
      }
    });
  };

  const showCartPopup = () => {
    MySwal.fire({
      title: `ตะกร้าสินค้า (${selectedItems.length} รายการ)`,
      html: `
        <div class="${styles.cartContainer}">
          ${
            selectedItems.length
              ? selectedItems
                  .map(
                    (item) => `
                  <div class="${styles.cartItem}">
                    <div class="${styles.itemDetails}">
                      <h3 class="${styles.itemName}">${item.item_name || "-"}</h3>
                      <span class="${styles.itemMeta}">หมวดหมู่: ${mapCategoryToThai(item.item_category)}</span>
                      <span class="${styles.itemMeta}">หน่วย: ${item.item_purchase_unit || item.item_unit || "-"}</span>
                    </div>
                    <div class="${styles.inputGroup}">
                      <label class="${styles.inputLabel}">จำนวน</label>
                      <input type="number" min="1" value="${item.requested_qty}" class="${styles.inputField}" id="qty-${item.item_id}" />
                    </div>
                    <div class="${styles.inputGroup}">
                      <label class="${styles.inputLabel}">หมายเหตุ</label>
                      <input type="text" value="${item.note || ""}" placeholder="เพิ่มหมายเหตุ" class="${styles.inputField}" id="note-${item.item_id}" />
                    </div>
                    <div></div>
                    <button class="${styles.removeBtn}" id="remove-${item.item_id}">ลบ</button>
                  </div>
                `
                  )
                  .join("")
              : `<div class="${styles.noItems}">🛒 ยังไม่มีสินค้าในตะกร้า</div>`
          }
        </div>
        <div class="${styles.submitRow}">
          <button class="${styles.submitBtn}" id="submit-cart">ส่งคำขอสั่งซื้อ</button>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "ปิด",
      customClass: {
        container: styles.swalContainer,
        popup: styles.swalPopup,
        cancelButton: styles.swalCancelButton,
      },
      didOpen: () => {
        document.querySelectorAll(`.${styles.removeBtn}`).forEach((button) => {
          button.addEventListener("click", () => {
            const itemId = button.id.replace("remove-", "");
            const item = selectedItems.find((i) => String(i.item_id) === String(itemId));
            if (item) {
              MySwal.close();
              handleRemoveItem(itemId, item.item_name);
            }
          });
        });
        document.getElementById("submit-cart")?.addEventListener("click", () => {
          const updated = selectedItems.map((item) => {
            const qtyInput = document.getElementById(`qty-${item.item_id}`);
            const noteInput = document.getElementById(`note-${item.item_id}`);
            return {
              ...item,
              requested_qty: qtyInput ? Math.max(1, Number(qtyInput.value)) : item.requested_qty,
              note: noteInput ? noteInput.value : item.note,
            };
          });
          MySwal.close();
          handleSubmit(updated);
        });
      },
    });
  };

  const handleSubmit = async (itemsToSubmit) => {
    if (!itemsToSubmit?.length) {
      MySwal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกรายการอย่างน้อย 1 รายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }
    try {
      await manageAxios.post("/pr", {
        items_to_purchase: itemsToSubmit.map((i) => ({
          item_id: i.item_id,
          qty: i.requested_qty,
          unit: i.item_purchase_unit || i.item_unit,
          note: i.note,
        })),
      });
      MySwal.fire({
        title: "สำเร็จ",
        text: "ส่งคำขอสั่งซื้อเรียบร้อย",
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      setSelectedItems([]);
    } catch (err) {
      MySwal.fire({
        title: "ผิดพลาด",
        text: "ไม่สามารถส่งคำขอได้: " + (err.response?.data?.message || err.message),
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <PackageCheck size={28} />
              สร้างคำขอสั่งซื้อ
            </h1>
          </div>
          <button
            className={`${styles.ghostBtn} ${styles.cartButton}`}
            onClick={showCartPopup}
            aria-label="เปิดตะกร้าสินค้า"
          >
            <FaShoppingCart size={16} /> ตะกร้า ({selectedItems.length})
          </button>
        </div>

        {/* ▼▼▼ Toolbar ใหม่: ใส่ตามที่ให้มา ▼▼▼ */}
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
        {/* ▲▲▲ Toolbar ใหม่ ▲▲▲ */}

        {error ? (
          <div className={styles.errorContainer}>
            <span>{error}</span>
            <button
              onClick={fetchData}
              className={`${styles.ghostBtn} ${styles.retryButton}`}
              aria-label="ลองใหม่"
            >
              ลองใหม่
            </button>
          </div>
        ) : loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection} role="region" aria-label="ตารางเลือกสินค้า">
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>รหัส</div>
              <div className={styles.headerItem}>รูปภาพ</div>
              <div className={styles.headerItem}>รายการ</div>
              <div className={styles.headerItem}>หมวดหมู่</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>คงเหลือ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>หน่วย</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>ขั้นต่ำ/สูงสุด</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>เพิ่ม</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.length > 0 ? (
                <>
                  {paginatedItems.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                    const { text: stockStatus, class: stockClass } = getStockStatus(item);
                    return (
                      <div
                        key={item.item_id ?? `${getItemCode(item)}-${idx}`}
                        className={`${styles.tableGrid} ${styles.tableRow}`}
                        role="row"
                      >
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {rowNumber}
                        </div>
                        <div className={styles.tableCell} role="cell">
                          {getItemCode(item)}
                        </div>
                        <div className={`${styles.tableCell} ${styles.imageCell}`} role="cell">
                          <img
                            src={getImageUrl(item.item_img)}
                            alt={item.item_name || "รูปสินค้า"}
                            onError={(e) => {
                              console.warn(`Image load failed for ${item.item_name}: ${e.currentTarget.src}`);
                              e.currentTarget.src = "http://localhost:5000/public/defaults/landscape.png";
                            }}
                          />
                        </div>
                        <div className={styles.tableCell} role="cell" title={item.item_name}>
                          {item.item_name || "-"}
                        </div>
                        <div className={styles.tableCell} role="cell">
                          {mapCategoryToThai(item.item_category)}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {stockStatus ? (
                            <span className={`${styles.stBadge} ${styles[stockClass]}`}>
                              {item.current_stock ?? 0} ({stockStatus})
                            </span>
                          ) : (
                            item.current_stock ?? 0
                          )}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {item.item_purchase_unit || item.item_unit || "-"}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          {(item.item_min ?? "-") + " / " + (item.item_max ?? "-")}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                          <button
                            className={styles.actionButton}
                            onClick={() => handleAddItem(item)}
                            aria-label={`เพิ่ม ${item.item_name || "สินค้า"} ลงตะกร้า`}
                            title={`เพิ่ม ${item.item_name || "สินค้า"}`}
                          >
                            <FaPlus size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {Array.from({ length: fillersCount }).map((_, i) => (
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
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    </div>
                  ))}
                </>
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูลสินค้า</div>
              )}
            </div>

            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredItems.length} รายการ
              </div>
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                    disabled={currentPage === 1}
                    aria-label="หน้าก่อนหน้า"
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
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                        onClick={() => setCurrentPage(p)}
                        aria-label={`หน้า ${p}`}
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
                    onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
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
