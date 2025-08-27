"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaPlus, FaTrashAlt, FaSearch } from "react-icons/fa";
import Swal from "sweetalert2";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
        const itemsRes = await axiosInstance.get("/pr/items"); // ✅ ใช้ /items
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

  // Add / Remove Items
  const handleAddItem = (item) => {
    if (!selectedItems.some((i) => i.item_id === item.item_id)) {
      setSelectedItems((prev) => [...prev, { ...item, requested_qty: 1, note: "" }]);
    }
  };

  const handleQuantityChange = (id, qty) => {
    setSelectedItems((prev) =>
      prev.map((i) => (i.item_id === id ? { ...i, requested_qty: Math.max(1, Number(qty)) } : i))
    );
  };

  const handleNoteChange = (id, note) => {
    setSelectedItems((prev) => prev.map((i) => (i.item_id === id ? { ...i, note } : i)));
  };

  const handleRemoveItem = (id) => {
    setSelectedItems((prev) => prev.filter((i) => i.item_id !== id));
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
            <span aria-hidden="true">🛒</span> สร้างคำขอสั่งซื้อ
          </h1>
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
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ชื่อสินค้า</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>คงเหลือ</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>ขั้นต่ำ</div>
              <div className={styles.headerItem}>สูงสุด</div>
              <div className={styles.headerItem}>เพิ่ม</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
              {paginatedItems.length ? (
                paginatedItems.map((item) => (
                  <div key={item.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}>{item.item_name}</div>
                    <div className={styles.tableCell}>{item.item_category || "-"}</div>
                    <div className={styles.tableCell}>{item.current_stock ?? 0}</div>
                    <div className={styles.tableCell}>{item.item_unit}</div>
                    <div className={styles.tableCell}>{item.item_min ?? "-"}</div>
                    <div className={styles.tableCell}>{item.item_max ?? "-"}</div>
                    <div className={styles.tableCell}>
                      <button onClick={() => handleAddItem(item)}>เพิ่ม</button>
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

        {/* Cart Section */}
        <section className={styles.rightPanel}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              ตะกร้าสินค้า <span className={styles.cartCount}>({selectedItems.length} รายการ)</span>
            </h2>
          </div>

          <div className={styles.selectedList}>
            {selectedItems.length ? (
              selectedItems.map((item) => (
                <div key={item.item_id} className={styles.itemCard}>
                  <div className={styles.itemRow}>
                    <div className={styles.itemInfo}>
                      <strong className={styles.itemName}>{item.item_name || "-"}</strong>
                      <span className={styles.itemCategory}>ประเภท: {item.item_category || "-"}</span>
                      <span className={styles.itemUnit}>
                        หน่วย: {item.item_purchase_unit || item.item_unit || "-"}
                      </span>
                    </div>
                    <div className={styles.itemControls}>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>จำนวน</label>
                        <input
                          type="number"
                          min="1"
                          value={item.requested_qty}
                          onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                          className={styles.input}
                          aria-label={`จำนวนสำหรับ ${item.item_name}`}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label className={styles.label}>หมายเหตุ</label>
                        <input
                          type="text"
                          value={item.note}
                          placeholder="เพิ่มหมายเหตุ"
                          onChange={(e) => handleNoteChange(item.item_id, e.target.value)}
                          className={styles.input}
                          aria-label={`หมายเหตุสำหรับ ${item.item_name}`}
                        />
                      </div>
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemoveItem(item.item_id)}
                        aria-label={`ลบ ${item.item_name} ออกจากตะกร้า`}
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noDataMessage}>
                <span role="img" aria-label="ตะกร้าว่างเปล่า">🛒</span> ยังไม่มีสินค้าในตะกร้า
              </div>
            )}
          </div>

          <div className={styles.submitRow}>
            <button className={styles.submitButton} onClick={handleSubmit} aria-label="ส่งคำขอสั่งซื้อ">
              ส่งคำขอสั่งซื้อ
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
