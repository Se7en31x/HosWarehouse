"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";

export default function RequestDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [header, setHeader] = useState(null);
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequestDetail = async () => {
            try {
                const res = await axiosInstance.get(`/my-requests/${id}`);
                setHeader(res.data.header);
                setDetails(res.data.details);
            } catch (err) {
                console.error("Error fetching request detail:", err);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchRequestDetail();
    }, [id]);

    const requestStatusMap = {
        waiting_approval: "คำขอรอการอนุมัติ",
        approved_all: "อนุมัติทั้งหมด",
        rejected_all: "ปฏิเสธทั้งหมด",
        approved_partial: "อนุมัติบางส่วน",
        rejected_partial: "ปฏิเสธบางส่วน",
        approved_partial_and_rejected_partial: "อนุมัติ/ปฏิเสธบางส่วน",
    };

    const approvalStatusMap = {
        approved: "✅ อนุมัติ",
        partial: "⚠️ อนุมัติบางส่วน",
        rejected: "❌ ปฏิเสธ",
        waiting_approval_detail: "⌛ รออนุมัติ",
    };

    const processingStatusMap = {
        waiting_approval_detail: "รออนุมัติ",
        preparing: "กำลังเตรียมของ",   // ✅ เพิ่ม
        processing: "กำลังดำเนินการ",
        completed: "เสร็จสิ้น",
        returned: "คืนแล้ว",
    };
    const getRequestStatusBadge = (status) => {
        let statusClass = styles.statusBadge;
        if (status === "approved_all") statusClass += ` ${styles.statusSuccess}`;
        else if (status === "rejected_all") statusClass += ` ${styles.statusCancelled}`;
        else if (
            status === "approved_partial" ||
            status === "rejected_partial" ||
            status === "approved_partial_and_rejected_partial"
        )
            statusClass += ` ${styles.statusMixed}`;
        else statusClass += ` ${styles.statusPending}`;
        return <span className={statusClass}>{requestStatusMap[status] || status}</span>;
    };

    const getUrgentBadge = (isUrgent) => {
        let urgentClass = styles.urgentBadge;
        return <span className={urgentClass + (isUrgent ? ` ${styles.urgentTrue}` : ` ${styles.urgentFalse}`)}>
            {isUrgent ? "เร่งด่วน" : "ปกติ"}
        </span>;
    };

    return (
        <div className={styles.mainHome}>
            <div className={styles.infoContainer}>
                <button className={styles.backBtn} onClick={() => router.back()}>⬅ กลับ</button>

                {loading ? (
                    <div className={styles.noDataCell}>⏳ กำลังโหลดข้อมูล...</div>
                ) : !header ? (
                    <div className={styles.noDataCell}>❌ ไม่พบข้อมูลคำขอ</div>
                ) : (
                    <>
                        <div className={styles.detailHeader}>
                            <h2>รายละเอียดคำขอ {header.request_code}</h2>
                            <p><strong>วันที่ขอ:</strong> {header.request_date}</p>
                            <p><strong>ผู้ขอ:</strong> {header.user_name}</p>
                            <p><strong>ประเภท:</strong> {header.request_type === "borrow" ? "ยืม" : "เบิก"}</p>
                            <p><strong>ความเร่งด่วน:</strong> {getUrgentBadge(header.is_urgent)}</p>
                            <p><strong>สถานะคำขอ:</strong> {getRequestStatusBadge(header.request_status)}</p>
                            {header.request_note && (<p><strong>หมายเหตุ:</strong> {header.request_note}</p>)}
                            <p><strong>รวมทั้งหมด:</strong> {header.total_requested} ที่ขอ / {header.total_approved} ที่อนุมัติ</p>
                        </div>

                        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                            <div>รหัส</div>
                            <div>รูป</div>
                            <div>ชื่อรายการ</div>
                            <div>ประเภท</div>
                            <div>จำนวนที่ขอ/อนุมัติ</div>
                            <div>หน่วย</div>
                            <div>สถานะอนุมัติ</div>
                            <div>สถานะการดำเนินการ</div>
                            <div>กำหนดคืน</div>
                        </div>

                        {details.map((d) => (
                            <div key={d.request_detail_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                                <div>{d.item_code || "-"}</div>
                                <div>
                                    <img
                                        src={d.item_img ? `http://localhost:5000/uploads/${d.item_img}` : "http://localhost:5000/public/defaults/landscape.png"}
                                        alt={d.item_name}
                                        width={50}
                                        height={50}
                                        style={{ borderRadius: "6px", objectFit: "cover" }}
                                        onError={(e) => (e.target.src = "http://localhost:5000/public/defaults/landscape.png")}
                                    />
                                </div>
                                <div>{d.item_name}</div>
                                <div>{d.item_category}</div>
                                <div>{d.requested_qty} / {d.approved_qty ?? 0}</div>
                                <div>{d.item_unit}</div>
                                <div>{approvalStatusMap[d.approval_status] || "-"}</div>
                                <div>{processingStatusMap[d.processing_status] || "-"}</div>
                                <div>{d.expected_return_date || "-"}</div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}
