"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

export default function ImportHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axiosInstance.get("/history/import").then((res) => setRecords(res.data));
  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.subtitle}>📦 ประวัติการนำเข้า (Import)</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>เลขที่เอกสาร</th>
            <th>รายการ</th>
            <th>จำนวน</th>
            <th>ผู้ดำเนินการ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.history_id}>
              <td>{new Date(r.created_at).toLocaleDateString()}</td>
              <td>{r.doc_no}</td>
              <td>{r.item_name}</td>
              <td>{r.qty} {r.unit}</td>
              <td>{r.user_name}</td>
              <td>
                <button className={styles.detailBtn} onClick={() => setSelected(r)}>
                  ดูรายละเอียด
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>รายละเอียดการนำเข้า</h3>
            <p><b>เลขที่เอกสาร:</b> {selected.doc_no}</p>
            <p><b>พัสดุ:</b> {selected.item_name} ({selected.qty} {selected.unit})</p>
            <p><b>นำเข้าโดย:</b> {selected.user_name}</p>
            <button className={styles.closeBtn} onClick={() => setSelected(null)}>ปิด</button>
          </div>
        </div>
      )}
    </div>
  );
}
