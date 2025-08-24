"use client";
import { useEffect, useState, useMemo } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

// ── แผนที่แปล ──────────────────────────
const damageTypeMap = {
  damaged: "ชำรุด",
  lost: "สูญหาย",
};

const statusMap = {
  waiting: "รอดำเนินการ",
  sent_repair: "ส่งซ่อม",
  repaired: "ซ่อมเสร็จแล้ว",
  discarded: "จำหน่ายทิ้ง",
};

const sourceMap = {
  borrow_return: "คืนจากการยืม",
  stock_check: "ตรวจสต็อก",
};

export default function DamagedHistoryPage() {
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // ✅ ฟิลเตอร์และค้นหา
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // ✅ โหลด Flat list
  useEffect(() => {
    axiosInstance
      .get("/history/damaged")
      .then((res) => setRecords(res.data || []))
      .catch((err) =>
        console.error("❌ Error fetching damaged history:", err)
      );
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Dashboard Summary (นับตามประเภท)
  const summary = useMemo(() => {
    return {
      total: records.length,
      damaged: records.filter((r) => r.damage_type === "damaged").length,
      lost: records.filter((r) => r.damage_type === "lost").length,
    };
  }, [records]);

  // ✅ Filter + Search
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.item_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.reported_by?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || r.damaged_status === statusFilter;

      const matchesType =
        typeFilter === "all" || r.damage_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [records, search, statusFilter, typeFilter]);

  // ✅ โหลดรายละเอียด grouped
  const fetchDetail = async (damagedId) => {
    setLoadingDetail(true);
    try {
      const res = await axiosInstance.get(`/history/damaged/${damagedId}`);
      setSelected(res.data);
    } catch (err) {
      console.error("❌ Error fetching damaged detail:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.subtitle}>⚠️ ประวัติชำรุด / สูญหาย</h2>

      {/* ✅ Dashboard Summary */}
      <div className={styles.dashboard}>
        <div className={`${styles.card} ${styles.cardAll}`}>
          <p>ทั้งหมด</p>
          <h3>{summary.total}</h3>
        </div>
        <div className={`${styles.card} ${styles.cardDamaged}`}>
          <p>ชำรุด</p>
          <h3>{summary.damaged}</h3>
        </div>
        <div className={`${styles.card} ${styles.cardLost}`}>
          <p>สูญหาย</p>
          <h3>{summary.lost}</h3>
        </div>
      </div>

      {/* ✅ Search + Filters */}
      <div className={styles.filterBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="ค้นหาพัสดุ หรือผู้รายงาน..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">สถานะทั้งหมด</option>
          {Object.entries(statusMap).map(([key, val]) => (
            <option key={key} value={key}>
              {val}
            </option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">ทุกประเภท</option>
          {Object.entries(damageTypeMap).map(([key, val]) => (
            <option key={key} value={key}>
              {val}
            </option>
          ))}
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>พัสดุ</th>
            <th>จำนวน</th>
            <th>ประเภท</th>
            <th>ที่มา</th>
            <th>สถานะ</th>
            <th>ผู้รายงาน</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredRecords.length > 0 ? (
            filteredRecords.map((r, idx) => (
              <tr key={`${r.damaged_id}-${idx}`}>
                <td>{formatDate(r.damaged_date)}</td>
                <td>{r.item_name}</td>
                <td>
                  {r.damaged_qty} {r.item_unit}
                </td>
                <td>{damageTypeMap[r.damage_type] || r.damage_type}</td>
                <td>{sourceMap[r.source_type] || r.source_type || "-"}</td>
                <td>{statusMap[r.damaged_status] || r.damaged_status}</td>
                <td>{r.reported_by}</td>
                <td>
                  <button
                    className={styles.detailBtn}
                    onClick={() => fetchDetail(r.damaged_id)}
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className={styles.empty}>
                ไม่พบข้อมูล
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ✅ Modal รายละเอียด */}
      {selected && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalLarge}>
            <h3 className={styles.modalTitle}>รายละเอียด</h3>

            {/* ✅ ข้อมูลหลัก */}
            <div className={styles.detailGrid}>
              <div><b>พัสดุ:</b> {selected.item_name} ({selected.damaged_qty} {selected.item_unit})</div>
              <div><b>ประเภท:</b> {damageTypeMap[selected.damage_type] || selected.damage_type}</div>
              <div><b>ที่มา:</b> {sourceMap[selected.source_type] || selected.source_type || "-"}</div>
              <div><b>สถานะ:</b> {statusMap[selected.damaged_status] || selected.damaged_status}</div>
              <div><b>รายงานโดย:</b> {selected.reported_by}</div>
              <div><b>หมายเหตุ:</b> {selected.damaged_note || "-"}</div>
            </div>

            {/* ✅ เงื่อนไขแยก damaged / lost */}
            {selected.damage_type === "lost" ? (
              <div className={styles.lostNotice}>
                ❌ สูญหาย - ไม่สามารถดำเนินการเพิ่มเติมได้
              </div>
            ) : (
              <>
                <h4 className={styles.sectionTitle}>📌 การดำเนินการ</h4>
                {loadingDetail ? (
                  <p>⏳ กำลังโหลด...</p>
                ) : selected.actions && selected.actions.length > 0 ? (
                  <table className={styles.actionTable}>
                    <thead>
                      <tr>
                        <th>วันที่</th>
                        <th>ประเภทการดำเนินการ</th>
                        <th>จำนวน</th>
                        <th>ผู้ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.actions.map((a, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(a.action_date)}</td>
                          <td>{statusMap[a.action_type] || a.action_type}</td>
                          <td>{a.action_qty}</td>
                          <td>{a.action_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>ไม่มีข้อมูลการดำเนินการ</p>
                )}
              </>
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
