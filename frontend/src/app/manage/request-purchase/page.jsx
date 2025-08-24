"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaPlus, FaTrashAlt } from "react-icons/fa";
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

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await axiosInstance.get("/items");
                setItems(res.data);
            } catch {
                setError("ไม่สามารถดึงข้อมูลรายการสินค้าได้");
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
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

    const handleAddItem = (item) => {
        if (!selectedItems.some((i) => i.item_id === item.item_id)) {
            setSelectedItems((prev) => [...prev, { ...item, requested_qty: 1, note: "" }]);
        }
    };

    const handleQuantityChange = (id, qty) => {
        setSelectedItems((prev) =>
            prev.map((i) =>
                i.item_id === id ? { ...i, requested_qty: Math.max(1, Number(qty)) } : i
            )
        );
    };

    const handleNoteChange = (id, note) => {
        setSelectedItems((prev) => prev.map((i) => (i.item_id === id ? { ...i, note } : i)));
    };

    const handleRemoveItem = (id) => {
        setSelectedItems((prev) => prev.filter((i) => i.item_id !== id));
    };

    const handleSubmit = async () => {
        if (!selectedItems.length) {
            Swal.fire("แจ้งเตือน", "กรุณาเลือกรายการอย่างน้อย 1 รายการ", "warning");
            return;
        }
        const confirm = await Swal.fire({
            title: "ยืนยันการส่งคำขอ?",
            text: `คุณต้องการส่งคำขอสั่งซื้อ ${selectedItems.length} รายการใช่หรือไม่?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "ใช่",
            cancelButtonText: "ยกเลิก",
        });
        if (confirm.isConfirmed) {
            try {
                await axiosInstance.post("/purchase-request", {
                    requester_id: 1,
                    items_to_purchase: selectedItems.map((i) => ({
                        item_id: i.item_id,
                        qty: i.requested_qty,
                        unit: i.item_purchase_unit || i.item_unit,
                        note: i.note,
                    })),
                });
                Swal.fire("สำเร็จ", "ส่งคำขอสั่งซื้อเรียบร้อย", "success");
                setSelectedItems([]);
            } catch {
                Swal.fire("ผิดพลาด", "ไม่สามารถส่งคำขอได้", "error");
            }
        }
    };

    if (loading) return <div className={styles.loading}>กำลังโหลด...</div>;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.mainHome}>
            <h1 className={styles.pageTitle}>สร้างคำขอสั่งซื้อ</h1>

            <div className={styles.contentGrid}>
                {/* === ซ้าย: เลือกสินค้า === */}
                <section className={styles.leftPanel}>
                    <div className={styles.sectionHeader}>
                        <h2>เลือกสินค้า</h2>
                        <input
                            type="text"
                            className={styles.searchBox}
                            placeholder="ค้นหาสินค้า..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className={styles.tableSection}>
                        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                            <div>ชื่อสินค้า</div>
                            <div>คงเหลือ</div>
                            <div>หน่วย</div>
                            <div>จัดซื้อ</div>
                            <div>เพิ่ม</div>
                        </div>

                        <div className={styles.inventory} style={{ "--rows-per-page": ITEMS_PER_PAGE }}>
                            {paginatedItems.length ? (
                                paginatedItems.map((item) => (
                                    <div key={item.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                                        <div>{item.item_name}</div>
                                        <div className={styles.centerCell}>
                                            <span className={styles.stockPill}>{item.current_stock ?? 0}</span>
                                        </div>
                                        <div>{item.item_unit}</div>
                                        <div>{item.item_purchase_unit || "-"}</div>
                                        <div className={styles.centerCell}>
                                            <button className={styles.addBtn} onClick={() => handleAddItem(item)}>
                                                <FaPlus />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.noData}>ไม่พบข้อมูล</div>
                            )}
                        </div>

                        {/* Pagination */}
                        <ul className={styles.paginationControls}>
                            <li>
                                <button
                                    className={styles.pageButton}
                                    onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                                    disabled={currentPage === 1}
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
                                            className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""
                                                }`}
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
                                    onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </li>
                        </ul>
                    </div>
                </section>

                {/* === ขวา: ตะกร้ารายการ === */}
                <section className={styles.rightPanel}>
                    <div className={styles.sectionHeader}>
                        <h2>
                            ตะกร้ารายการ
                            <span className={styles.cartCount}>
                                ({selectedItems.length} รายการ)
                            </span>
                        </h2>
                    </div>

                    {selectedItems.length ? (
                        <div className={styles.selectedList}>
                            {selectedItems.map((item) => (
                                <div key={item.item_id} className={styles.itemCard}>
                                    <div className={styles.itemInfo}>
                                        <strong>{item.item_name}</strong>
                                        <span>{item.item_purchase_unit || "-"}</span>
                                    </div>
                                    <div className={styles.itemActions}>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.requested_qty}
                                            onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            value={item.note}
                                            placeholder="หมายเหตุ"
                                            onChange={(e) => handleNoteChange(item.item_id, e.target.value)}
                                        />
                                        <button
                                            className={styles.removeBtn}
                                            onClick={() => handleRemoveItem(item.item_id)}
                                        >
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.noData}>ยังไม่มีรายการ</p>
                    )}
                </section>
            </div>

            <div className={styles.submitRow}>
                <button className={styles.submitButton} onClick={handleSubmit}>
                    ส่งคำขอสั่งซื้อ
                </button>
            </div>
        </div>
    );
}
