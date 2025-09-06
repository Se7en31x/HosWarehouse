"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import { staffAxios } from "@/app/utils/axiosInstance";
import { useParams } from "next/navigation";

export default function RequestDetailPage() {
  const { id } = useParams();

  const [header, setHeader] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== Helpers =====
  const API_BASE = useMemo(() => {
    let fromAxios = staffAxios?.defaults?.baseURL?.replace(/\/+$/, "");
    // Remove /api from baseURL if present
    if (fromAxios && fromAxios.endsWith("/api")) {
      fromAxios = fromAxios.replace(/\/api$/, "");
    }
    const base =
      fromAxios || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    console.log("API_BASE:", base); // Debug API_BASE
    return base;
  }, []);

  const fmtDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const imgUrl = (val) => {
    console.log("imgUrl input:", val); // Debug input value
    if (!val) {
      console.log("imgUrl output: default image (no value)");
      return `${API_BASE}/public/defaults/landscape.png`;
    }
    let s = String(val).trim().replace(/\\/g, "/");
    // Check if the URL is an API endpoint or invalid
    if (s.includes("/api/my-requests/") || s.includes("/api/")) {
      console.warn(`Invalid image URL: ${s}, using default image`);
      return `${API_BASE}/public/defaults/landscape.png`;
    }
    if (/^https?:\/\//i.test(s)) {
      console.log("imgUrl output:", s);
      return s;
    }
    s = s.replace(/^\/?public\//i, "");
    if (/^\/?uploads\//i.test(s)) {
      const url = `${API_BASE}/${s.replace(/^\/+/, "")}`;
      console.log("imgUrl output:", url);
      return url;
    }
    if (s.startsWith("/")) {
      const url = `${API_BASE}${s}`;
      console.log("imgUrl output:", url);
      return url;
    }
    const url = `${API_BASE}/uploads/${s}`;
    console.log("imgUrl output:", url);
    return url;
  };

  useEffect(() => {
    if (!id) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await staffAxios.get(`/my-requests/${id}`, {
          signal: ctrl.signal,
        });
        console.log(
          "API Response - item_img:",
          res.data?.details?.map((d) => d.item_img)
        ); // Debug item_img
        setHeader(res.data?.header ?? null);
        setDetails(res.data?.details ?? []);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error("Error fetching request detail:", err);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [id]);

  // ===== Maps =====
  const requestStatusMap = {
    waiting_approval: "คำขอรอการอนุมัติ",
    approved_all: "อนุมัติทั้งหมด",
    rejected_all: "ปฏิเสธทั้งหมด",
    approved_partial: "อนุมัติบางส่วน",
    rejected_partial: "ปฏิเสธบางส่วน",
    approved_partial_and_rejected_partial: "อนุมัติ/ปฏิเสธบางส่วน",
  };
  const approvalStatusMap = {
    approved: "อนุมัติ",
    partial: "อนุมัติบางส่วน",
    rejected: "ปฏิเสธ",
    waiting_approval_detail: "รออนุมัติ",
  };
  const processingStatusMap = {
    waiting_approval_detail: "รออนุมัติ",
    preparing: "กำลังเตรียมของ",
    processing: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    returned: "คืนแล้ว",
    approved_in_queue: "อนุมัติแล้ว รอคิว",
  };
  const categoryMap = {
    medicine: "ยา",
    medsup: "เวชภัณฑ์",
    equipment: "ครุภัณฑ์",
    meddevice: "อุปกรณ์ทางการแพทย์",
    general: "ของใช้ทั่วไป",
  };

  // ===== Badges ของ detail table เท่านั้น =====
  const getApprovalBadge = (st) => {
    let cls = `${styles.badge} `;
    if (st === "approved") cls += styles.apprApproved;
    else if (st === "partial") cls += styles.apprPartial;
    else if (st === "rejected") cls += styles.apprRejected;
    else cls += styles.apprWaiting;
    return <span className={cls}>{approvalStatusMap[st] || "-"}</span>;
  };

  const getProcessingBadge = (st) => {
    let cls = `${styles.badge} `;
    if (st === "preparing") cls += styles.procPreparing;
    else if (st === "processing") cls += styles.procProcessing;
    else if (st === "completed") cls += styles.procCompleted;
    else if (st === "returned") cls += styles.procReturned;
    else if (st === "approved_in_queue") cls += styles.procWaiting;
    else cls += styles.procWaiting;
    return <span className={cls}>{processingStatusMap[st] || "-"}</span>;
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <h1 className={styles.pageTitle}>รายละเอียดคำขอ</h1>

        {loading ? (
          <div className={styles.noDataCell}>⏳ กำลังโหลดข้อมูล...</div>
        ) : !header ? (
          <div className={styles.noDataCell}>❌ ไม่พบข้อมูลคำขอ</div>
        ) : (
          <>
            {/* Summary card */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryRowTop}>
                <div>
                  <strong>เลขคำขอ:</strong> {header.request_code}
                </div>
                <div>
                  <strong>วันที่ขอ:</strong> {fmtDate(header.request_date)}
                </div>
                <div>
                  <strong>ผู้ขอ:</strong> {header.user_name || "-"}
                </div>
                <div>
                  <strong>ประเภท:</strong>{" "}
                  {header.request_type === "borrow" ? "ยืม" : "เบิก"}
                </div>
              </div>

              <div className={styles.summaryRowBottom}>
                <div>
                  <strong>ความเร่งด่วน:</strong>{" "}
                  {header.is_urgent ? "เร่งด่วน" : "ปกติ"}
                </div>
                <div>
                  <strong>สถานะคำขอ:</strong>{" "}
                  {requestStatusMap[header.request_status] || "-"}
                </div>
              </div>

              {header.request_note && (
                <div className={styles.summaryNote}>
                  <strong>หมายเหตุ:</strong> {header.request_note}
                </div>
              )}
            </div>

            {/* ===== TABLE ===== */}
            <div className={styles.tableFrame}>
              <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                <div>รูปภาพ</div>
                <div>ชื่อรายการ</div>
                <div>ประเภท</div>
                <div>จำนวนที่ขอ/อนุมัติ</div>
                <div>หน่วย</div>
                <div>สถานะการอนุมัติ</div>
                <div>สถานะการดำเนินการ</div>
                <div>กำหนดคืน</div>
              </div>

              <div className={styles.tableBody}>
                {details.length > 0 ? (
                  details.map((d) => {
                    const due =
                      header?.request_type === "borrow"
                        ? fmtDate(d.expected_return_date)
                        : "-";
                    return (
                      <div
                        key={d.request_detail_id}
                        className={`${styles.tableGrid} ${styles.tableRow}`}
                      >
                        <div>
                          <img
                            src={imgUrl(d.item_img)}
                            alt={d.item_name || "item"}
                            width={45}
                            height={45}
                            className={styles.imgThumb}
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (img.dataset.fallback !== "1") {
                                console.warn(
                                  `Image failed to load: ${img.src}, using default`
                                );
                                img.src = `${API_BASE}/public/defaults/landscape.png`;
                                img.dataset.fallback = "1";
                              }
                            }}
                          />
                        </div>
                        <div title={d.item_name}>{d.item_name || "-"}</div>
                        <div>{categoryMap[d.item_category] || "-"}</div>
                        <div className={styles.mono}>
                          {(d.requested_qty ?? 0)} / {(d.approved_qty ?? 0)}
                        </div>
                        <div>{d.item_unit || "-"}</div>
                        <div>{getApprovalBadge(d.approval_status)}</div>
                        <div>{getProcessingBadge(d.processing_status)}</div>
                        <div className={styles.mono}>{due}</div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.noDataCell}>ไม่พบรายการ</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
