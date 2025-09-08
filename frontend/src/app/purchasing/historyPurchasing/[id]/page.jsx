"use client";

import { useState, useEffect, useMemo } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { PackageCheck } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import Link from "next/link";

const StatusBadge = ({ status }) => {
    let badgeStyle = styles.pending;
    if (status?.toLowerCase() === "approved") badgeStyle = styles.approved;
    else if (status?.toLowerCase() === "completed") badgeStyle = styles.completed;
    else if (status?.toLowerCase() === "canceled") badgeStyle = styles.canceled;
    return (
        <span className={`${styles.stBadge} ${badgeStyle}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : "รอดำเนินการ"}
        </span>
    );
};

export default function HistoryDetailPage({ params }) {
    const { id } = params;
    const [poData, setPoData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPoDetail = async () => {
            try {
                setLoading(true);
                const res = await purchasingAxios.get(`/po/${id}`);
                setPoData(res.data);
            } catch (err) {
                console.error("❌ load detail error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPoDetail();
    }, [id]);

    const attachmentTypes = [
        { label: "ใบเสนอราคา", type: "quotation" },
        { label: "ใบส่งของ / ใบส่งมอบ", type: "delivery_note" },
        { label: "ใบกำกับภาษี", type: "tax_invoice" },
        { label: "ใบแจ้งหนี้", type: "invoice" },
        { label: "หลักฐานการจ่ายเงิน", type: "payment_proof" },
        { label: "ใบเสร็จรับเงิน", type: "receipt" },
        { label: "สัญญาซื้อขาย", type: "contract" },
        { label: "อื่น ๆ", type: "other" },
    ];

    const groupedFiles = useMemo(() => {
        return poData?.attachments?.reduce((acc, file) => {
            const category = file.file_category || "other";
            acc[category] = [...(acc[category] || []), file];
            return acc;
        }, {}) || {};
    }, [poData]);

    if (loading) {
        return (
            <div className={styles.mainHome}>
                <div className={styles.infoContainer}>
                    <p>⏳ กำลังโหลด...</p>
                </div>
            </div>
        );
    }

    if (!poData) {
        return (
            <div className={styles.mainHome}>
                <div className={styles.infoContainer}>
                    <p>❌ ไม่พบข้อมูลใบสั่งซื้อ</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <div className={styles.pageBar}>
                    <div className={styles.titleGroup}>
                        <h1 className={styles.pageTitle}>
                            <PackageCheck size={28} /> รายละเอียดประวัติการสั่งซื้อ
                        </h1>
                        <p className={styles.subtitle}>
                            ใบสั่งซื้อเลขที่ {poData.po_no}
                        </p>
                    </div>
                    <Link href="/purchasing/history">
                        <button className={`${styles.ghostBtn} ${styles.actionButton}`}>
                            <FaTimes size={18} /> กลับไปประวัติ
                        </button>
                    </Link>
                </div>

                <div className={styles.detail}>
                    <h2 className={styles.sectionTitle}>📦 ข้อมูลใบสั่งซื้อ</h2>
                    <div className={styles.infoGrid}>
                        <div><strong>สถานะ:</strong> <StatusBadge status={poData.po_status} /></div>
                        <div><strong>วันที่สร้าง:</strong> {new Date(poData.created_at).toLocaleDateString("th-TH")}</div>
                        <div><strong>ซัพพลายเออร์:</strong> {poData.supplier_name || "-"}</div>
                        <div><strong>หมายเหตุ:</strong> {poData.notes || "-"}</div>
                    </div>

                    <h3 className={styles.sectionTitle}>📑 รายการสินค้า</h3>
                    <div className={styles.tableSection}>
                        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                            <div>ชื่อสินค้า</div>
                            <div>จำนวน</div>
                            <div>หน่วย</div>
                            <div>ราคา/หน่วย</div>
                            <div>ส่วนลด</div>
                            <div>รวม</div>
                        </div>
                        {poData.items?.map((item) => {
                            const total = (item.quantity * item.price) - (item.discount || 0);
                            return (
                                <div key={item.po_item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                                    <div>{item.item_name}</div>
                                    <div className={styles.centerCell}>{item.quantity}</div>
                                    <div className={styles.centerCell}>{item.unit}</div>
                                    <div className={styles.centerCell}>{item.price} บาท</div>
                                    <div className={styles.centerCell}>{item.discount || 0} บาท</div>
                                    <div className={styles.centerCell}>{total} บาท</div>
                                </div>
                            );
                        })}
                    </div>

                    <div className={styles.summaryContainer}>
                        <div className={styles.summaryRow}>
                            <span>รวม (ก่อน VAT):</span>
                            <span>{Number(poData.subtotal).toLocaleString()} บาท</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>VAT (7%):</span>
                            <span>{Number(poData.vat_amount).toFixed(2)} บาท</span>
                        </div>
                        <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
                            <span>ยอดสุทธิ:</span>
                            <span>{Number(poData.grand_total).toFixed(2)} บาท</span>
                        </div>
                    </div>

                    <h3 className={styles.sectionTitle}>📎 เอกสารแนบ</h3>
                    <div className={styles.fileGrid}>
                        {attachmentTypes.map((fileType) => (
                            <div key={fileType.type} className={styles.fileGroup}>
                                <label className={styles.fileLabel}>{fileType.label}</label>
                                <div className={styles.fileList}>
                                    {(groupedFiles[fileType.type] || []).map((file) => (
                                        <div key={file.file_id} className={styles.fileItem}>
                                            <a
                                                href={file.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.textWrap}
                                            >
                                                {file.file_name}
                                            </a>
                                        </div>
                                    ))}
                                    {(groupedFiles[fileType.type] || []).length === 0 && (
                                        <span className={styles.noFile}>ไม่มีไฟล์</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
