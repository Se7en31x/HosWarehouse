"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaPlus, FaTrashAlt, FaSearch, FaShoppingCart } from "react-icons/fa";
import Swal from "sweetalert2";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ✅ ฟังก์ชันแปลประเภท
const mapCategoryToThai = (category) => {
  switch ((category || "").toLowerCase()) {
    case "medicine":
      return "ยา";
    case "medsup":
      return "เวชภัณฑ์";
    case "equipment":
      return "ครุภัณฑ์";
    case "meddevice":
      return "เครื่องมือแพทย์";
    case "general":
      return "ของใช้ทั่วไป";
    default:
      return "-";
  }
};

export default function RequestPurchasePage() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ดึงสินค้า
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const itemsRes = await axiosInstance.get("/pr/items");
        setItems(itemsRes.data);
      } catch (err) {
        setError("ไม่สามารถดึงข้อมูลได้: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        (item.item_name || "").toLowerCase().includes(q) ||
        (item.item_purchase_unit || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

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

  // Add Item with Quantity Prompt
  const handleAddItem = (item) => {
    // Check if item is already in cart
    if (selectedItems.some((i) => i.item_id === item.item_id)) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "สินค้านี้อยู่ในตะกร้าแล้ว",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    // Show prompt for quantity
    Swal.fire({
      title: `เพิ่ม ${item.item_name} ลงในตะกร้า`,
      text: "กรุณาระบุจำนวนที่ต้องการ",
      input: "number",
      inputAttributes: {
        min: 1,
        step: 1,
      },
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
        setSelectedItems((prev) => [
          ...prev,
          { ...item, requested_qty: quantity, note: "" },
        ]);
      }
    });
  };

  const handleQuantityChange = (id, qty) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.item_id === id ? { ...i, requested_qty: Math.max(1, Number(qty)) } : i))
    );
  };

  const handleNoteChange = (id, note) => {
    setSelectedItems((prev) => prev.map((i) => (i.item_id === id ? { ...i, note } : i)));
  };

  const handleRemoveItem = (id, itemName) => {
    Swal.fire({
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
        // อัปเดต state เพื่อลบสินค้า
        setSelectedItems((prev) => {
          const updatedItems = prev.filter((i) => i.item_id !== id);
          // แสดง popup ใหม่หลังจาก state อัปเดต
          setTimeout(() => {
            if (updatedItems.length > 0) {
              showCartPopup(); // แสดง popup เฉพาะเมื่อยังมีสินค้าในตะกร้า
            }
          }, 100);
          return updatedItems;
        });

        // แสดงข้อความยืนยันการลบ
        Swal.fire({
          title: "ลบสำเร็จ",
          text: `${itemName} ถูกลบออกจากตะกร้าเรียบร้อย`,
          icon: "success",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      } else {
        // ถ้ายกเลิก ให้แสดง popup เดิม
        showCartPopup();
      }
    });
  };

  // Show Cart Popup
  const showCartPopup = () => {
    Swal.fire({
      title: `ตะกร้าสินค้า (${selectedItems.length} รายการ)`,
      html: `
        <style>
          .cart-container {
            font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, sans-serif;
            max-height: 400px;
            overflow-y: auto;
            padding: 10px;
            scrollbar-width: thin;
            scrollbar-color: #ace2e1 transparent;
          }
          .cart-container::-webkit-scrollbar {
            width: 6px;
          }
          .cart-container::-webkit-scrollbar-thumb {
            background-color: #ace2e1;
            border-radius: 3px;
          }
          .cart-item {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 60px;
            align-items: center;
            background: #f9fafb;
            border: 1px solid #ace2e1;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            transition: box-shadow 0.2s ease;
            column-gap: 16px;
          }
          .cart-item:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .item-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .input-group.qty {
            margin-right: 12px;
          }
          .item-name {
            font-size: 1rem;
            font-weight: 600;
            color: #374151;
            margin: 0;
          }
          .item-meta {
            font-size: 0.85rem;
            color: #6b7280;
          }
          .input-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .input-label {
            font-size: 0.85rem;
            color: #374151;
            font-weight: 500;
          }
          .input-field {
            width: 100%;
            height: 36px;
            padding: 8px;
            border: 1px solid #ace2e1;
            border-radius: 6px;
            font-size: 0.9rem;
            transition: border-color 0.2s ease;
          }
          .input-field:focus {
            outline: none;
            border-color: #41c9e2;
            box-shadow: 0 0 0 2px rgba(65, 201, 226, 0.2);
          }
          .remove-btn {
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s ease, transform 0.15s ease;
          }
          .remove-btn:hover {
            background: #dc2626;
            transform: scale(1.05);
          }
          .remove-btn:active {
            transform: scale(0.95);
          }
          .submit-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
            padding: 10px;
          }
          .submit-btn {
            background: #008dda;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px 20px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s ease, transform 0.15s ease;
          }
          .submit-btn:hover {
            background: #1685bb;
            transform: translateY(-1px);
          }
          .submit-btn:active {
            transform: translateY(0);
          }
          .no-items {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 20px;
            font-size: 1rem;
            color: #6b7280;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #ace2e1;
          }
          @media (max-width: 500px) {
            .cart-item {
              grid-template-columns: 1fr;
              gap: 10px;
            }
            .input-field {
              width: 100%;
            }
          }
        </style>
        <div class="cart-container">
          ${selectedItems.length
          ? selectedItems
            .map(
              (item) => `
                    <div class="cart-item">
                      <div class="item-details">
                        <h3 class="item-name">${item.item_name || "-"}</h3>
                        <span class="item-meta">ประเภท: ${mapCategoryToThai(item.item_category)}</span>
                        <span class="item-meta">หน่วย: ${item.item_purchase_unit || item.item_unit || "-"}</span>
                      </div>
                      <div class="input-group">
                        <label class="input-label">จำนวน</label>
                        <input
                          type="number"
                          min="1"
                          value="${item.requested_qty}"
                          class="input-field"
                          id="qty-${item.item_id}"
                        />
                      </div>
                      <div class="input-group">
                        <label class="input-label">หมายเหตุ</label>
                        <input
                          type="text"
                          value="${item.note}"
                          placeholder="เพิ่มหมายเหตุ"
                          class="input-field"
                          id="note-${item.item_id}"
                        />
                      </div>
                      <div></div>
                      <button class="remove-btn" id="remove-${item.item_id}">
                        🗑️
                      </button>
                    </div>
                  `
            )
            .join("")
          : `<div class="no-items">
                  <span role="img" aria-label="ตะกร้าว่างเปล่า">🛒</span> ยังไม่มีสินค้าในตะกร้า
                </div>`
        }
        </div>
        <div class="submit-row">
          <button class="submit-btn" id="submit-cart">ส่งคำขอสั่งซื้อ</button>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      showCancelButton: false,
      customClass: {
        container: styles.swalContainer,
        popup: styles.swalPopup,
      },
      didOpen: () => {
        // Add event listeners for quantity, note, and remove buttons
        selectedItems.forEach((item) => {
          const qtyInput = document.getElementById(`qty-${item.item_id}`);
          const noteInput = document.getElementById(`note-${item.item_id}`);
          const removeBtn = document.getElementById(`remove-${item.item_id}`);

          if (qtyInput) {
            qtyInput.addEventListener("change", (e) => handleQuantityChange(item.item_id, e.target.value));
          }
          if (noteInput) {
            noteInput.addEventListener("change", (e) => handleNoteChange(item.item_id, e.target.value));
          }
          if (removeBtn) {
            removeBtn.addEventListener("click", () => {
              Swal.close(); // Close the cart popup
              handleRemoveItem(item.item_id, item.item_name); // Trigger confirmation prompt
            });
          }
        });

        const submitBtn = document.getElementById("submit-cart");
        if (submitBtn) {
          submitBtn.addEventListener("click", () => {
            Swal.close();
            handleSubmit();
          });
        }
      },
    });
  };

  // Submit PR
  const handleSubmit = async () => {
    if (!selectedItems.length) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกรายการอย่างน้อย 1 รายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "ยืนยันการส่งคำขอ?",
      text: `คุณต้องการส่งคำขอสั่งซื้อ ${selectedItems.length} รายการใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ใช่",
      cancelButtonText: "ยกเลิก",
      customClass: {
        confirmButton: styles.swalButton,
        cancelButton: styles.swalCancelButton,
      },
    });

    if (confirm.isConfirmed) {
      try {
        await axiosInstance.post("/pr", {
          requester_id: 1, // TODO: ปรับตามระบบ auth
          items_to_purchase: selectedItems.map((i) => ({
            item_id: i.item_id,
            qty: i.requested_qty,
            unit: i.item_purchase_unit || i.item_unit,
            note: i.note,
          })),
        });

        Swal.fire({
          title: "สำเร็จ",
          text: "ส่งคำขอสั่งซื้อเรียบร้อย",
          icon: "success",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });

        setSelectedItems([]);
      } catch (err) {
        Swal.fire({
          title: "ผิดพลาด",
          text: "ไม่สามารถส่งคำขอได้: " + (err.response?.data?.message || err.message),
          icon: "error",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      }
    }
  };

  // Rendering
  if (loading) return <div className={styles.loading}>กำลังโหลด...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <h1 className={styles.pageTitle}>
            <span aria-hidden="true"></span> สร้างคำขอสั่งซื้อ
          </h1>
          <button className={styles.cartButton} onClick={showCartPopup}>
            <FaShoppingCart size={16} /> ตะกร้า ({selectedItems.length})
          </button>
        </div>

        {/* Item Selection */}
        <section className={styles.leftPanel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>เลือกสินค้า</h2>
            <div className={styles.searchBox}>
              <FaSearch size={14} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="text"
                className={styles.input}
                placeholder="ค้นหาสินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="ค้นหาสินค้าหรือหน่วยจัดซื้อ"
              />
            </div>
          </div>

          <div className={styles.tableSection}>
            {/* Header */}
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ชื่อสินค้า</div>
              <div className={styles.headerItem}>รูปภาพ</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>คงเหลือ</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>ขั้นต่ำ</div>
              <div className={styles.headerItem}>สูงสุด</div>
              <div className={styles.headerItem}>เพิ่ม</div>
            </div>

            {/* Rows */}
            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.length ? (
                paginatedItems.map((item) => (
                  <div key={item.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{item.item_name}</div>
                    <div className={`${styles.tableCell} ${styles.itemCell}`}>
                      <img
                        src={
                          item.item_img
                            ? (String(item.item_img).startsWith("http")
                              ? item.item_img
                              : `http://localhost:5000/uploads/${item.item_img}`)
                            : "http://localhost:5000/public/defaults/landscape.png"
                        }
                        alt={item.item_name || "ไม่มีคำอธิบายภาพ"}
                        className={styles.itemImage}
                      />
                    </div>
                    <div className={styles.tableCell}>{mapCategoryToThai(item.item_category)}</div>
                    <div className={styles.tableCell}>
                      <span
                        className={
                          item.item_min && item.current_stock < item.item_min
                            ? styles.lowStock
                            : item.item_min &&
                              item.current_stock >= item.item_min &&
                              item.current_stock <= item.item_min + 10
                              ? styles.nearLowStock
                              : ""
                        }
                      >
                        {item.current_stock ?? 0}
                      </span>

                      {item.item_min && item.current_stock < item.item_min && (
                        <span className={styles.lowStockLabel}> 🔻 ต่ำกว่ากำหนด</span>
                      )}

                      {item.item_min &&
                        item.current_stock >= item.item_min &&
                        item.current_stock <= item.item_min + 10 && (
                          <span className={styles.nearLowStockLabel}> ⚠️ ใกล้จุดต่ำสุด</span>
                        )}
                    </div>
                    <div className={styles.tableCell}>{item.item_unit}</div>
                    <div className={styles.tableCell}>{item.item_min ?? "-"}</div>
                    <div className={styles.tableCell}>{item.item_max ?? "-"}</div>
                    <div className={styles.tableCell}>
                      <button className={styles.addBtn} onClick={() => handleAddItem(item)}>
                        <FaPlus size={10} /> เพิ่ม
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูลสินค้า</div>
              )}
            </div>

            {/* Pagination */}
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
                  <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
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
                  disabled={currentPage === totalPages}
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}