'use client';

import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { CartContext } from "../context/CartContext";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import Image from "next/image";
import Swal from "sweetalert2";

export default function InventoryWithdraw() {
    const router = useRouter();

    const socketRef = useRef(null);

    const [actionType, setActionType] = useState("withdraw");

    const [returnDate, setReturnDate] = useState('');
    const [minReturnDate, setMinReturnDate] = useState('');
    const [maxReturnDate, setMaxReturnDate] = useState('');

    const [isActionTypeLoaded, setIsActionTypeLoaded] = useState(false);

    useEffect(() => {
        const savedType = localStorage.getItem("actionType");
        if (savedType === "withdraw" || savedType === "borrow") {
            setActionType(savedType);
        }

        const today = new Date();
        setMinReturnDate(today.toISOString().split('T')[0]);

        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        setMaxReturnDate(maxDate.toISOString().split('T')[0]);

        setIsActionTypeLoaded(true);

    }, []);

    useEffect(() => {
        if (isActionTypeLoaded) {
            localStorage.setItem("actionType", actionType);
        }
    }, [actionType, isActionTypeLoaded]);

    useEffect(() => {
        if (actionType === "borrow") {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setReturnDate(tomorrow.toISOString().split('T')[0]);
        } else {
            setReturnDate('');
        }
    }, [actionType]);


    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [inputQuantity, setInputQuantity] = useState(1);

    const [filter, setFilter] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("");
    const [storage, setStorage] = useState("");

    const [allItems, setAllItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    const { addToCart, cartItems, clearCart, updateQuantity, updateReturnDate } = useContext(CartContext);

    useEffect(() => {
        socketRef.current = io("http://localhost:5000");

        socketRef.current.on("connect", () => {
            console.log("🟢 Connected to WebSocket server");
            socketRef.current.emit("requestInventoryData");
        });

        socketRef.current.on("itemsData", (items) => {
            if (Array.isArray(items)) {
                const filteredValidItems = items.filter((item) => item != null);
                setAllItems(filteredValidItems);
            } else {
                setAllItems([]);
            }
        });

        socketRef.current.on("disconnect", () => {
            console.log("🔴 Disconnected from WebSocket server");
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                console.log("🔴 Socket disconnected");
            }
        };
    }, []);

    function ItemImage({ item_img, alt }) {
        const defaultImg = "http://localhost:5000/public/defaults/landscape.png";

        const [imgSrc, setImgSrc] = useState(
            item_img && typeof item_img === "string" && item_img.trim() !== ""
                ? `http://localhost:5000/uploads/${item_img}`
                : defaultImg
        );

        return (
            <Image
                src={imgSrc}
                alt={alt || "ไม่มีคำอธิบายภาพ"}
                width={70}
                height={70}
                style={{ objectFit: "cover" }}
                onError={() => setImgSrc(defaultImg)}
                loading="lazy" // Added for performance
                unoptimized // Added if the image host isn't configured for Next.js image optimization
            />
        );
    }

    const translateCategoryToEnglish = (thaiCategory) => {
        switch (thaiCategory) {
            case "ยา": return "medicine";
            case "เวชภัณฑ์": return "medsup";
            case "ครุภัณฑ์": return "equipment";
            case "อุปกรณ์ทางการแพทย์": return "meddevice";
            case "ของใช้ทั่วไป": return "general";
            default: return thaiCategory;
        }
    };

    const filteredItems = useMemo(() => {
        return allItems.filter((item) => {
            if (!item) return false;

            const englishCategory = translateCategoryToEnglish(category);
            const matchCategory = englishCategory ? item.item_category === englishCategory : true;
            const matchUnit = unit ? item.item_unit === unit : true;
            const matchStorage = storage ? item.item_location === storage : true;
            const matchFilterText = filter
                ? item.item_name?.toLowerCase().includes(filter.toLowerCase()) ||
                  item.item_id?.toLowerCase().includes(filter.toLowerCase()) ||
                  item.item_number?.toLowerCase().includes(filter.toLowerCase()) ||
                  getItemCode(item).toLowerCase().includes(filter.toLowerCase()) ||
                  translateCategory(item.item_category).toLowerCase().includes(filter.toLowerCase()) ||
                  item.item_unit?.toLowerCase().includes(filter.toLowerCase()) ||
                  item.item_status?.toLowerCase().includes(filter.toLowerCase()) ||
                  item.item_location?.toLowerCase().includes(filter.toLowerCase())
                : true;

            return matchCategory && matchUnit && matchStorage && matchFilterText;
        });
    }, [allItems, category, unit, storage, filter]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage, itemsPerPage]);

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage * itemsPerPage < filteredItems.length) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handleChangeActionType = (type) => {
        if (type === actionType) return;

        if (cartItems.length > 0) {
            Swal.fire({
                title: "รายการในตะกร้าจะหาย",
                text: "คุณต้องการเปลี่ยนประเภทการทำรายการหรือไม่?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "ใช่",
                cancelButtonText: "ไม่",
            }).then((result) => {
                if (result.isConfirmed) {
                    clearCart();
                    setActionType(type);
                    toast.info("ล้างข้อมูลในตะกร้าสำเร็จ");
                }
            });
        } else {
            setActionType(type);
        }
    };

    const handleCategoryChange = (e) => {
        setCategory(e.target.value);
    };

    const handleUnitChange = (e) => {
        setUnit(e.target.value);
    };

    const handleStorageChange = (e) => {
        setStorage(e.target.value);
    };

    const handleFilterChange = (e) => {
        setFilter(e.target.value);
    };

    const clearFilters = () => {
        setFilter("");
        setCategory("");
        setUnit("");
        setStorage("");
        setCurrentPage(1);
    };


    useEffect(() => {
        setCurrentPage(1);
    }, [filter, category, unit, storage]);

    const handleWithdrawClick = (item) => {
        setSelectedItem(item);
        setInputQuantity(1);
        setShowModal(true);
    };

    const handleBorrowClick = (item) => {
        setSelectedItem(item);
        setInputQuantity(1);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedItem(null);
        setReturnDate('');
    };

    const handleConfirm = () => {
        if (!inputQuantity || inputQuantity <= 0) {
            toast.error("กรุณากรอกจำนวนให้ถูกต้อง");
            return;
        }
        if (!selectedItem) {
            toast.error("ไม่พบข้อมูลสินค้า");
            return;
        }
        if (selectedItem.item_qty === undefined || selectedItem.item_qty === null || isNaN(selectedItem.item_qty)) {
            toast.error("ข้อมูลจำนวนคงเหลือไม่ถูกต้อง");
            return;
        }
        if (inputQuantity > selectedItem.item_qty) {
            toast.error("จำนวนไม่เพียงพอ");
            return;
        }

        if (actionType === "borrow") {
            if (!returnDate) {
                toast.error("กรุณาระบุวันที่คืน");
                return;
            }
            const selectedReturnDate = new Date(returnDate);
            const today = new Date(minReturnDate);
            const maxAllowedDate = new Date(maxReturnDate);

            today.setHours(0, 0, 0, 0);
            selectedReturnDate.setHours(0, 0, 0, 0);
            maxAllowedDate.setHours(0, 0, 0, 0);

            if (selectedReturnDate < today) {
                toast.error("วันที่คืนต้องไม่ย้อนหลังกว่าวันนี้");
                return;
            }
            if (selectedReturnDate > maxAllowedDate) {
                toast.error("วันที่คืนต้องไม่เกิน 3 เดือนนับจากวันนี้");
                return;
            }
        }

        addToCart({
            id: selectedItem.item_id,
            item_img: selectedItem.item_img
                ? `http://localhost:5000/uploads/${selectedItem.item_img}`
                : "/defaults/landscape.png",
            number: selectedItem.item_number,
            code: getItemCode(selectedItem),
            name: selectedItem.item_name,
            quantity: inputQuantity,
            unit: selectedItem.item_unit,
            type: selectedItem.item_category,
            location: selectedItem.item_location,
            action: actionType,
            returnDate: actionType === "borrow" ? returnDate : null,
            item_qty: selectedItem.item_qty,
        });

        toast.success("เพิ่มรายการเข้าตะกร้าเรียบร้อยแล้ว");
        closeModal();
    };

    const getItemCode = (item) => {
        if (!item) return "-";
        switch (item.item_category) {
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

    const translateCategory = (cat) => {
        switch (cat) {
            case "medicine":
                return "ยา";
            case "medsup":
                return "เวชภัณฑ์";
            case "equipment":
                return "ครุภัณฑ์";
            case "meddevice":
                return "อุปกรณ์ทางการแพทย์";
            case "general":
                return "ของใช้ทั่วไป";
            default:
                return cat;
        }
    };

    return (
        <div className={styles.mainHome}>
            {/* ตัวกรอง */}
            <div className={styles.infoContainer}>
                <div className={styles.cardHeader}>
                    <h1>เบิก-ยืม</h1>
                </div>

                {/* Modal */}
                {showModal && selectedItem && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h2 className={styles.modalTitle}>
                                ทำรายการ {actionType === "withdraw" ? "เบิก" : "ยืม"}
                            </h2>

                            <div className={styles.modalContentRow} style={{ display: "flex", gap: "1rem" }}>
                                <ItemImage
                                    item_img={selectedItem.item_img || ""}
                                    alt={selectedItem.item_name || "ไม่มีชื่อ"}
                                />

                                <div className={styles.modalDetails}>
                                    <div>
                                        <strong>ชื่อ:</strong> {selectedItem.item_name || "-"}
                                    </div>
                                    <div>
                                        <strong>รหัสสินค้า:</strong> {selectedItem.item_id || "-"}
                                    </div>
                                    <div>
                                        <strong>หมวดหมู่:</strong> {translateCategory(selectedItem.item_category) || "-"}
                                    </div>
                                    <div>
                                        <strong>จำนวนคงเหลือ:</strong> {selectedItem.item_qty || 0}{" "}
                                        {selectedItem.item_unit || ""}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.modalForm}>
                                <label htmlFor="quantity">จำนวนที่ต้องการ</label>
                                <input
                                    id="quantity"
                                    type="number"
                                    className={styles.modalInput}
                                    min={1}
                                    max={selectedItem.item_qty || 1}
                                    value={inputQuantity}
                                    onChange={(e) => setInputQuantity(Number(e.target.value))}
                                />
                                {/* แสดงช่องวันที่คืนถ้าเป็นประเภท 'ยืม' */}
                                {actionType === "borrow" && (
                                    <>
                                        <label htmlFor="returnDate">วันที่คืน</label>
                                        <input
                                            id="returnDate"
                                            type="date"
                                            className={styles.modalInput}
                                            value={returnDate}
                                            onChange={(e) => setReturnDate(e.target.value)}
                                            min={minReturnDate}
                                            max={maxReturnDate}
                                        />
                                    </>
                                )}
                            </div>

                            <div className={styles.modalActions}>
                                <button className={styles.modalConfirm} onClick={handleConfirm}>
                                    บันทึก
                                </button>
                                <button className={styles.modalCancel} onClick={closeModal}>
                                    ยกเลิก
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ปุ่มเลือกประเภทการทำรายการ */}
                {isActionTypeLoaded && (
                    <div className={styles.actionTypeSelector}>
                        <h3>เลือกประเภทการทำรายการ:</h3>
                        <button
                            className={actionType === "withdraw" ? styles.active : ""}
                            onClick={() => handleChangeActionType("withdraw")}
                        >
                            เบิก
                        </button>
                        <button
                            className={actionType === "borrow" ? styles.active : ""}
                            onClick={() => handleChangeActionType("borrow")}
                        >
                            ยืม
                        </button>
                    </div>
                )}
                {/* ฟิลเตอร์ */}
                <div className={styles.filterControls}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <label htmlFor="category" className={styles.filterLabel}>
                                หมวดหมู่:
                            </label>
                            <select
                                id="category"
                                className={styles.filterSelect}
                                value={category}
                                onChange={handleCategoryChange}
                            >
                                <option value="">เลือกหมวดหมู่</option>
                                <option value="ยา">ยา</option>
                                <option value="เวชภัณฑ์">เวชภัณฑ์</option>
                                <option value="ครุภัณฑ์">ครุภัณฑ์</option>
                                <option value="อุปกรณ์ทางการแพทย์">อุปกรณ์ทางการแพทย์</option>
                                <option value="ของใช้ทั่วไป">ของใช้ทั่วไป</option>
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label htmlFor="unit" className={styles.filterLabel}>
                                หน่วย:
                            </label>
                            <select
                                id="unit"
                                className={styles.filterSelect}
                                value={unit}
                                onChange={handleUnitChange}
                            >
                                <option value="">เลือกหน่วย</option>
                                <option value="ขวด">ขวด</option>
                                <option value="แผง">แผง</option>
                                <option value="ชุด">ชุด</option>
                                <option value="ชิ้น">ชิ้น</option>
                                <option value="กล่อง">กล่อง</option>
                                <option value="ห่อ">ห่อ</option>
                            </select>
                        </div>

                        <div className={styles.filterGroup}>
                            <label htmlFor="storage" className={styles.filterLabel}>
                                สถานที่จัดเก็บ:
                            </label>
                            <select
                                id="storage"
                                className={styles.filterSelect}
                                value={storage}
                                onChange={handleStorageChange}
                            >
                                <option value="">เลือกสถานที่จัดเก็บ</option>
                                <option value="ห้องเก็บยา">ห้องเก็บยา</option>
                                <option value="คลังสินค้า">คลังสินค้า</option>
                                <option value="ห้องเวชภัณฑ์">ห้องเวชภัณฑ์</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.searchControls}>
                        <div className={styles.searchGroup}>
                            <label htmlFor="filter" className={styles.filterLabel}>
                                ค้นหา:
                            </label>
                            <input
                                type="text"
                                id="filter"
                                className={styles.searchInput}
                                value={filter}
                                onChange={handleFilterChange}
                                placeholder="ค้นหาด้วยรายการ, สถานะ..."
                            />
                        </div>
                        <button
                            onClick={clearFilters}
                            className={styles.clearButton}
                        >
                            ล้างตัวกรอง
                        </button>
                    </div>
                </div>

                {/* ตารางหัวข้อ */}
                <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                    <div className={styles.headerItem}>ลำดับ</div>
                    <div className={styles.headerItem}>รหัส</div>
                    <div className={styles.headerItem}>รูปภาพ</div>
                    <div className={styles.headerItem}>ชื่อ</div>
                    <div className={styles.headerItem}>หมวดหมู่</div>
                    <div className={styles.headerItem}>จำนวน</div>
                    <div className={styles.headerItem}>หน่วย</div>
                    <div className={styles.headerItem}>สถานะ</div>
                    <div className={styles.headerItem}>สถานที่จัดเก็บ</div>
                    <div className={styles.headerItem}>แก้ไขล่าสุด</div>
                    <div className={styles.headerItem}>การจัดการ</div>
                </div>

                {/* แสดงรายการ */}
                <div className={styles.inventory}>
                    {currentItems && currentItems.length > 0 ? (
                        currentItems.map((item, index) =>
                            item ? (
                                <div
                                    className={`${styles.tableGrid} ${styles.tableRow}`}
                                    key={item.item_id || index}
                                >
                                    {/* แสดงลำดับ */}
                                    <div className={styles.tableCell}>
                                        {index + 1 + (currentPage - 1) * itemsPerPage}
                                    </div>
                                    {/* แสดงรหัส */}
                                    <div className={styles.tableCell}>{getItemCode(item)}</div>
                                    <div className={`${styles.tableCell} ${styles.imageCell}`}>
                                        <ItemImage
                                            item_img={item.item_img || ""}
                                            alt={item.item_name || "ไม่มีชื่อ"}
                                        />
                                    </div>
                                    <div className={styles.tableCell}>{item.item_name || "-"}</div>
                                    <div className={styles.tableCell}>
                                        {translateCategory(item.item_category)}
                                    </div>
                                    <div className={styles.tableCell}>{item.item_qty || 0}</div>
                                    <div className={styles.tableCell}>{item.item_unit || "-"}</div>
                                    <div className={styles.tableCell}>{item.item_status || "-"}</div>
                                    <div className={styles.tableCell}>{item.item_location || "-"}</div>
                                    <div className={styles.tableCell}>
                                        {item.item_update
                                            ? new Date(item.item_update).toLocaleDateString()
                                            : ""}
                                    </div>
                                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                                        {actionType === "withdraw" && (
                                            <button
                                                className={`${styles.actionButton} ${styles.withdrawButton}`}
                                                onClick={() => handleWithdrawClick(item)}
                                            >
                                                เบิก
                                            </button>
                                        )}
                                        {actionType === "borrow" && (
                                            <button
                                                className={`${styles.actionButton} ${styles.borrowButton}`}
                                                onClick={() => handleBorrowClick(item)}
                                            >
                                                ยืม
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : null
                        )
                    ) : (
                        <div style={{ padding: "20px", textAlign: "center" }}>ไม่พบข้อมูล</div>
                    )}

                    {/* เติมแถวว่างให้ครบ 8 รายการ */}
                    {currentItems.length < itemsPerPage &&
                        Array.from({ length: itemsPerPage - currentItems.length }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className={`${styles.tableGrid} ${styles.tableRow} ${styles.emptyRow}`}
                            >
                                {Array.from({ length: 11 }).map((_, j) => (
                                    <div key={`cell-${j}`} className={styles.tableCell}>&nbsp;</div>
                                ))}
                            </div>
                        ))}

                </div>

                {/* pagination */}
                <div className={styles.paginationControls}>
                    <button
                        className={styles.pageButton}
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                    >
                        หน้าก่อนหน้า
                    </button>
                    <span className={styles.pageInfo}>
                        หน้า {currentPage} / {totalPages}
                    </span>
                    <button
                        className={styles.pageButton}
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages}
                    >
                        หน้าถัดไป
                    </button>
                </div>
            </div>
        </div>
    );
}