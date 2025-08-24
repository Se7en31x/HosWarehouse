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

  return (
    <div className={styles.container}>
      <h2 className={styles.subtitle}>⏳ ประวัติของหมดอายุ (Expired)</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>วันที่บันทึก</th>
            <th>Lot No</th>
            <th>พัสดุ</th>
            <th>หมดอายุ</th>
            <th>ทำลายแล้ว</th>
            <th>คงเหลือ</th>
            <th>วันหมดอายุ</th>
            <th>ผู้รายงาน</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.length > 0 ? (
            records.map((r) => {
              const remaining = (r.expired_qty || 0) - (r.disposed_qty || 0);

              return (
                <tr key={r.expired_id || r.lot_id}>
                  <td>{formatDate(r.expired_date)}</td>
                  <td>{r.lot_no}</td>
                  <td>{r.item_name}</td>
                  <td>
                    {r.expired_qty} {r.item_unit}
                  </td>
                  <td>
                    {r.disposed_qty || 0} {r.item_unit}
                  </td>
                  <td>
                    {remaining} {r.item_unit}
                  </td>
                  <td className={styles.expiredDate}>
                    {formatDate(r.exp_date)}
                  </td>
                  <td>{r.user_name || "ระบบ (อัตโนมัติ)"}</td>
                  <td>
                    <button
                      className={styles.detailBtn}
                      onClick={() => setSelected(r)}
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="9" className={styles.noData}>
                ✅ ยังไม่มีประวัติของหมดอายุ
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>รายละเอียดพัสดุที่หมดอายุ</h3>
            <p>
              <b>Lot No:</b> {selected.lot_no}
            </p>
            <p>
              <b>พัสดุ:</b> {selected.item_name}
            </p>
            <p>
              <b>จำนวนหมดอายุ:</b> {selected.expired_qty} {selected.item_unit}
            </p>
            <p>
              <b>ทำลายแล้ว:</b> {selected.disposed_qty || 0}{" "}
              {selected.item_unit}
            </p>
            <p>
              <b>คงเหลือ:</b>{" "}
              {(selected.expired_qty || 0) - (selected.disposed_qty || 0)}{" "}
              {selected.item_unit}
            </p>
            <p>
              <b>วันหมดอายุ:</b> {formatDate(selected.exp_date)}
            </p>
            <p>
              <b>รายงานโดย:</b> {selected.user_name || "ระบบ (อัตโนมัติ)"}
            </p>
            {selected.note && (
              <p>
                <b>หมายเหตุ:</b> {selected.note}
              </p>
            )}
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
