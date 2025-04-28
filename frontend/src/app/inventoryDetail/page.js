"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from '../utils/axiosInstance';
import { useSearchParams } from 'next/navigation';

export default function InventoryDetail() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true); // สำหรับเช็คว่าโหลดข้อมูลอยู่ไหม
    const [error, setError] = useState(null);

    useEffect(() => {
        if (id) {
            // ใช้ข้อมูลตัวอย่าง
            const inventoryData = [
                {
                    id: '1',
                    image: "https://example.com/bandage.jpg",
                    category: "ผ้าพันแผล",
                    type: "อุปกรณ์ทางการแพทย์",
                    quantity: 100,
                    unit: "กล่อง",
                    status: "พร้อมใช้งาน",
                    storage: "คลังกลาง",
                    lastUpdated: "2025-12-31",
                },
                {
                    id: '2',
                    image: "https://example.com/medical_supplies.jpg",
                    category: "เวชภัณฑ์",
                    type: "อุปกรณ์ทางการแพทย์",
                    quantity: 50,
                    unit: "ชุด",
                    status: "พร้อมใช้งาน",
                    storage: "คลังกลาง",
                    lastUpdated: "2025-12-25",
                },
                // เพิ่มข้อมูลอื่น ๆ ตามต้องการ
            ];

            // หา item ตาม id
            const foundItem = inventoryData.find(item => item.id === id);

            if (foundItem) {
                setItem(foundItem);
            } else {
                setError("ไม่พบข้อมูล");
            }
            setLoading(false);
        }
    }, [id]);

    if (loading) {
        return <div className={styles.loading}>กำลังโหลดข้อมูล...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!item) {
        return <div className={styles.notFound}>ไม่พบข้อมูล</div>;
    }

    return (
        <div className={styles.detailContainer}>
            <h1 className={styles.title}>รายละเอียดพัสดุ</h1>
            <div className={styles.card}>
                <img src={item.image} alt={item.category} className={styles.image} />
                <div className={styles.info}>
                    <p><strong>หมวดหมู่:</strong> {item.category}</p>
                    <p><strong>ประเภท:</strong> {item.type}</p>
                    <p><strong>จำนวน:</strong> {item.quantity} {item.unit}</p>
                    <p><strong>สถานะ:</strong> {item.status}</p>
                    <p><strong>คลังเก็บ:</strong> {item.storage}</p>
                    <p><strong>อัปเดตล่าสุด:</strong> {item.lastUpdated}</p>
                </div>
            </div>
        </div>
    );
}