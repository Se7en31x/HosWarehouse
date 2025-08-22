"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import { FaPlus, FaTrashAlt, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import Swal from 'sweetalert2'; 

export default function RequestPurchasePage() {
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await axiosInstance.get('/items');
                setItems(response.data);
                setError(null);
            } catch (err) {
                console.error("Error fetching items:", err);
                setError("ไม่สามารถดึงข้อมูลรายการสินค้าได้");
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, []);

    const filteredItems = items.filter(item =>
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.item_purchase_unit && item.item_purchase_unit.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredItems.slice(indexOfFirstItem, indexOfFirstItem + itemsPerPage);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

    const handleAddItem = (item) => {
        if (!selectedItems.some(i => i.item_id === item.item_id)) {
            setSelectedItems([...selectedItems, {
                item_id: item.item_id,
                item_name: item.item_name,
                item_unit: item.item_unit,
                item_purchase_unit: item.item_purchase_unit,
                requested_qty: 1,
                note: ''
            }]);
        }
    };

    const handleQuantityChange = (itemId, qty) => {
        const newQty = parseInt(qty, 10);
        if (!isNaN(newQty) && newQty > 0) {
            setSelectedItems(selectedItems.map(item =>
                item.item_id === itemId ? { ...item, requested_qty: newQty } : item
            ));
        }
    };

    const handleNoteChange = (itemId, note) => {
        setSelectedItems(selectedItems.map(item =>
            item.item_id === itemId ? { ...item, note } : item
        ));
    };

    const handleRemoveItem = (itemId) => {
        setSelectedItems(selectedItems.filter(item => item.item_id !== itemId));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        if (selectedItems.length === 0) {
            Swal.fire({
                title: 'แจ้งเตือน',
                text: 'กรุณาเลือกรายการสินค้าที่ต้องการสั่งซื้ออย่างน้อย 1 รายการ',
                icon: 'warning',
                confirmButtonText: 'ตกลง'
            });
            return;
        }
    
        // ✅ เพิ่มหน้าต่างยืนยันก่อนส่งข้อมูล
        const result = await Swal.fire({
            title: 'ยืนยันการสร้างคำขอ?',
            text: `คุณต้องการส่งคำขอสั่งซื้อจำนวน ${selectedItems.length} รายการใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ใช่, ส่งเลย!',
            cancelButtonText: 'ยกเลิก'
        });
    
        // ถ้าผู้ใช้กด "ใช่, ส่งเลย!"
        if (result.isConfirmed) {
            const payload = {
                requester_id: 1, 
                items_to_purchase: selectedItems.map(item => ({
                    item_id: item.item_id,
                    qty: item.requested_qty,
                    unit: item.item_purchase_unit || item.item_unit,
                    note: item.note,
                })),
            };
    
            try {
                await axiosInstance.post('/purchase-request', payload);
                Swal.fire({
                    title: 'สำเร็จ!',
                    text: 'ส่งคำขอสั่งซื้อเรียบร้อยแล้ว',
                    icon: 'success',
                    confirmButtonText: 'ตกลง'
                });
                setSelectedItems([]);
            } catch (err) {
                console.error('Error submitting purchase request:', err.response?.data || err.message);
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: err.response?.data?.message || 'ไม่สามารถส่งคำขอสั่งซื้อได้ โปรดลองอีกครั้ง',
                    icon: 'error',
                    confirmButtonText: 'ตกลง'
                });
            }
        }
    };

    const getStockStatus = (current, min, max) => {
        if (current <= min) return styles.lowStock;
        if (max && current >= max) return styles.highStock;
        return '';
    };

    if (loading) {
        return <div className={styles.container}>กำลังโหลดข้อมูล...</div>;
    }

    if (error) {
        return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.pageTitle}>สร้างรายการสั่งซื้อใหม่</h1>
            <div className={styles.requestForm}>
                <div className={styles.itemSelection}>
                    <h2 className={styles.sectionHeader}>เลือกสินค้าที่ต้องการ</h2>
                    <div className={styles.searchBox}>
                        <FaSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="ค้นหาสินค้า..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                    <div className={styles.tableWrapper}>
                        <table className={styles.itemTable}>
                            <thead>
                                <tr>
                                    <th>ชื่อสินค้า</th>
                                    <th>จำนวนคงเหลือ</th>
                                    <th>หน่วยในคลัง</th>
                                    <th>จำนวนขั้นต่ำ</th>
                                    <th>จำนวนสูงสุด</th>
                                    <th>หน่วยจัดซื้อ</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.length > 0 ? (
                                    currentItems.map(item => (
                                        <tr key={item.item_id}>
                                            <td>{item.item_name}</td>
                                            <td className={getStockStatus(item.current_stock, item.item_min, item.item_max)}>
                                                {item.current_stock}
                                            </td>
                                            <td>{item.item_unit}</td>
                                            <td>{item.item_min || '-'}</td>
                                            <td>{item.item_max || '-'}</td>
                                            <td>{item.item_purchase_unit || '-'}</td>
                                            <td>
                                                <button type="button" onClick={() => handleAddItem(item)} className={styles.addButton}>
                                                    <FaPlus />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyTable}>ไม่พบรายการสินค้า</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredItems.length > itemsPerPage && (
                        <div className={styles.pagination}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <FaChevronLeft />
                            </button>
                            <span>หน้า {currentPage} จาก {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <FaChevronRight />
                            </button>
                        </div>
                    )}
                </div>

                <div className={styles.selectedItems}>
                    <h2 className={styles.sectionHeader}>รายการที่เลือก ({selectedItems.length})</h2>
                    <div className={styles.tableWrapper}>
                        {selectedItems.length === 0 ? (
                            <p className={styles.emptyList}>ยังไม่มีรายการที่เลือก</p>
                        ) : (
                            <table className={styles.selectedTable}>
                                <thead>
                                    <tr>
                                        <th>ชื่อสินค้า</th>
                                        <th>จำนวน</th>
                                        <th>หน่วยจัดซื้อ</th>
                                        <th>หมายเหตุ</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedItems.map(item => (
                                        <tr key={item.item_id}>
                                            <td>{item.item_name}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={item.requested_qty}
                                                    onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                                                    min="1"
                                                />
                                            </td>
                                            <td>{item.item_purchase_unit || '-'}</td>
                                            <td>
                                                <input
                                                    type="text"
                                                    value={item.note}
                                                    onChange={(e) => handleNoteChange(item.item_id, e.target.value)}
                                                    placeholder="เพิ่มหมายเหตุ"
                                                />
                                            </td>
                                            <td>
                                                <button type="button" onClick={() => handleRemoveItem(item.item_id)} className={styles.removeButton}>
                                                    <FaTrashAlt />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <button type="button" onClick={handleSubmit} className={styles.submitButton}>ส่งคำขอสั่งซื้อ</button>
                </div>
            </div>
        </div>
    );
}