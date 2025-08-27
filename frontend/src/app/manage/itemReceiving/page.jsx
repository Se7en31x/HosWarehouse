"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Plus, Save, RotateCcw, Package,
  ChevronLeft, ChevronRight, Search
} from "lucide-react";
import styles from "./page.module.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import axiosInstance from "@/app/utils/axiosInstance";

const MySwal = withReactContent(Swal);

// Custom debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const mapCategoryToThai = (category) => {
  switch (category) {
    case "medicine": return "ยา";
    case "medsup": return "เวชภัณฑ์";
    case "equipment": return "ครุภัณฑ์";
    case "meddevice": return "อุปกรณ์การแพทย์";
    case "general": return "ทั่วไป";
    default: return category || "-";
  }
};

export default function ItemReceivingPage() {
  const [allItems, setAllItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states
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

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const qtyInputRef = useRef(null);
  const ITEMS_PER_PAGE = 8;

  const searchInputRef = useRef(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await axiosInstance.get("/receiving");
        setAllItems(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        setError("โหลดข้อมูลไม่สำเร็จ");
        MySwal.fire({ title: "ผิดพลาด", text: "โหลดข้อมูลไม่สำเร็จ", icon: "error" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, []);

  // คำนวณจำนวนใช้หน่วยเบิก
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

  // เลือกสินค้า
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
    setFormErrors({});
  };

  // ✅ ใช้ช่องเดียวรองรับทั้งค้นหาและยิงบาร์โค้ด
  const handleSearchEnter = async (e) => {
    const isEnter =
      e.key === "Enter" || e.key === "Tab" || e.code === "NumpadEnter" || e.keyCode === 13;
    console.log("event.key:", e.key, "event.code:", e.code, "event.keyCode:", e.keyCode);
    if (isEnter && searchTerm.trim() !== "") {
      try {
        const res = await axiosInstance.get(`/receiving/barcode?barcode=${searchTerm.trim()}`);
        if (res.data) {
          // 🔥 จำลองเหมือนกดปุ่มเลือก
          handleSelectItem(res.data);

          MySwal.fire({
            title: "พบสินค้า",
            text: res.data.item_name,
            icon: "success",
            timer: 1000,
            showConfirmButton: false,
          });

          setTimeout(() => qtyInputRef.current?.focus(), 100);
          setSearchTerm("");
          return;
        }
      } catch (err) {
        console.log("ไม่เจอบาร์โค้ด → ค้นหาปกติ");
      }
    }
  };

  // ตรวจสอบฟอร์ม
  const validateForm = () => {
    const errors = {};
    if (!selectedItem) errors.selectedItem = "กรุณาเลือกสินค้า";
    if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0 || isNaN(parseFloat(purchaseQuantity)))
      errors.purchaseQuantity = "กรุณาใส่จำนวน (หน่วยสั่งซื้อ)";
    if (!conversionRate || parseFloat(conversionRate) <= 0 || isNaN(parseFloat(conversionRate)))
      errors.conversionRate = "กรุณาใส่อัตราส่วนที่ถูกต้อง";
    if (["ยา", "เวชภัณฑ์"].includes(selectedItem?.item_category)) {
      if (!expiryDate) errors.expiryDate = "กรุณาใส่วันหมดอายุ";
      else {
        const today = new Date();
        const expDate = new Date(expiryDate);
        if (expDate < today) errors.expiryDate = "วันหมดอายุต้องไม่เป็นอดีต";
      }
    }
    return errors;
  };

  // บันทึกเข้าฐานข้อมูลทันที
  const handleAddItem = async () => {
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newItem = {
      ...selectedItem,
      item_id: selectedItem.item_id,
      name: selectedItem.item_name,
      purchaseQuantity: parseFloat(purchaseQuantity),
      purchaseUnit: itemPurchaseUnit,
      conversionRate: parseFloat(conversionRate),
      quantity: parseFloat(itemQuantity) || 0,
      expiryDate,
      notes,
      lotNo,
      mfgDate,
      documentNo,
    };

    try {
      const payload = {
        user_id: 1,
        import_type: "general",
        source_name: sourceName.trim() || null,
        receiving_note: notes.trim() || null,
        receivingItems: [
          {
            ...newItem,
            lotNo: newItem.lotNo?.trim() || null,
            expiryDate: newItem.expiryDate || null,
            mfgDate: newItem.mfgDate || null,
            documentNo: newItem.documentNo?.trim() || null,
            notes: newItem.notes?.trim() || "",
          },
        ],
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

  // เคลียร์ฟอร์ม
  const handleClearForm = () => {
    setSelectedItem(null);
    setPurchaseQuantity("");
    setConversionRate("");
    setItemQuantity("");
    setExpiryDate("");
    setNotes("");
    setLotNo("");
    setMfgDate("");
    setDocumentNo("");
    setFormErrors({});
  };

  // Filter & Search
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.item_barcode || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || item.item_category === categoryFilter;

      return matchesSearch && matchesCategory;
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
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="ค้นหา...."
              // placeholder="ค้นหา"หรือสแกนบาร์โค้ด...
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchEnter}
              className={styles.searchInput}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">ทั้งหมด</option>
            <option value="medicine">ยา</option>
            <option value="medsup">เวชภัณฑ์</option>
            <option value="equipment">ครุภัณฑ์</option>
            <option value="meddevice">อุปกรณ์การแพทย์</option>
            <option value="general">ทั่วไป</option>
          </select>
        </div>

        {/* Section 1: ตารางสินค้า */}
        <div className={`${styles.tableGridItems} ${styles.tableHeader}`}>
          <div className={styles.headerItem}>ชื่อสินค้า</div>
          <div className={styles.headerItem}>ประเภท</div>
          <div className={styles.headerItem}>หน่วย</div>
          <div className={styles.headerItem}>ขั้นต่ำ</div>
          <div className={styles.headerItem}>สูงสุด</div>
          <div className={styles.headerItem}>คงเหลือ</div>
          <div className={styles.headerItem}>การดำเนินการ</div>
        </div>

        <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
          {isLoading ? (
            <div className={styles.noDataMessage}>กำลังโหลด…</div>
          ) : error ? (
            <div className={styles.errorMessage}>{error}</div>
          ) : currentItems.length === 0 ? (
            <div className={styles.noDataMessage}>ไม่พบสินค้า</div>
          ) : (
            currentItems.map((item) => (
              <div key={item.item_id} className={`${styles.tableGridItems} ${styles.tableRow}`}>
                <div className={styles.tableCell}>{item.item_name}</div>
                <div className={styles.tableCell}>{mapCategoryToThai(item.item_category)}</div>
                <div className={styles.tableCell}>{item.item_unit || "-"}</div>
                <div className={styles.tableCell}>{item.item_min ?? "-"}</div>
                <div className={styles.tableCell}>{item.item_max ?? "-"}</div>
                <div className={styles.tableCell}>
                  {item.current_stock < item.item_min ? (
                    <span style={{ color: "red", fontWeight: "bold" }}>
                      {item.current_stock ?? 0} 🔻 ต่ำกว่ากำหนด
                    </span>
                  ) : (
                    <span>{item.current_stock ?? 0}</span>
                  )}
                </div>
                <div className={`${styles.tableCell} ${styles.centerCell}`}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleSelectItem(item)}
                  >
                    เลือก
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <li key={`ellipsis-${i}`} className={styles.ellipsis}>…</li>
              ) : (
                <li key={`page-${p}-${i}`}>
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
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        )}
      </div>

      {/* Section 2: ฟอร์มเพิ่มรายการ */}
      <div className={styles.tableSection}>
        <h2 className={styles.subTitle}>
          <Plus size={18} /> เพิ่มรายการรับเข้า: {selectedItem?.item_name || "โปรดเลือกสินค้า"}
        </h2>
        <div className={styles.formContainer}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>ผู้ส่งมอบ / ผู้บริจาค</label>
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
              <label>จำนวนที่รับเข้า (หน่วยสั่งซื้อ)</label>
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
              {formErrors.purchaseQuantity && <p className={styles.errorText}>{formErrors.purchaseQuantity}</p>}
            </div>
            <div className={styles.formField}>
              <label>หน่วยสั่งซื้อ</label>
              <input
                type="text"
                value={itemPurchaseUnit}
                disabled
                className={styles.formInput}
              />
            </div>
            <div className={styles.formField}>
              <label>อัตราส่วนแปลง</label>
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
              {formErrors.conversionRate && <p className={styles.errorText}>{formErrors.conversionRate}</p>}
            </div>
            <div className={styles.formField}>
              <label>จำนวนในหน่วยเบิกใช้</label>
              <div className={styles.quantityWrapper}>
                <input
                  type="text"
                  value={itemQuantity ? `${itemQuantity} ${selectedItem?.item_unit || ''}` : ''}
                  disabled
                  placeholder="0"
                  className={styles.formInput}
                />
              </div>
            </div>
            <div className={styles.formField}>
              <label>Lot No.</label>
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
              <label>วันหมดอายุ</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={!selectedItem}
                min={new Date().toISOString().split("T")[0]}
                className={styles.formInput}
              />
              {formErrors.expiryDate && <p className={styles.errorText}>{formErrors.expiryDate}</p>}
            </div>
            <div className={styles.formField}>
              <label>วันผลิต</label>
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
              <label>เลขที่เอกสาร</label>
              <input
                type="text"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
                disabled={!selectedItem}
                placeholder="ระบุเลขที่เอกสาร"
                className={styles.formInput}
              />
            </div>
            <div className={styles.notesFieldContainer}>
              <label className={styles.notesLabel}>
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
            <button className={styles.clearButton} onClick={handleClearForm}>
              <RotateCcw size={16} /> ยกเลิก
            </button>
            <button className={styles.addItemButton} onClick={handleAddItem} disabled={!selectedItem}>
              <Save size={16} /> บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
