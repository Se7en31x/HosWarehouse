// src/app/purchasing/rfq/create/page.jsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function CreateRfqPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const prId = searchParams.get('pr_id');

    const [prDetails, setPrDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (prId) {
            const fetchPrDetails = async () => {
                try {
                    const response = await axiosInstance.get(`/pr/${prId}`);
                    setPrDetails(response.data);
                    setError(null);
                } catch (err) {
                    console.error("Error fetching PR details:", err);
                    setError("ไม่สามารถดึงข้อมูล PR เพื่อสร้าง RFQ ได้");
                } finally {
                    setLoading(false);
                }
            };
            fetchPrDetails();
        } else {
            setLoading(false);
            setError("ไม่พบหมายเลข PR ที่ต้องการสร้าง RFQ");
        }
    }, [prId]);


    const handleCreateRfq = async () => {
        setIsSaving(true);
        try {
            const itemsToRfq = prDetails.items.map(item => ({
                item_id: item.item_id,
                // ✅ แก้ไขจาก item.qty เป็น item.requested_qty
                qty: item.requested_qty,
                // ✅ แก้ไขจาก item.unit เป็น item.purchase_unit
                unit: item.purchase_unit,
                remark: item.note // เปลี่ยน note เป็น remark ให้ตรงกับตาราง rfq_detail
            }));

            const response = await axiosInstance.post('/rfq', {
                created_by: 1,
                pr_id: prDetails.pr_id,
                items_to_rfq: itemsToRfq
            });

            toast.success("สร้างใบขอราคาสำเร็จ!");
            router.push(`/purchasing/rfq/${response.data.rfqId}`);

        } catch (err) {
            console.error("Error creating RFQ:", err);
            toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการสร้างใบขอราคา");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <div className={styles.container}>กำลังโหลดข้อมูล PR...</div>;
    }

    if (error) {
        return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;
    }

    if (!prDetails) {
        return <div className={styles.container}>ไม่พบข้อมูล PR ที่ต้องการสร้าง</div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>สร้างใบขอราคา (RFQ)</h1>
            <div className={styles.prInfo}>
                <p>อ้างอิงจากใบขอซื้อเลขที่: <strong>{prDetails.pr_no}</strong></p>
                <p>ผู้ร้องขอ: {prDetails.requester_name}</p>
            </div>

            <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>ชื่อสินค้า</th>
                        <th>จำนวนที่ขอ</th>
                        <th>หน่วย</th>
                        <th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>
                    {prDetails.items.map((item, index) => (
                        // ✅ เพิ่ม key prop ที่นี่
                        <tr key={item.pr_detail_id || index}>
                            <td>{index + 1}</td>
                            <td>{item.item_name}</td>
                            <td>{item.requested_qty}</td>
                            <td>{item.purchase_unit}</td>
                            <td>{item.note || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className={styles.buttonContainer}>
                <button
                    className={styles.createButton}
                    onClick={handleCreateRfq}
                    disabled={isSaving}
                >
                    {isSaving ? 'กำลังบันทึก...' : 'สร้างใบขอราคา'}
                </button>
            </div>
        </div>
    );
}