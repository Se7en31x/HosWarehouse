// src/app/manage/request-purchase/page.jsx
"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import { FaPlus, FaTrashAlt } from 'react-icons/fa'; // ✅ เพิ่มไอคอนสำหรับปุ่ม

export default function RequestPurchasePage() {
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // ✅ ปรับแก้: ดึงข้อมูลรายการสินค้าจริงจาก API
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

    const handleAddItem = (item) => {
        // ป้องกันการเพิ่มรายการซ้ำ
        if (!selectedItems.some(i => i.item_id === item.item_id)) {
            setSelectedItems([...selectedItems, {
                item_id: item.item_id,
                item_name: item.item_name,
                item_unit: item.item_unit,
                requested_qty: 1,
                note: ''
            }]);
        }
    };

    const handleQuantityChange = (itemId, qty) => {
        setSelectedItems(selectedItems.map(item =>
            item.item_id === itemId ? { ...item, requested_qty: parseInt(qty, 10) } : item
        ));
    };

    const handleNoteChange = (itemId, note) => {
        setSelectedItems(selectedItems.map(item =>
            item.item_id === itemId ? { ...item, note } : item
        ));
    };

    const handleRemoveItem = (itemId) => {
        setSelectedItems(selectedItems.filter(item => item.item_id !== itemId));
    };

    // ✅ ปรับแก้: ส่งข้อมูลคำขอซื้อจริงไปที่ API
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedItems.length === 0) {
            alert("กรุณาเลือกรายการสินค้าที่ต้องการสั่งซื้ออย่างน้อย 1 รายการ");
            return;
        }

        const payload = {
            requester_id: 1, // ✅ ต้องดึงมาจากสถานะผู้ใช้ที่ล็อกอินอยู่
            items_to_purchase: selectedItems.map(item => ({
                item_id: item.item_id,
                qty: item.requested_qty,
                unit: item.item_unit,
                note: item.note,
            })),
        };

        try {
            const response = await axiosInstance.post('/purchase-request', payload);
            alert(response.data.message);
            setSelectedItems([]); // ล้างรายการหลังจากส่งสำเร็จ
        } catch (err) {
            console.error('Error submitting purchase request:', err.response?.data || err.message);
            alert(`เกิดข้อผิดพลาดในการส่งคำขอ: ${err.response?.data?.message || 'โปรดลองอีกครั้ง'}`);
        }
    };

    if (loading) {
        return <div className={styles.container}>กำลังโหลดข้อมูล...</div>;
    }

    if (error) {
        return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div className={styles.container}>
            <h1>สร้างรายการสั่งซื้อใหม่</h1>
            <form onSubmit={handleSubmit}>
                <div className={styles.itemSelection}>
                    <h2>เลือกสินค้าที่ต้องการ</h2>
                    <ul className={styles.itemList}>
                        {items.map(item => (
                            <li key={item.item_id}>
                                <span>{item.item_name} ({item.item_unit})</span>
                                <button type="button" onClick={() => handleAddItem(item)}>
                                    <FaPlus /> เพิ่ม
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={styles.selectedItems}>
                    <h2>รายการที่เลือก ({selectedItems.length})</h2>
                    {selectedItems.length === 0 ? (
                        <p className={styles.emptyList}>ยังไม่มีรายการที่เลือก</p>
                    ) : (
                        <ul className={styles.selectedItemList}>
                            {selectedItems.map(item => (
                                <li key={item.item_id}>
                                    <div className={styles.itemDetails}>
                                        <p>{item.item_name} ({item.item_unit})</p>
                                        <div className={styles.inputGroup}>
                                            <label>จำนวน:</label>
                                            <input
                                                type="number"
                                                value={item.requested_qty}
                                                onChange={(e) => handleQuantityChange(item.item_id, e.target.value)}
                                                min="1"
                                            />
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>หมายเหตุ:</label>
                                            <input
                                                type="text"
                                                value={item.note}
                                                onChange={(e) => handleNoteChange(item.item_id, e.target.value)}
                                                placeholder="เพิ่มหมายเหตุ (ถ้ามี)"
                                            />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveItem(item.item_id)} className={styles.removeButton}>
                                        <FaTrashAlt />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button type="submit" className={styles.submitButton}>ส่งคำขอสั่งซื้อ</button>
            </form>
        </div>
    );
}