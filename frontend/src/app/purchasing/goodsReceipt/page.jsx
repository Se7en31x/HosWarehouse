"use client";

import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";
import Link from "next/link";

const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "รอรับเพิ่ม", "เสร็จสิ้น", "ยกเลิก"];

const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  if (status?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (status?.toLowerCase() === "partial") badgeStyle = styles.partial;
  else if (status?.toLowerCase() === "cancelled") badgeStyle = styles.canceled;

  const getStatusText = (status) => {
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
  };

  return (
    <span className={`${styles.stBadge} ${badgeStyle}`}>
      {getStatusText(status)}
    </span>
  );
};

const GoodsReceiptListPage = () => {
  const [grList, setGrList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);

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

  const filteredGrList = useMemo(() => {
    const normalizedSearchTerm = searchTerm.toLowerCase();

    const getStatusKey = (thaiStatus) => {
      switch (thaiStatus) {
        case "รอดำเนินการ": return "pending";
        case "รอรับเพิ่ม": return "partial";
        case "เสร็จสิ้น": return "completed";
        case "ยกเลิก": return "cancelled";
        default: return thaiStatus;
      }
    };

    const statusMatch = (status) => {
      return filterStatus === "ทั้งหมด" || status?.toLowerCase() === getStatusKey(filterStatus);
    };

    return grList.filter(
      (gr) =>
        statusMatch(gr.status) &&
        (gr.gr_no?.toLowerCase().includes(normalizedSearchTerm) ||
          gr.po_no?.toLowerCase().includes(normalizedSearchTerm) ||
          gr.supplier_name?.toLowerCase().includes(normalizedSearchTerm))
    );
  }, [grList, filterStatus, searchTerm]);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>รายการรับสินค้า</h1>
            <p className={styles.subtitle}>ดูและจัดการรายการรับสินค้าทั้งหมด</p>
          </div>
          <Link href="/purchasing/goodsReceipt/create" className={styles.noUnderline}>
            <button className={`${styles.primaryButton}`}>
              <FaPlusCircle size={18} /> เพิ่มการรับสินค้าใหม่
            </button>
          </Link>
        </div>

        <section className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label htmlFor="status-select" className={styles.label}>สถานะ</label>
              <select
                id="status-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.input}
                aria-label="เลือกสถานะการรับสินค้า"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="search-input" className={styles.label}>ค้นหา</label>
              <div className={styles.searchBar}>
                <FaSearch className={styles.searchIcon} />
                <input
                  id="search-input"
                  className={styles.input}
                  placeholder="ค้นหา: เลขที่ GR, PO, ซัพพลายเออร์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="ค้นหาการรับสินค้า"
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.tableSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : filteredGrList.length === 0 ? (
            <div className={styles.noDataMessage}>ไม่พบรายการรับสินค้าที่ตรงกับเงื่อนไข</div>
          ) : (
            <>
              <div
                className={`${styles.tableGrid} ${styles.tableHeader}`}
                role="region"
                aria-label="ตารางรายการรับสินค้า"
              >
                <div className={styles.headerItem}>เลขที่ GR</div>
                <div className={styles.headerItem}>เลขที่ PO</div>
                <div className={styles.headerItem}>วันที่รับ</div>
                <div className={styles.headerItem}>ซัพพลายเออร์</div>
                <div className={styles.headerItem}>สถานะ</div>
                <div className={styles.headerItem}>การจัดการ</div>
              </div>
              <div className={styles.inventory}>
                {filteredGrList.map((gr) => (
                  <div key={gr.gr_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.mono}`}>{gr.gr_no || "-"}</div>
                    <div className={`${styles.tableCell} ${styles.mono}`}>{gr.po_no || "-"}</div>
                    <div className={`${styles.tableCell}`}>{new Date(gr.gr_date).toLocaleDateString("th-TH")}</div>
                    <div className={`${styles.tableCell} ${styles.textWrap}`}>{gr.supplier_name || "-"}</div>
                    <div className={`${styles.tableCell}`}><StatusBadge status={gr.status} /></div>
                    <div className={`${styles.tableCell} ${styles.actionsCell}`}>
                      <Link href={`/purchasing/goodsReceipt/${gr.gr_id}`} className={styles.noUnderline}>
                        <button className={`${styles.secondaryButton}`} aria-label={`ดูรายละเอียดการรับสินค้า ${gr.gr_no}`}>
                          <FaEye size={18} />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default GoodsReceiptListPage;