'use client';
import { useState, useEffect, useMemo, useRef } from "react"; // useRef is already there
import { debounce } from 'lodash';
import styles from "./page.module.css";
import { manageAxios } from "@/app/utils/axiosInstance";
import { FaPlus, FaTrashAlt, FaSearch, FaShoppingCart, FaMinus, FaPlus as FaPlusIcon } from "react-icons/fa";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { connectSocket, disconnectSocket } from "@/app/utils/socket";
import Swal from "sweetalert2";
import localforage from "localforage";
import dynamic from "next/dynamic"; // You already have this

// Configure localforage
localforage.config({
  name: 'purchaseRequestApp',
  storeName: 'cart',
  description: 'Storage for purchase request cart items'
});

// ImageWithFallback component
const ImageWithFallback = ({ item }) => {
  const fallbackUrl = "http://localhost:5000/public/defaults/landscape.png";
  const initialUrl = item.item_img ? `http://localhost:5000/public/${item.item_img}` : fallbackUrl;
  const [imgSrc, setImgSrc] = useState(initialUrl);

  useEffect(() => {
    setImgSrc(item.item_img ? `http://localhost:5000/public/${item.item_img}` : fallbackUrl);
  }, [item.item_img]);

  return (
    <img
      src={imgSrc}
      alt={item.item_name || "ไม่มีคำอธิบายภาพ"}
      className={styles.itemImage}
      onError={() => {
        console.warn(`Failed to load image for ${item.item_name}: ${imgSrc}`);
        setImgSrc(fallbackUrl);
      }}
    />
  );
};

// mapCategoryToThai function
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

// QuantityModal component
const QuantityModal = ({ isOpen, onClose, item, onConfirm, showToast }) => {
  const [quantity, setQuantity] = useState(1);

  if (!isOpen || !item) return null;

  const handleConfirm = () => {
    if (quantity < 1) {
      showToast("warning", "จำนวนต้องมากกว่า 0");
      return;
    }
    onConfirm(item, quantity);
    setQuantity(1);
    onClose();
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.quantityModalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>เพิ่มสินค้า: {item.item_name}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="ปิด">
            ✕
          </button>
        </div>
        <div className={styles.quantityModalBody}>
          <div className={styles.quantityItemDetails}>
            <ImageWithFallback item={item} />
            <div className={styles.itemDetails}>
              <span className={styles.itemMeta}>ประเภท: {mapCategoryToThai(item.item_category)}</span>
              <span className={styles.itemMeta}>หน่วย: {item.item_purchase_unit || item.item_unit || "-"}</span>
              <span className={styles.itemMeta}>คงเหลือ: {item.current_stock ?? 0}</span>
            </div>
          </div>
          <div className={styles.quantityInputGroup}>
            <label className={styles.inputLabel}>จำนวน</label>
            <div className={styles.quantityInputWrapper}>
              <button
                className={styles.quantityBtn}
                onClick={handleDecrement}
                aria-label={`ลดจำนวนของ ${item.item_name}`}
              >
                <FaMinus size={12} />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className={styles.quantityInput}
                aria-label={`จำนวนของ ${item.item_name}`}
              />
              <button
                className={styles.quantityBtn}
                onClick={handleIncrement}
                aria-label={`เพิ่มจำนวนของ ${item.item_name}`}
              >
                <FaPlusIcon size={12} />
              </button>
            </div>
          </div>
        </div>
        <div className={styles.submitRow}>
          <button className={styles.cancelBtn} onClick={onClose} aria-label="ยกเลิก">
            ยกเลิก
          </button>
          <button className={styles.submitBtn} onClick={handleConfirm} aria-label="ยืนยัน">
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
};

// CartModal component
const CartModal = ({ isOpen, onClose, selectedItems, setSelectedItems, handleSubmit, showToast, handleClearCart }) => {
  const [localItems, setLocalItems] = useState(selectedItems);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setLocalItems(selectedItems);
  }, [selectedItems]);

  const handleQuantityChange = (itemId, value) => {
    setLocalItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId ? { ...item, requested_qty: Math.max(1, Number(value)) } : item
      )
    );
  };

  const handleNoteChange = (itemId, value) => {
    setLocalItems((prev) =>
      prev.map((item) => (item.item_id === itemId ? { ...item, note: value } : item))
    );
  };

  const handleRemoveItem = (itemId, itemName) => {
    setSelectedItems((prev) => prev.filter((i) => i.item_id !== itemId));
    showToast("success", `${itemName} ถูกลบออกจากตะกร้า`);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await handleSubmit(localItems);
      onClose();
    } catch (err) {
      showToast("error", `ไม่สามารถส่งคำขอได้: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>ตะกร้าสินค้า ({selectedItems.length} รายการ)</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="ปิดตะกร้า">
            ✕
          </button>
        </div>
        <div className={styles.cartList}>
          {selectedItems.length ? (
            selectedItems.map((item) => (
              <div key={item.item_id} className={styles.cartItem}>
                <div className={styles.itemDetails}>
                  <h3 className={styles.itemName}>{item.item_name || "-"}</h3>
                  <span className={styles.itemMeta}>ประเภท: {mapCategoryToThai(item.item_category)}</span>
                  <span className={styles.itemMeta}>หน่วย: {item.item_purchase_unit || item.item_unit || "-"}</span>
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>จำนวน</label>
                  <input
                    type="number"
                    min="1"
                    value={localItems.find((i) => i.item_id === item.item_id)?.requested_qty || 1}
                    onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                    className={styles.inputField}
                    aria-label={`จำนวนของ ${item.item_name}`}
                    disabled={isSubmitting}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>หมายเหตุ</label>
                  <input
                    type="text"
                    value={localItems.find((i) => i.item_id === item.item_id)?.note || ""}
                    onChange={(e) => handleNoteChange(item.item_id, e.target.value)}
                    placeholder="เพิ่มหมายเหตุ"
                    className={styles.inputField}
                    aria-label={`หมายเหตุสำหรับ ${item.item_name}`}
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemoveItem(item.item_id, item.item_name)}
                  aria-label={`ลบ ${item.item_name} ออกจากตะกร้า`}
                  disabled={isSubmitting}
                >
                  <FaTrashAlt size={14} />
                </button>
              </div>
            ))
          ) : (
            <div className={styles.noItems}>
              <span role="img" aria-label="ตะกร้าว่างเปล่า">🛒</span> ยังไม่มีสินค้าในตะกร้า
            </div>
          )}
        </div>
        {selectedItems.length > 0 && (
          <div className={styles.submitRow}>
            <button
              className={styles.cancelBtn}
              onClick={handleClearCart}
              aria-label="ล้างตะกร้า"
              disabled={isSubmitting}
            >
              ล้างตะกร้า
            </button>
            <button
              className={styles.cancelBtn}
              onClick={onClose}
              aria-label="ยกเลิก"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              className={styles.submitBtn}
              onClick={handleConfirm}
              aria-label="ส่งคำขอสั่งซื้อ"
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังส่ง..." : "ส่งคำขอสั่งซื้อ"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Toast component
const Toast = ({ toasts, removeToast }) => {
  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.type === "success" && <span aria-hidden="true">✅</span>}
          {toast.type === "warning" && <span aria-hidden="true">⚠️</span>}
          {toast.type === "error" && <span aria-hidden="true">❌</span>}
          {toast.type === "info" && <span aria-hidden="true">ℹ️</span>}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

// Main component
export default function RequestPurchasePage() {
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isQuantityOpen, setIsQuantityOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const ITEMS_PER_PAGE = 10;
  const toastIdRef = useRef(0); // Use a ref for a persistent counter

  const showToast = (type, message) => {
    toastIdRef.current += 1; // Increment the counter
    const id = toastIdRef.current; // Use the new unique ID
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  // Debounce search input
  const debouncedSetSearchQuery = useMemo(
    () => debounce((value) => setSearchQuery(value), 300),
    []
  );

  // Load cart from localforage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const storedData = await localforage.getItem('selectedItems');
        if (storedData && Array.isArray(storedData)) {
          console.log('Loaded cart from localforage:', storedData);
          setSelectedItems(storedData);
         
        }
      } catch (err) {
        console.error('Error loading cart from localforage:', err);
        showToast("error", "ไม่สามารถโหลดตะกร้าจากที่เก็บข้อมูลได้");
      }
    };
    loadCart();
  }, []);

  // Validate and sync cart with items when items are loaded
  useEffect(() => {
    const syncCartWithItems = async () => {
      if (items.length === 0) return;
      try {
        const storedData = await localforage.getItem('selectedItems');
        if (storedData && Array.isArray(storedData)) {
          const validItems = storedData
            .filter((cartItem) => items.some((item) => item.item_id === cartItem.item_id))
            .map((cartItem) => {
              const currentItem = items.find((item) => item.item_id === cartItem.item_id);
              return {
                ...cartItem,
                item_name: currentItem?.item_name || cartItem.item_name,
                item_category: currentItem?.item_category || cartItem.item_category,
                item_purchase_unit: currentItem?.item_purchase_unit || cartItem.item_purchase_unit,
                item_unit: currentItem?.item_unit || cartItem.item_unit,
                current_stock: currentItem?.current_stock || cartItem.current_stock,
                item_img: currentItem?.item_img || cartItem.item_img,
              };
            });
          console.log('Synced cart items:', validItems);
          if (validItems.length !== storedData.length) {
            await localforage.setItem('selectedItems', validItems);
            if (validItems.length > 0) {
              setSelectedItems(validItems);
              showToast("info", "อัปเดตตะกร้า: ลบรายการที่ไม่ถูกต้อง");
            } else {
              await localforage.removeItem('selectedItems');
              setSelectedItems([]);
              showToast("info", "ตะกร้าเก่าไม่ถูกต้อง ล้างตะกร้าแล้ว");
            }
          } else {
            setSelectedItems(validItems);
          }
        }
      } catch (err) {
        console.error('Error syncing cart with items:', err);
        showToast("error", "ไม่สามารถซิงโครไนซ์ตะกร้าได้");
      } finally {
        setLoading(false);
      }
    };
    syncCartWithItems();
  }, [items]);

  // Save cart to localforage with debounce
  useEffect(() => {
    const saveCart = async () => {
      try {
        if (selectedItems.length > 0) {
          console.log('Saving cart to localforage:', selectedItems);
          await localforage.setItem('selectedItems', selectedItems);
        } else {
          await localforage.removeItem('selectedItems');
        }
      } catch (err) {
        console.error('Error saving cart to localforage:', err);
        showToast("error", "ไม่สามารถบันทึกตะกร้าได้");
      }
    };
    const timeout = setTimeout(saveCart, 500);
    return () => clearTimeout(timeout);
  }, [selectedItems]);

  // Clear cart
  const handleClearCart = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "ยืนยันการล้างตะกร้า",
      text: "คุณต้องการล้างรายการทั้งหมดในตะกร้าหรือไม่?",
      showCancelButton: true,
      confirmButtonText: "ล้าง",
      cancelButtonText: "ยกเลิก",
      customClass: {
        confirmButton: styles.submitBtn,
        cancelButton: styles.cancelBtn,
      },
    });
    if (result.isConfirmed) {
      try {
        await localforage.removeItem('selectedItems');
        setSelectedItems([]);
        showToast("success", "ล้างตะกร้าเรียบร้อย");
      } catch (err) {
        console.error('Error clearing cart:', err);
        showToast("error", "ไม่สามารถล้างตะกร้าได้");
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const itemsRes = await manageAxios.get("/pr/items");
      setItems(Array.isArray(itemsRes.data) ? itemsRes.data.filter(Boolean) : []);
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลได้: " + (err.response?.data?.message || err.message));
      showToast("error", "ไม่สามารถดึงข้อมูลได้");
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

    const handleItemUpdate = () => {
      if (isMounted) {
        fetchData();
      }
    };

    const handleLowStockItem = async (lowStockData) => {
      console.log('Received lowStockItem:', lowStockData);

      const {
        item_id,
        item_name,
        requested_qty,
        note,
        item_unit,
        item_purchase_unit,
        item_category,
        current_stock,
        item_img,
      } = lowStockData;

      if (!item_id || !item_name) return;

      // 1) โหลด cart ปัจจุบัน
      let storedCart = await localforage.getItem('selectedItems') || [];

      // 2) เช็คซ้ำ
      if (storedCart.some((i) => i.item_id === item_id)) {
        console.log(`⏭️ ${item_name} already in cart`);
        return;
      }

      // 3) สร้าง item ใหม่
      const newItem = {
        item_id,
        item_name,
        item_unit,
        item_purchase_unit,
        item_category,
        current_stock,
        requested_qty: requested_qty || 1,
        note: note || "เพิ่มอัตโนมัติ: คงเหลือต่ำกว่าขั้นต่ำ",
        item_img,
      };

      storedCart.push(newItem);

      // 4) บันทึกกลับไปยัง localforage
      await localforage.setItem('selectedItems', storedCart);

      // 5) sync state
      setSelectedItems(storedCart);

      showToast("warning", `เพิ่ม ${item_name} ${requested_qty || 1} ${item_unit} ลงในตะกร้าเนื่องจากสต็อกต่ำ`);
    };


    const handleConnect = () => {
      console.log("🟢 WebSocket reconnected");
      socket.emit("joinRoom", "user_999"); // TODO: เปลี่ยนเป็น user_id จริง
    };

    const handleDisconnect = () => {
      console.log("🔴 WebSocket disconnected, attempting to reconnect...");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("itemAdded", handleItemUpdate);
    socket.on("itemUpdated", handleItemUpdate);
    socket.on("itemLotUpdated", handleItemUpdate);
    socket.on("itemDeleted", handleItemUpdate);
    socket.on("lowStockItem", handleLowStockItem);

    return () => {
      isMounted = false;
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("itemAdded", handleItemUpdate);
      socket.off("itemUpdated", handleItemUpdate);
      socket.off("itemLotUpdated", handleItemUpdate);
      socket.off("itemDeleted", handleItemUpdate);
      socket.off("lowStockItem", handleLowStockItem);
      disconnectSocket();
    };
  }, []); // Removed selectedItems from dependencies

  const filteredItems = useMemo(() => {
    let filtered = items.filter(
      (item) =>
        (item.item_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.item_purchase_unit || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.item_category?.toLowerCase() === categoryFilter);
    }

    if (stockFilter === "low") {
      filtered = filtered.filter((item) => item.item_min && item.current_stock < item.item_min);
    } else if (stockFilter === "near-low") {
      filtered = filtered.filter(
        (item) =>
          item.item_min &&
          item.current_stock >= item.item_min &&
          item.current_stock <= item.item_min + 10
      );
    }
    return filtered;
  }, [items, searchQuery, categoryFilter, stockFilter]);

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
    if (selectedItems.length >= 50) {
      showToast("warning", "ตะกร้าเต็ม กรุณาส่งคำขอหรือลบรายการบางส่วน");
      return;
    }
    if (selectedItems.some((i) => i.item_id === item.item_id)) {
      showToast("warning", `${item.item_name} อยู่ในตะกร้าแล้ว`);
      return;
    }
    setSelectedItem(item);
    setIsQuantityOpen(true);
  };

  const handleQuantityConfirm = (item, quantity) => {
    setSelectedItems((prev) => {
      const newItem = { ...item, requested_qty: quantity, note: "" };
      const updatedCart = [...prev, newItem];
      console.log('Manually added to cart:', updatedCart); // Debug log
      return updatedCart;
    });
    showToast("success", `เพิ่ม ${item.item_name} ลงในตะกร้า`);
  };

  const handleSubmit = async (itemsToSubmit) => {
    if (!itemsToSubmit || !itemsToSubmit.length) {
      await Swal.fire({
        icon: "warning",
        title: "คำเตือน",
        text: "กรุณาเลือกรายการอย่างน้อย 1 รายการ",
        confirmButtonText: "ตกลง",
        customClass: {
          confirmButton: styles.submitBtn,
        },
      });
      return;
    }

    try {
      await manageAxios.post("/pr", {
        requester_id: 999, // TODO: แทนที่ด้วย user_id จริงจาก context หรือ auth
        items_to_purchase: itemsToSubmit.map((i) => ({
          item_id: i.item_id,
          qty: i.requested_qty,
          unit: i.item_purchase_unit || i.item_unit,
          note: i.note,
        })),
      });

      await Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: "ส่งคำขอสั่งซื้อเรียบร้อย",
        confirmButtonText: "ตกลง",
        customClass: {
          confirmButton: styles.submitBtn,
        },
      });

      setSelectedItems([]);
      await localforage.removeItem('selectedItems');
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: `ไม่สามารถส่งคำขอได้: ${err.response?.data?.message || err.message}`,
        confirmButtonText: "ตกลง",
        customClass: {
          confirmButton: styles.submitBtn,
        },
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
          <button className={styles.cartButton} onClick={() => setIsCartOpen(true)} aria-label="เปิดตะกร้าสินค้า">
            <FaShoppingCart size={16} /> ตะกร้า ({selectedItems.length})
          </button>
        </div>

        <section className={styles.leftPanel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>เลือกสินค้า</h2>
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>ประเภท:</label>
                <select
                  className={styles.filterSelect}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  aria-label="เลือกประเภทสินค้า"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="medicine">ยา</option>
                  <option value="medsup">เวชภัณฑ์</option>
                  <option value="equipment">ครุภัณฑ์</option>
                  <option value="meddevice">เครื่องมือแพทย์</option>
                  <option value="general">ของใช้ทั่วไป</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>สถานะสต็อก:</label>
                <select
                  className={styles.filterSelect}
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  aria-label="เลือกสถานะสต็อก"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="low">ต่ำกว่ากำหนด</option>
                  <option value="near-low">ใกล้ต่ำสุด</option>
                </select>
              </div>
              <div className={styles.filterGroup}>
                <div className={styles.searchBox}>
                  <FaSearch size={14} className={styles.searchIcon} aria-hidden="true" />
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="ค้นหาสินค้า..."
                    onChange={(e) => debouncedSetSearchQuery(e.target.value)}
                    aria-label="ค้นหาสินค้าหรือหน่วยจัดซื้อ"
                  />
                </div>
              </div>
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
                    <div className={`${styles.tableCell} ${styles.imageCell}`}>
                      <ImageWithFallback item={item} />
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
                      <button
                        className={styles.addBtn}
                        onClick={() => handleAddItem(item)}
                        aria-label={`เพิ่ม ${item.item_name} ลงในตะกร้า`}
                      >
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
                  disabled={currentPage === totalPages}
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        </section>

        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          handleSubmit={handleSubmit}
          showToast={showToast}
          handleClearCart={handleClearCart}
        />
        <QuantityModal
          isOpen={isQuantityOpen}
          onClose={() => setIsQuantityOpen(false)}
          item={selectedItem}
          onConfirm={handleQuantityConfirm}
          showToast={showToast}
        />
        <Toast toasts={toasts} removeToast={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      </div>
    </div>
  );
}