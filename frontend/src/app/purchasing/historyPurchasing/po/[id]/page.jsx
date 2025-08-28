"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
// import styles from "./page.module.csss";

export default function PODetailPage() {
  const { id } = useParams();
  const [grList, setGrList] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [grRes, itemsRes] = await Promise.all([
          axiosInstance.get(`/historyPurchasing/po/${id}/gr`),
          axiosInstance.get(`/historyPurchasing/po/${id}/items`)
        ]);
        setGrList(grRes.data);
        setItems(itemsRes.data);
      } catch (err) {
        console.error("Error fetching PO detail:", err);
      }
    };
    fetchData();
  }, [id]);

  return (
    <div className={styles.container}>
      <h2>📦 รายละเอียด PO {id}</h2>

      <h3>GR History</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>GR No.</th>
            <th>วันที่รับ</th>
            <th>จำนวนรับ</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>
          {grList.map(gr => (
            <tr key={gr.gr_id}>
              <td>{gr.gr_no}</td>
              <td>{new Date(gr.gr_date).toLocaleDateString("th-TH")}</td>
              <td>{gr.total_received}</td>
              <td>{gr.gr_status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Item Receiving</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>สินค้า</th>
            <th>จำนวนที่สั่ง</th>
            <th>รับแล้ว</th>
            <th>คงเหลือ</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.po_item_id}>
              <td>{item.item_name}</td>
              <td>{item.ordered_qty}</td>
              <td>{item.received_qty}</td>
              <td>{item.remaining_qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
