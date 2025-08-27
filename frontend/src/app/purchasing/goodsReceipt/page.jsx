"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";

const GoodsReceiptListPage = () => {
  const [grList, setGrList] = useState([]);
  const [loading, setLoading] = useState(true);

  // โหลดรายการ GR
  useEffect(() => {
    const fetchGRs = async () => {
      try {
        const res = await axiosInstance.get("/gr");
        setGrList(res.data);
      } catch (err) {
        Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchGRs();
  }, []);

  if (loading) return <div>กำลังโหลด...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📦 รายการรับสินค้า (Goods Receipt)</h1>

      <div className={styles.actions}>
        <Link href="/purchasing/goodsReceipt/create">
          <button className={styles.button}>➕ เพิ่มการรับสินค้าใหม่</button>
        </Link>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>เลขที่ GR</th>
            <th>เลขที่ PO</th>
            <th>วันที่รับ</th>
            <th>ซัพพลายเออร์</th>
            <th>สถานะ</th>
            <th>การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          {grList.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "#6b7280" }}>
                ยังไม่มีการรับสินค้า
              </td>
            </tr>
          ) : (
            grList.map((gr) => (
              <tr key={gr.gr_id}>
                <td>{gr.gr_no}</td>
                <td>{gr.po_no}</td>
                <td>{new Date(gr.gr_date).toLocaleDateString("th-TH")}</td>
                <td>{gr.supplier_name}</td>
                <td>{gr.status}</td>
                <td>
                  <Link href={`/purchasing/goodsReceipt/${gr.gr_id}`}>
                    <button className={styles.viewButton}>ดูรายละเอียด</button>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GoodsReceiptListPage;
