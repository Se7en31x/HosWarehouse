// src/app/purchasing/rfq/page.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaPlus, FaEye } from "react-icons/fa";

export default function RfqListPage() {
  const [rfqList, setRfqList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRfq = async () => {
      try {
        const response = await axiosInstance.get("/rfq/all");
        setRfqList(response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching RFQ list:", err);
        setError("ไม่สามารถดึงข้อมูลรายการใบขอราคาได้");
      } finally {
        setLoading(false);
      }
    };
    fetchRfq();
  }, []);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return <div className={styles.container}>กำลังโหลดข้อมูล...</div>;
  }

  if (error) {
    return (
      <div className={styles.container} style={{ color: "red" }}>
        {error}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>รายการใบขอราคา (RFQ)</h1>
        {/* <Link href="/purchasing/rfq/create" className={styles.createButton}>
          <FaPlus />
          <span style={{ marginLeft: 6 }}>สร้างใบขอราคาใหม่</span>
        </Link> */}
      </div>

      {rfqList.length === 0 ? (
        <p>ยังไม่มีรายการใบขอราคาในระบบ</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>เลขที่ RFQ</th>
              <th>สถานะ</th>
              <th>วันที่สร้าง</th>
              <th>ผู้สร้าง</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {rfqList.map((rfq) => (
              <tr key={rfq.rfq_id}>
                <td>{rfq.rfq_no}</td>
                <td>{rfq.status}</td>
                <td>{formatDate(rfq.created_at)}</td>
                <td>{rfq.created_by_name}</td>
                <td>
                  <Link href={`/purchasing/rfq/${rfq.rfq_id}`} className={styles.viewButton}>
                    <FaEye />
                    <span style={{ marginLeft: 6 }}>ดูรายละเอียด</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
