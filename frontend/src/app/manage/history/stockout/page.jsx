"use client";
import { useEffect, useState, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

export default function StockOutHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState([]); // ✅ เก็บ detail ของเอกสารที่เลือก

  // ✅ แผนที่แปลประเภท
  const typeMap = {
    withdraw: "เบิกพัสดุ",
    borrow: "ยืมออก",
    return_damaged: "คืนสภาพชำรุด",
    damaged_dispose: "ทำลายชำรุด",
    expired_dispose: "ทำลายหมดอายุ",
    adjust_out: "ปรับปรุงยอดตัดออก",
    return_lost: "สูญหาย (ตรวจนับ)",
  };

  useEffect(() => {
    axiosInstance.get("/history/stockout").then((res) => setRecords(res.data));
  }, []);

  // ✅ Dashboard
  const summary = useMemo(
    () => ({
      total: records.length,
      withdraw: records.filter((r) => r.stockout_type === "withdraw").length,
      borrow: records.filter((r) => r.stockout_type === "borrow").length,
      expired_dispose: records.filter(
        (r) => r.stockout_type === "expired_dispose"
      ).length,
    }),
    [records]
  );

  // ✅ โหลดรายละเอียดเอกสารเมื่อกดดู
  const handleShowDetail = async (doc) => {
    setSelected(doc);
    try {
      const res = await axiosInstance.get(`/history/stockout/${doc.stockout_id}`);
      setDetails(res.data || []); // ✅ ใช้ array ตรง ๆ
    } catch (err) {
      console.error("❌ Error fetching stockout detail:", err);
      setDetails([]);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.subtitle}>📦 ประวัติการตัดออกจากคลัง (Stock Out)</h2>

      {/* Dashboard */}
      <div className={styles.dashboard}>
        <div className={styles.card}>
          <h3>รวมทั้งหมด</h3>
          <p>{summary.total} เอกสาร</p>
        </div>
        <div className={styles.card}>
          <h3>เบิกพัสดุ</h3>
          <p>{summary.withdraw} เอกสาร</p>
        </div>
        <div className={styles.card}>
          <h3>ยืมออก</h3>
          <p>{summary.borrow} เอกสาร</p>
        </div>
        <div className={styles.card}>
          <h3>ทำลายหมดอายุ</h3>
          <p>{summary.expired_dispose} เอกสาร</p>
        </div>
      </div>

      {/* ตารางรายการหลัก */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>เลขที่เอกสาร</th>
            <th>ผู้ดำเนินการ</th>
            <th>ประเภท</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.stockout_id}>
              <td>{new Date(r.stockout_date).toLocaleDateString("th-TH")}</td>
              <td>{r.stockout_no || "-"}</td>
              <td>{r.user_name}</td>
              <td>{typeMap[r.stockout_type] || "อื่น ๆ"}</td>
              <td>
                <button
                  className={styles.detailBtn}
                  onClick={() => handleShowDetail(r)}
                >
                  ดูรายละเอียด
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal รายละเอียด */}
      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>รายละเอียดเอกสาร</h3>
            <p>
              <b>เลขที่เอกสาร:</b> {selected.stockout_no || "-"}
            </p>
            <p>
              <b>ตัดออกโดย:</b> {selected.user_name}
            </p>
            <p>
              <b>ประเภท:</b> {typeMap[selected.stockout_type] || "อื่น ๆ"}
            </p>
            <p>
              <b>สร้างเมื่อ:</b>{" "}
              {selected.created_at
                ? new Date(selected.created_at).toLocaleDateString("th-TH")
                : "-"}
            </p>

            {/* ✅ ตารางแสดงพัสดุในเอกสาร */}
            <h4 style={{ marginTop: "1rem" }}>รายการพัสดุ</h4>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>พัสดุ</th>
                  <th>จำนวน</th>
                  <th>Lot No</th>
                  <th>วันหมดอายุ</th>
                </tr>
              </thead>
              <tbody>
                {details.length > 0 ? (
                  details.map((d) => (
                    <tr key={d.stockout_detail_id}>
                      <td>{d.item_name}</td>
                      <td>
                        {d.qty} {d.unit}
                      </td>
                      <td>{d.lot_no || "-"}</td>
                      <td>
                        {d.exp_date
                          ? new Date(d.exp_date).toLocaleDateString("th-TH")
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: "center", color: "#6b7280" }}
                    >
                      ไม่มีข้อมูลรายการพัสดุ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <button
              className={styles.closeBtn}
              onClick={() => {
                setSelected(null);
                setDetails([]);
              }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
