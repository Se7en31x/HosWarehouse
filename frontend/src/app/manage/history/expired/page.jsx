"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

export default function ExpiredHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/expired");
        const data = res.data || [];
        setRecords(data);
      } catch (err) {
        console.error("Error fetching expired history:", err);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH");
  };

  const getStatus = (expiredQty, disposedQty) => {
    const remaining = (expiredQty || 0) - (disposedQty || 0);
    if (remaining <= 0) return "ทำลายครบแล้ว";
    if (disposedQty > 0) return "ทำลายบางส่วนแล้ว";
    return "รอดำเนินการ";
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.subtitle}>⏳ ประวัติของหมดอายุ (Expired)</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>วันที่บันทึก</th>
            <th>Lot No</th>
            <th>พัสดุ</th>
            <th>รับเข้า</th>
            <th>หมดอายุ</th>
            <th>วันหมดอายุ</th>
            <th>สถานะ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? (
            records.map((r) => (
              <tr key={r.expired_id || r.lot_id}>
                <td>{formatDate(r.expired_date)}</td>
                <td>{r.lot_no}</td>
                <td>{r.item_name}</td>
                <td>
                  {r.qty_imported} {r.item_unit}
                </td>
                <td>
                  {r.expired_qty} {r.item_unit}
                </td>
                <td className={styles.expiredDate}>
                  {formatDate(r.exp_date)}
                </td>
                <td>{getStatus(r.expired_qty, r.disposed_qty)}</td>
                <td>
                  <button
                    className={styles.detailBtn}
                    onClick={() => setSelected(r)}
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className={styles.noData}>
                ✅ ยังไม่มีประวัติของหมดอายุ
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>📋 รายละเอียดพัสดุที่หมดอายุ</h3>

            <div className={styles.detailGrid}>
              <div>
                <b>Lot No:</b> {selected.lot_no}
              </div>
              <div>
                <b>พัสดุ:</b> {selected.item_name}
              </div>
              <div>
                <b>จำนวนรับเข้า:</b> {selected.qty_imported}{" "}
                {selected.item_unit}
              </div>
              <div>
                <b>จำนวนหมดอายุ:</b> {selected.expired_qty}{" "}
                {selected.item_unit}
              </div>
              <div>
                <b>ทำลายแล้ว:</b> {selected.disposed_qty || 0}{" "}
                {selected.item_unit}
              </div>
              <div>
                <b>คงเหลือ:</b>{" "}
                {(selected.expired_qty || 0) -
                  (selected.disposed_qty || 0)}{" "}
                {selected.item_unit}
              </div>
              <div>
                <b>วันหมดอายุ:</b> {formatDate(selected.exp_date)}
              </div>
              <div>
                <b>รายงานโดย:</b>{" "}
                {selected.user_name || "ระบบ (อัตโนมัติ)"}
              </div>
              <div>
                <b>จัดการโดย:</b>{" "}
                {selected.last_disposed_by || "ยังไม่มีข้อมูล"}
              </div>
              {selected.note && (
                <div className={styles.note}>
                  <b>หมายเหตุ:</b> {selected.note}
                </div>
              )}
            </div>

            <button
              className={styles.closeBtn}
              onClick={() => setSelected(null)}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
