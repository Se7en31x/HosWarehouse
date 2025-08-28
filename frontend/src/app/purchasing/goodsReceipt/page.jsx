"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";
import Link from "next/link";

const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "รอรับเพิ่ม", "เสร็จสิ้น", "ยกเลิก"];

// Component สำหรับแสดง Badge สถานะ
const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  if (status?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (status?.toLowerCase() === "partial") badgeStyle = styles.partial;
  else if (status?.toLowerCase() === "cancelled") badgeStyle = styles.canceled;
  return (
    <span className={`${styles.badge} ${badgeStyle}`}>
      {(() => {
        switch (status?.toLowerCase()) {
          case "completed":
            return "เสร็จสิ้น";
          case "partial":
            return "รอรับเพิ่ม";
          case "pending":
            return "รอดำเนินการ";
          case "cancelled":
            return "ยกเลิก";
          default:
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : "ไม่ทราบสถานะ";
        }
      })()}
    </span>
  );
};

const GoodsReceiptListPage = () => {
  const [grList, setGrList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);

  // Load GRs
  useEffect(() => {
    const fetchGRs = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/gr");
        setGrList(res.data);
      } catch (err) {
        Swal.fire({
          title: "ผิดพลาด",
          text: err.response?.data?.message || err.message,
          icon: "error",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      } finally {
        setLoading(false);
      }
    };
    fetchGRs();
  }, []);

  // Filter GRs
  const filteredGrList = grList.filter(
    (gr) =>
      (filterStatus === "ทั้งหมด" || gr.status?.toLowerCase() === filterStatus.toLowerCase()) &&
      (gr.gr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gr.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gr.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>รายการรับสินค้า (Goods Receipt)</h1>
        <p className={styles.subtitle}>ดูและจัดการรายการรับสินค้าทั้งหมด</p>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input
            className={styles.input}
            placeholder="ค้นหา: GR NO, PO NO, ซัพพลายเออร์..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filter}>
          <label>สถานะ:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.spacer} />
        <div className={styles.actionButtons}>
          <Link href="/purchasing/goodsReceipt/create">
            <button className={styles.primaryButton}>
              <FaPlusCircle className={styles.buttonIcon} /> เพิ่มการรับสินค้าใหม่
            </button>
          </Link>
        </div>
      </section>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap} role="region" aria-label="ตารางรายการรับสินค้า">
          {loading ? (
            <div className={styles.empty}>กำลังโหลด...</div>
          ) : filteredGrList.length === 0 ? (
            <div className={styles.empty}>ยังไม่มีการรับสินค้า</div>
          ) : (
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
                {filteredGrList.map((gr) => (
                  <tr key={gr.gr_id}>
                    <td className={styles.mono}>{gr.gr_no}</td>
                    <td className={styles.mono}>{gr.po_no}</td>
                    <td>{new Date(gr.gr_date).toLocaleDateString("th-TH")}</td>
                    <td>{gr.supplier_name || "-"}</td>
                    <td><StatusBadge status={gr.status} /></td>
                    <td>
                      <Link href={`/purchasing/goodsReceipt/${gr.gr_id}`}>
                        <button className={styles.primaryButton}>
                          <FaEye className={styles.buttonIcon} /> ดูรายละเอียด
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
};

export default GoodsReceiptListPage;