"use client";

import { useState, useEffect } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import styles from "./page.module.css";
import { FaSearch, FaEye, FaFilter } from "react-icons/fa";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  const normalized = status?.toLowerCase();

  if (normalized === "approved") badgeStyle = styles.approved;
  else if (normalized === "completed") badgeStyle = styles.completed;
  else if (normalized === "canceled") badgeStyle = styles.canceled;

  return (
    <span className={`${styles.stBadge} ${badgeStyle}`}>
      {status || "รอดำเนินการ"}
    </span>
  );
};

export default function PurchaseHistory() {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // ✅ ฟิลเตอร์วันที่
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // ✅ Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/po");
        setHistory(res.data);
      } catch (err) {
        console.error("Error loading history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // ✅ ฟิลเตอร์ข้อมูล
  const filteredHistory = history.filter((po) => {
    const matchSearch =
      po.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const poDate = new Date(po.created_at);
    const matchDate =
      (!startDate || poDate >= new Date(startDate)) &&
      (!endDate || poDate <= new Date(endDate));

    return matchSearch && matchDate;
  });

  // ✅ Pagination slice
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredHistory.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // ✅ Export Excel
  const exportToExcel = () => {
    const data = filteredHistory.map((po) => ({
      "เลขที่ PO": po.po_no,
      "วันที่": new Date(po.created_at).toLocaleDateString("th-TH"),
      "ซัพพลายเออร์": po.supplier_name || "-",
      "รวมก่อน VAT": po.subtotal,
      "VAT": po.vat_amount,
      "ยอดสุทธิ": po.grand_total,
      "สถานะ": po.po_status,
      "ผู้ใช้ที่ออก": po.creator_name || "ไม่ทราบ",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase History");
    XLSX.writeFile(wb, "purchase-history.xlsx");
  };

  // ✅ Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("รายงานประวัติการสั่งซื้อ", 14, 15);

    const tableData = filteredHistory.map((po) => [
      po.po_no,
      new Date(po.created_at).toLocaleDateString("th-TH"),
      po.supplier_name || "-",
      po.subtotal.toLocaleString(),
      po.vat_amount.toFixed(2),
      po.grand_total.toFixed(2),
      po.po_status,
      po.creator_name || "ไม่ทราบ",
    ]);

    doc.autoTable({
      head: [["เลขที่ PO", "วันที่", "ซัพพลายเออร์", "รวมก่อน VAT", "VAT", "ยอดสุทธิ", "สถานะ", "ผู้ใช้ที่ออก"]],
      body: tableData,
      startY: 25,
    });

    doc.save("purchase-history.pdf");
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.pageBar}>
        <h1 className={styles.pageTitle}>📜 ประวัติการสั่งซื้อ</h1>

        <div className={styles.filters}>
          <div className={styles.searchBar}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="ค้นหา: PO No หรือ ซัพพลายเออร์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.dateFilter}>
            <FaFilter className={styles.filterIcon} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.input}
            />
            <span className={styles.dateSeparator}>ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.input}
            />
          </div>

          {/* ปุ่ม Export */}
          <div className={styles.exportButtons}>
            <button className={styles.primaryButton} onClick={exportToExcel}>📊 Excel</button>
            <button className={styles.primaryButton} onClick={exportToPDF}>📄 PDF</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingContainer}>กำลังโหลด...</div>
      ) : filteredHistory.length === 0 ? (
        <div className={styles.noDataMessage}>ยังไม่มีประวัติการสั่งซื้อ</div>
      ) : (
        <>
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div>เลขที่ PO</div>
              <div>วันที่</div>
              <div>ซัพพลายเออร์</div>
              <div>รวม (ก่อน VAT)</div>
              <div>VAT</div>
              <div>ยอดสุทธิ</div>
              <div>สถานะ</div>
              <div>ผู้ใช้ที่ออก</div>
              <div>การจัดการ</div>
            </div>
            {currentItems.map((po) => (
              <div
                key={po.po_id}
                className={`${styles.tableGrid} ${styles.tableRow}`}
              >
                <div>{po.po_no}</div>
                <div>{new Date(po.created_at).toLocaleDateString("th-TH")}</div>
                <div>{po.supplier_name || "-"}</div>
                <div>{Number(po.subtotal).toLocaleString()} บาท</div>
                <div>{Number(po.vat_amount).toFixed(2)} บาท</div>
                <div>{Number(po.grand_total).toFixed(2)} บาท</div>
                <div><StatusBadge status={po.po_status} /></div>
                <div>{po.creator_name || "ไม่ทราบ"}</div>
                <div>
                  <Link href={`/purchasing/historyPurchasing/${po.po_id}`}>
                    <button className={styles.viewBtn}>
                      <FaEye /> ดูรายละเอียด
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              ก่อนหน้า
            </button>
            <span>หน้า {currentPage} จาก {totalPages}</span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              ถัดไป
            </button>
          </div>
        </>
      )}
    </div>
  );
}
