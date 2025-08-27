"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";

const GoodsReceiptDetailPage = () => {
  const { id } = useParams();
  const [grData, setGrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGR = async () => {
      try {
        const res = await axiosInstance.get(`/gr/${id}`);
        setGrData(res.data);
      } catch (err) {
        Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchGR();
  }, [id]);

  if (loading) return <div>กำลังโหลด...</div>;
  if (!grData) return <div>ไม่พบข้อมูล GR</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>รายละเอียดการรับสินค้า (GR)</h1>

      <div className={styles.detail}>
        <p><b>เลขที่ GR:</b> {grData.gr_no}</p>
        <p><b>เลขที่ PO:</b> {grData.po_no}</p>
        <p><b>วันที่รับ:</b> {new Date(grData.gr_date).toLocaleDateString("th-TH")}</p>
        <p><b>ซัพพลายเออร์:</b> {grData.supplier_name}</p>
        <p><b>สถานะ:</b> {grData.status}</p>
      </div>

      <h3>📦 รายการสินค้า</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>สินค้า</th>
            <th>จำนวนสั่งซื้อ</th>
            <th>จำนวนที่รับจริง</th>
            <th>Lot</th>
            <th>วันหมดอายุ</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {grData.items.map((item) => (
            <tr key={item.gr_item_id}>
              <td>{item.item_name}</td>
              <td>{item.qty_ordered} {item.unit}</td>
              <td>{item.qty_received}</td>
              <td>{item.lot_no || "-"}</td>
              <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("th-TH") : "-"}</td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default GoodsReceiptDetailPage;
