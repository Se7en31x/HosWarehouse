"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
// import styles from "./page.module.css";

export default function PRDetailPage() {
  const { id } = useParams();
  const [pr, setPr] = useState(null);

  useEffect(() => {
    const fetchPR = async () => {
      try {
        const res = await axiosInstance.get(`/historyPurchasing/pr/${id}/grouped`);
        setPr(res.data);
      } catch (err) {
        console.error("Error fetching PR detail:", err);
      }
    };
    fetchPR();
  }, [id]);

  if (!pr) return <p>กำลังโหลด...</p>;

  return (
    <div className={styles.container}>
      <h2>📝 รายละเอียด PR {pr.pr_no}</h2>
      <p>วันที่: {new Date(pr.request_date).toLocaleDateString("th-TH")}</p>
      <p>จำนวนที่ขอ: {pr.total_requested}</p>
      <p>สร้าง PO แล้ว: {pr.total_po}</p>
      <p>รับแล้ว: {pr.total_received}</p>
    </div>
  );
}
