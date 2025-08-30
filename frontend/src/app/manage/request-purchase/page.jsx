'use client';
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaPlus, FaTrashAlt, FaSearch, FaShoppingCart } from "react-icons/fa";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ✅ Import Socket functions
import { connectSocket, disconnectSocket } from "@/app/utils/socket";

const MySwal = withReactContent(Swal);

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

// ✅ เพิ่มฟังก์ชัน getImageUrl เพื่อจัดการ URL รูปภาพ
const getImageUrl = (imgName) => {
  if (!imgName) {
    return "/public/defaults/landscape.png";
  }
  // ถ้าเป็น URL เต็มอยู่แล้ว ให้ใช้เลย
  if (String(imgName).startsWith("http")) {
    return imgName;
  }
  // ถ้าเป็นแค่ชื่อไฟล์ ให้ใช้ relative path
  return `/uploads/${imgName}`;
};

export default function RequestPurchasePage() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const itemsRes = await axiosInstance.get("/pr/items");
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data.filter(Boolean) : []);
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลได้: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const socket = connectSocket();

    socket.on("itemAdded", (newItem) => {
      console.log("ได้รับข้อมูลสินค้าใหม่จาก Socket.IO:", newItem);
      if (isMounted) {
        setItems(prevItems => [...prevItems, newItem]);
      }
    });

    socket.on("itemLotUpdated", (payload) => {
      console.log("ได้รับข้อมูลการอัปเดต Lot จาก Socket.IO:", payload);
      if (isMounted) {
        setItems(prevItems => prevItems.map(item =>
          item.item_id === payload.item_id
            ? {
              ...item,
              current_stock: payload.new_total_qty
            }
            : item
        ));
      }
    });

    socket.on("itemDeleted", (deletedItemId) => {
      console.log("ได้รับสัญญาณลบสินค้าจาก Socket.IO:", deletedItemId);
      if (isMounted) {
        setItems(prevItems => prevItems.filter(item =>
          item.item_id !== deletedItemId
        ));
      }
    });

    return () => {
      isMounted = false;
      socket.off("itemAdded");
      socket.off("itemLotUpdated");
      socket.off("itemDeleted");
      disconnectSocket();
    };
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        (item.item_name || "").toLowerCase().includes(q) ||
        (item.item_purchase_unit || "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

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

  const handleAddItem = (item) => {
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
          text: `${itemName} ถูกลบออกจากตะกร้าแล้ว`,
          icon: "success",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      }
    });
  };

  const showCartPopup = () => {
    MySwal.fire({
      title: `ตะกร้าสินค้า (${selectedItems.length} รายการ)`,
      html: (
        <div className="cart-container">
          {selectedItems.length ? (
            selectedItems.map((item) => (
              <div key={item.item_id} className="cart-item">
                <div className="item-details">
                  <h3 className="item-name">{item.item_name || "-"}</h3>
                  <span className="item-meta">ประเภท: {mapCategoryToThai(item.item_category)}</span>
                  <span className="item-meta">หน่วย: {item.item_purchase_unit || item.item_unit || "-"}</span>
                </div>
                <div className="input-group">
                  <label className="input-label">จำนวน</label>
                  <input
                    type="number"
                    min="1"
                    defaultValue={item.requested_qty}
                    className="input-field"
                    data-id={item.item_id}
                    data-field="qty"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">หมายเหตุ</label>
                  <input
                    type="text"
                    defaultValue={item.note}
                    placeholder="เพิ่มหมายเหตุ"
                    className="input-field"
                    data-id={item.item_id}
                    data-field="note"
                  />
                </div>
                <div></div>
                <button
                  className="remove-btn"
                  onClick={() => {
                    MySwal.close();
                    handleRemoveItem(item.item_id, item.item_name);
                  }}
                >
                  <FaTrashAlt size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className="no-items">
              <span role="img" aria-label="Empty cart">🛒</span> ยังไม่มีสินค้าในตะกร้า
            </div>
          )}
        </div>
      ),
      showCloseButton: true,
      showCancelButton: true,
      showConfirmButton: true,
      confirmButtonText: "ส่งคำขอสั่งซื้อ",
      cancelButtonText: "ปิด",
      customClass: {
        container: styles.swalContainer,
        popup: styles.swalPopup,
        confirmButton: styles.swalButton,
        cancelButton: styles.swalCancelButton,
      },
      preConfirm: () => {
        const updatedItems = selectedItems.map(item => {
          const qtyInput = document.querySelector(`input[data-id="${item.item_id}"][data-field="qty"]`);
          const noteInput = document.querySelector(`input[data-id="${item.item_id}"][data-field="note"]`);
          return {
            ...item,
            requested_qty: qtyInput ? Math.max(1, Number(qtyInput.value)) : item.requested_qty,
            note: noteInput ? noteInput.value : item.note,
          };
        });
        setSelectedItems(updatedItems);
        return updatedItems;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handleSubmit(result.value);
      }
    });
  };

  const handleSubmit = async (itemsToSubmit) => {
    if (!itemsToSubmit || !itemsToSubmit.length) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกรายการอย่างน้อย 1 รายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    try {
      await axiosInstance.post("/pr", {
        requester_id: 1,
        items_to_purchase: itemsToSubmit.map((i) => ({
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
  };

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

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <div key={item.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{item.item_name}</div>
                    <div className={`${styles.tableCell} ${styles.itemCell}`}>
                      <img
                        // ✅ แก้ไข: เรียกใช้ฟังก์ชันที่สร้างขึ้นมาใหม่
                        src={getImageUrl(item.item_img)}
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