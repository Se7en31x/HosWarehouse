"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import Swal from "sweetalert2";
import axiosInstance from "@/app/utils/axiosInstance";

// ✅ แผนที่สำหรับการแปลประเภทการนำเข้า
const importTypeMap = {
  purchase: "จัดซื้อ",
  general: "รับเข้าทั่วไป",
  return: "คืนพัสดุ",
  repair_return: "คืนจากซ่อม",
  adjustment: "ปรับปรุงยอด",
};

// ✅ แผนที่สำหรับการแปลสถานะ
const importStatusMap = {
  draft: "ร่าง",
  waiting_approval: "รอการอนุมัติ",
  posted: "บันทึกแล้ว",
  canceled: "ยกเลิก",
};

export default function ImportHistory() {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axiosInstance.get("/history/import");
        setData(res.data || []);
      } catch (err) {
        console.error("Error fetching import history:", err);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH");
  };

  // ✅ ตารางปกติ (purchase, general, adjustment)
  const renderDetailTable = (details) => {
    if (!details || details.length === 0) return "<p>ไม่มีข้อมูลสินค้า</p>";

    return `
      <table border="1" width="100%" style="border-collapse: collapse; text-align:center;">
        <thead>
          <tr>
            <th>#</th>
            <th>พัสดุ</th>
            <th>จำนวน</th>
            <th>ราคา/หน่วย</th>
            <th>Lot No</th>
            <th>วันหมดอายุ</th>
          </tr>
        </thead>
        <tbody>
          ${details
            .map(
              (d, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${d.item_name}</td>
                  <td>${d.quantity || 0} ${d.item_unit || ""}</td>
                  <td>${d.import_price || "-"}</td>
                  <td>${d.lot_no || "-"}</td>
                  <td>${d.exp_date ? formatDate(d.exp_date) : "-"}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  // ✅ ตารางพิเศษสำหรับ repair_return
  const renderRepairReturnTable = (details) => {
    if (!details || details.length === 0)
      return "<p>ไม่มีข้อมูลการซ่อมคืน</p>";

    return `
      <table border="1" width="100%" style="border-collapse: collapse; text-align:center;">
        <thead>
          <tr>
            <th>#</th>
            <th>พัสดุ</th>
            <th>จำนวนที่รับเข้า</th>
            <th>สาเหตุชำรุด</th>
          </tr>
        </thead>
        <tbody>
          ${details
            .map(
              (d, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${d.item_name}</td>
                  <td>${d.quantity || 0} ${d.item_unit || ""}</td>
                  <td>${d.damage_note || "-"}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  // ✅ ตารางพิเศษสำหรับ return (คืนพัสดุ)
  const renderReturnTable = (details) => {
    if (!details || details.length === 0)
      return "<p>ไม่มีข้อมูลการคืน</p>";

    return `
      <table border="1" width="100%" style="border-collapse: collapse; text-align:center;">
        <thead>
          <tr>
            <th>#</th>
            <th>พัสดุ</th>
            <th>จำนวนที่คืน</th>
            <th>Lot No</th>
            <th>สภาพ</th>
          </tr>
        </thead>
        <tbody>
          ${details
            .map(
              (d, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${d.item_name}</td>
                  <td>${d.quantity || 0} ${d.item_unit || ""}</td>
                  <td>${d.lot_no || "-"}</td>
                  <td>${d.condition || "ปกติ"}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  // ✅ ฟังก์ชัน render content ตามประเภท
  const renderModalContent = (row) => {
    switch (row.import_type) {
      case "purchase":
        return `
          <p><b>Supplier:</b> ${row.source_name || "-"}</p>
          <p><b>เลขที่ PO:</b> ${row.po_no || "-"}</p>
          <p><b>หมายเหตุ:</b> ${row.import_note || "-"}</p>
          ${renderDetailTable(row.details)}
        `;
      case "general":
        return `
          <p><b>ผู้บริจาค:</b> ${row.source_name || "-"}</p>
          <p><b>หมายเหตุ:</b> ${row.import_note || "-"}</p>
          ${renderDetailTable(row.details)}
        `;
      case "return":
        return `
          <p><b>คืนจากคำขอ:</b> ${row.request_code || "-"}</p>
          ${renderReturnTable(row.details)}
        `;
      case "repair_return":
        return `
          <p><b>ศูนย์ซ่อม:</b> ${row.source_name || "-"}</p>
          <p><b>หมายเหตุ:</b> ${row.import_note || "-"}</p>
          ${renderRepairReturnTable(row.details)}
        `;
      case "adjustment":
        return `
          <p><b>เหตุผลปรับปรุง:</b> ${row.import_note || "-"}</p>
          <p><b>ผู้ตรวจนับ:</b> ${row.imported_by || "-"}</p>
          ${renderDetailTable(row.details)}
        `;
      default:
        return `
          <p><b>แหล่งที่มา:</b> ${row.source_name || "-"}</p>
          ${renderDetailTable(row.details)}
        `;
    }
  };

  const showDetail = async (row) => {
    Swal.fire({
      title: `รายละเอียดการนำเข้า (${importTypeMap[row.import_type] || row.import_type
        })`,
      html: `
        <p><b>เลขที่เอกสาร:</b> ${row.import_no || "-"}</p>
        <p><b>วันที่นำเข้า:</b> ${formatDate(row.import_date)}</p>
        <p><b>ผู้นำเข้า:</b> ${row.imported_by}</p>
        <p><b>สถานะ:</b> ${importStatusMap[row.import_status] || row.import_status
        }</p>
        <hr/>
        ${renderModalContent(row)}
      `,
      width: "900px",
    });
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>ประวัติการนำเข้า (Import)</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>วันที่</th>
            <th>เลขที่เอกสาร</th>
            <th>ประเภท</th>
            <th>แหล่งที่มา</th>
            <th>ผู้นำเข้า</th>
            <th>สถานะ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row) => (
              <tr key={row.import_id}>
                <td>{formatDate(row.import_date)}</td>
                <td>{row.import_no || "-"}</td>
                <td>{importTypeMap[row.import_type] || row.import_type}</td>
                <td>{row.source_name || "-"}</td>
                <td>{row.imported_by}</td>
                <td>
                  {importStatusMap[row.import_status] || row.import_status}
                </td>
                <td>
                  <button
                    onClick={() => showDetail(row)}
                    className={styles.btn}
                  >
                    ดูรายละเอียด
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" style={{ textAlign: "center" }}>
                ไม่มีข้อมูลการนำเข้า
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
