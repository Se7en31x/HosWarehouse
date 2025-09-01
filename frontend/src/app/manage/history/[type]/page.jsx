"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

const typeMap = {
  stockin: "การนำเข้า",
  withdraw: "การเบิก",
  "borrow-return": "การยืม / คืน",
  expired: "รายการหมดอายุ",
  damaged: "รายการชำรุด / สูญหาย",
  stockout: "การนำออก",
};

const translateStatus = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "เสร็จสิ้น";
    case "pending":
      return "รอดำเนินการ";
    case "processing":
      return "กำลังดำเนินการ";
    default:
      return status || "—";
  }
};

export default function HistoryTypePage() {
  const { type } = useParams();
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    axiosInstance
      .get(`/history/${type}`)
      .then((res) => setRecords(res.data))
      .catch(() => setRecords([]));
  }, [type]);

  const filteredRecords = records.filter((r) => {
    const matchSearch =
      search === "" ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.user_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "this_month" &&
        new Date(r.created_at).getMonth() === new Date().getMonth());
    return matchSearch && matchFilter;
  });

  return (
    <div className={styles.container}>
      <h2 className={styles.subtitle}>ประวัติ{typeMap[type] || type}</h2>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="🔍 ค้นหา..."
          className={styles.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filter}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">ทั้งหมด</option>
          <option value="this_month">เดือนนี้</option>
          <option value="last_month">เดือนที่แล้ว</option>
        </select>
        <button className={styles.exportBtn}>⬇️ ส่งออก CSV</button>
      </div>

      {/* Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>รายละเอียด</th>
            <th>ผู้ดำเนินการ</th>
            <th>สถานะ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((r) => (
              <tr key={r.history_id}>
                <td>{new Date(r.created_at).toLocaleString("th-TH")}</td>
                <td>{r.description}</td>
                <td>{r.user_name}</td>
                <td>
                  <span className={`${styles.badge} ${styles[r.status]}`}>
                    {translateStatus(r.status)}
                  </span>
                </td>
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
              <td colSpan="5" className={styles.noData}>
                ไม่พบข้อมูล
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal */}
      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>รายละเอียด</h3>
            <p>
              <b>วันที่:</b>{" "}
              {new Date(selected.created_at).toLocaleString("th-TH")}
            </p>
            <p>
              <b>รายละเอียด:</b> {selected.description}
            </p>
            <p>
              <b>ดำเนินการโดย:</b> {selected.user_name}
            </p>
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
