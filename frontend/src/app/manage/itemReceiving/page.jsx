"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Plus, Save, RotateCcw, Package, ChevronLeft, ChevronRight, Search, Trash2,
} from "lucide-react";
import styles from "./page.module.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import axiosInstance from "@/app/utils/axiosInstance";
import dynamic from "next/dynamic";

const MySwal = withReactContent(Swal);
const Select = dynamic(() => import("react-select"), { ssr: false });

// Custom debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Category mapping
const mapCategoryToThai = (category) => {
  switch (category?.toLowerCase()) {
    case "medicine": return "ยา";
    case "medsup": return "เวชภัณฑ์";
    case "equipment": return "ครุภัณฑ์";
    case "meddevice": return "อุปกรณ์การแพทย์";
    case "general": return "ทั่วไป";
    default: return category || "-";
  }
};

// react-select styles
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

// Category options
const categoryOptions = [
  { value: "all", label: "ทั้งหมด" },
  { value: "medicine", label: "ยา" },
  { value: "medsup", label: "เวชภัณฑ์" },
  { value: "equipment", label: "ครุภัณฑ์" },
  { value: "meddevice", label: "อุปกรณ์การแพทย์" },
  { value: "general", label: "ทั่วไป" },
];

export default function ItemReceivingPage() {
  const [allItems, setAllItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [itemPurchaseUnit, setItemPurchaseUnit] = useState("");
  const [conversionRate, setConversionRate] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [documentNo, setDocumentNo] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const qtyInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const ITEMS_PER_PAGE = 8;

  const menuPortalTarget = useMemo(
    () => (typeof window !== "undefined" ? document.body : null),
    []
  );

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch items
  useEffect(() => {
    let isMounted = true;
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get("/receiving");
        if (isMounted) {
          setAllItems(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
        }
      } catch (error) {
        if (isMounted) {
          setError("โหลดข้อมูลไม่สำเร็จ");
          MySwal.fire({ title: "ผิดพลาด", text: "โหลดข้อมูลไม่สำเร็จ", icon: "error" });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchItems();
    return () => {
      isMounted = false;
    };
  }, []);

  // Calculate item quantity
  const debouncedCalculateQuantity = useCallback(
    debounce((pq, cr) => {
      const purchaseQty = parseFloat(pq);
      const convRate = parseFloat(cr);
      if (!isNaN(purchaseQty) && !isNaN(convRate) && purchaseQty > 0 && convRate > 0) {
        setItemQuantity(Math.floor(purchaseQty * convRate));
      } else {
        setItemQuantity("");
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedCalculateQuantity(purchaseQuantity, conversionRate);
  }, [purchaseQuantity, conversionRate, debouncedCalculateQuantity]);

  // Handle item selection
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setItemPurchaseUnit(item.item_purchase_unit || "");
    setConversionRate(item.item_conversion_rate || "");
    setPurchaseQuantity("");
    setItemQuantity("");
    setLotNo("");
    setMfgDate("");
    setExpiryDate("");
    setNotes("");
    setDocumentNo("");
    setSourceName("");
    setFormErrors({});
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  // Handle barcode search
  const handleSearchEnter = async (e) => {
    const isEnter =
      e.key === "Enter" || e.key === "Tab" || e.code === "NumpadEnter" || e.keyCode === 13;
    if (isEnter && searchTerm.trim() !== "") {
      try {
        const res = await axiosInstance.get(`/receiving/barcode?barcode=${searchTerm.trim()}`);
        if (res.data) {
          handleSelectItem(res.data);
          MySwal.fire({
            title: "พบสินค้า",
            text: res.data.item_name,
            icon: "success",
            timer: 1000,
            showConfirmButton: false,
          });
          setSearchTerm("");
        }
      } catch (err) {
        console.log("ไม่เจอบาร์โค้ด → ค้นหาปกติ");
        MySwal.fire({
          title: "ไม่พบสินค้า",
          text: "ไม่พบสินค้าจากบาร์โค้ดที่ระบุ",
          icon: "warning",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!selectedItem) errors.selectedItem = "กรุณาเลือกสินค้า";
    if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0 || isNaN(parseFloat(purchaseQuantity)))
      errors.purchaseQuantity = "กรุณาใส่จำนวน (หน่วยสั่งซื้อ)";
    if (!conversionRate || parseFloat(conversionRate) <= 0 || isNaN(parseFloat(conversionRate)))
      errors.conversionRate = "กรุณาใส่อัตราส่วนที่ถูกต้อง";
    if (["ยา", "เวชภัณฑ์"].includes(mapCategoryToThai(selectedItem?.item_category))) {
      if (!expiryDate) errors.expiryDate = "กรุณาใส่วันหมดอายุ";
      else {
        const today = new Date();
        const expDate = new Date(expiryDate);
        if (expDate < today) errors.expiryDate = "วันหมดอายุต้องไม่เป็นอดีต";
      }
    }
    return errors;
  };

  // Save item
  const handleAddItem = async () => {
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      MySwal.fire({
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกข้อมูลให้ครบถ้วน",
        icon: "warning",
      });
      return;
    }

    const result = await MySwal.fire({
      title: "ยืนยันการบันทึก",
      text: `บันทึกรายการรับเข้า ${selectedItem.item_name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    const newItem = {
      item_id: selectedItem.item_id,
      name: selectedItem.item_name,
      purchaseQuantity: parseFloat(purchaseQuantity),
      purchaseUnit: itemPurchaseUnit,
      conversionRate: parseFloat(conversionRate),
      quantity: parseFloat(itemQuantity) || 0,
      unit: selectedItem?.item_unit,
      expiryDate: expiryDate || null,
      notes: notes?.trim() || null,
      lotNo: lotNo?.trim() || null,
      mfgDate: mfgDate || null,
      documentNo: documentNo?.trim() || null,
    };

    try {
      const payload = {
        user_id: 1,
        import_type: "general",
        source_name: sourceName?.trim() || null,
        receiving_note: notes?.trim() || null,
        receivingItems: [newItem],
      };

      await axiosInstance.post("/receiving", payload);
      MySwal.fire({ title: "บันทึกสำเร็จ", icon: "success" });
      handleClearForm();
    } catch (err) {
      console.error("❌ Save error:", err);
      MySwal.fire({
        title: "บันทึกไม่สำเร็จ",
        text: err.response?.data?.message || "เกิดข้อผิดพลาด",
        icon: "error",
      });
    }
  };

  // Clear form
  const handleClearForm = () => {
    setSelectedItem(null);
    setPurchaseQuantity("");
    setItemPurchaseUnit("");
    setConversionRate("");
    setItemQuantity("");
    setExpiryDate("");
    setNotes("");
    setLotNo("");
    setMfgDate("");
    setDocumentNo("");
    setSourceName("");
    setFormErrors({});
    setSearchTerm("");
    setCategoryFilter("all");
    setCurrentPage(1);
    searchInputRef.current?.focus();
  };

  // Filter & Search
  const filteredItems = useMemo(() => {
    return allItems
      .filter((item) => {
        const matchesSearch =
          (item.item_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.item_barcode || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory =
          categoryFilter === "all" || item.item_category?.toLowerCase() === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const stockA = Number(a.current_stock ?? 0);
        const stockB = Number(b.current_stock ?? 0);
        const minA = Number(a.item_min ?? 0);
        const minB = Number(b.item_min ?? 0);
        if (stockA < minA && stockB >= minB) return -1;
        if (stockB < minB && stockA >= minA) return 1;
        return (a.item_name || "").localeCompare(b.item_name || "");
      });
  }, [allItems, searchTerm, categoryFilter]);

  // Pagination
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

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

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <Package size={22} /> รับเข้าสินค้า
            </h1>
          </div>
        </div>

        {/* Search & Filter */}
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
                value={categoryOptions.find((o) => o.value === categoryFilter) || null}
                onChange={(opt) => setCategoryFilter(opt?.value || "all")}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="ค้นหาหรือสแกนบาร์โค้ด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchEnter}
                />
              </div>
            </div>
          </div>
          <div className={styles.searchCluster}>
            <button onClick={handleClearForm} className={`${styles.ghostBtn} ${styles.clearButton}`}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection} role="region" aria-label="ตารางสินค้า">
          <div className={`${styles.tableGridItems} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>ชื่อสินค้า</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>หน่วย</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>ขั้นต่ำ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>สูงสุด</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>คงเหลือ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>การดำเนินการ</div>
          </div>
          <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
            {error ? (
              <div className={styles.errorContainer}>
                <span>{error}</span>
                <button onClick={() => fetchItems()} className={styles.retryButton}>
                  ลองใหม่
                </button>
              </div>
            ) : isLoading ? (
              <div className={styles.loadingContainer}>
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            ) : currentItems.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบสินค้า</div>
            ) : (
              currentItems.map((item) => (
                <div key={item.item_id} className={`${styles.tableGridItems} ${styles.tableRow}`} role="row">
                  <div className={styles.tableCell} role="cell" title={item.item_name}>
                    {item.item_name}
                  </div>
                  <div className={styles.tableCell} role="cell">
                    {mapCategoryToThai(item.item_category)}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                    {item.item_unit || "-"}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                    {item.item_min ?? "-"}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                    {item.item_max ?? "-"}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                    {item.current_stock < item.item_min ? (
                      <span className={styles.lowStock}>
                        {item.current_stock ?? 0} 🔻 ต่ำกว่ากำหนด
                      </span>
                    ) : (
                      <span>{item.current_stock ?? 0}</span>
                    )}
                  </div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`} role="cell">
                    <button
                      className={styles.actionButton}
                      onClick={() => handleSelectItem(item)}
                      aria-label={`เลือกสินค้า ${item.item_name}`}
                    >
                      เลือก
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="ไปยังหน้าที่แล้ว"
                >
                  <ChevronLeft size={16} />
                </button>
              </li>
              {getPageNumbers().map((p, i) =>
                p === "..." ? (
                  <li key={`ellipsis-${i}`} className={styles.ellipsis}>
                    …
                  </li>
                ) : (
                  <li key={`page-${p}-${i}`}>
                    <button
                      className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                      onClick={() => setCurrentPage(p)}
                      aria-label={`ไปยังหน้า ${p}`}
                    >
                      {p}
                    </button>
                  </li>
                )
              )}
              <li>
                <button
                  className={styles.pageButton}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="ไปยังหน้าถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          )}
        </div>

        {/* Form Section */}
        <div className={styles.tableSection}>
          <h2 className={styles.subTitle}>
            <Plus size={18} /> เพิ่มรายการรับเข้า: {selectedItem?.item_name || "โปรดเลือกสินค้า"}
          </h2>
          <div className={styles.formContainer}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label className={styles.label}>ผู้ส่งมอบ / ผู้บริจาค</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  disabled={!selectedItem}
                  placeholder="ระบุผู้ส่งมอบ"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>จำนวนที่รับเข้า (หน่วยสั่งซื้อ)</label>
                <input
                  type="number"
                  ref={qtyInputRef}
                  value={purchaseQuantity}
                  onChange={(e) => setPurchaseQuantity(e.target.value)}
                  disabled={!selectedItem}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={styles.formInput}
                />
                {formErrors.purchaseQuantity && (
                  <p className={styles.errorText}>{formErrors.purchaseQuantity}</p>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>หน่วยสั่งซื้อ</label>
                <input
                  type="text"
                  value={itemPurchaseUnit}
                  disabled
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>อัตราส่วนแปลง</label>
                <input
                  type="number"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(e.target.value)}
                  disabled={!selectedItem}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={styles.formInput}
                />
                {formErrors.conversionRate && (
                  <p className={styles.errorText}>{formErrors.conversionRate}</p>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>จำนวนในหน่วยเบิกใช้</label>
                <input
                  type="text"
                  value={itemQuantity ? `${itemQuantity} ${selectedItem?.item_unit || ''}` : ''}
                  disabled
                  placeholder="0"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>Lot No.</label>
                <input
                  type="text"
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                  disabled={!selectedItem}
                  placeholder="ระบุ Lot หรือเว้นว่างเพื่อให้ระบบสร้างใหม่"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>วันหมดอายุ</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={!selectedItem}
                  min={new Date().toISOString().split("T")[0]}
                  className={styles.formInput}
                />
                {formErrors.expiryDate && (
                  <p className={styles.errorText}>{formErrors.expiryDate}</p>
                )}
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>วันผลิต</label>
                <input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  disabled={!selectedItem}
                  max={new Date().toISOString().split("T")[0]}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>เลขที่เอกสาร</label>
                <input
                  type="text"
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  disabled={!selectedItem}
                  placeholder="ระบุเลขที่เอกสาร"
                  className={styles.formInput}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>
                  บันทึก / อ้างอิง
                  <span className={styles.charCount}>
                    {notes.length}/500
                  </span>
                </label>
                <textarea
                  className={styles.notesField}
                  value={notes ?? ""}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!selectedItem}
                  placeholder="ระบุบันทึกเพิ่มเติม (ถ้ามี)"
                  maxLength={500}
                />
              </div>
            </div>
            <div className={styles.formActions}>
              <button className={styles.ghostBtn} onClick={handleClearForm}>
                <RotateCcw size={16} /> ล้างฟอร์ม
              </button>
              <button
                className={styles.addItemButton}
                onClick={handleAddItem}
                disabled={!selectedItem}
                aria-label="บันทึกรายการรับเข้า"
              >
                <Save size={16} /> บันทึก
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}