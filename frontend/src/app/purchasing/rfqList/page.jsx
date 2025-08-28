"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSearch, FaEye, FaFilePdf, FaTimes } from "react-icons/fa";
import Swal from "sweetalert2";
import exportPDF from "@/app/components/pdf/PDFExporter";

const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "อนุมัติ", "เสร็จสิ้น", "ยกเลิก"];

// Component สำหรับแสดง Badge สถานะ
const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  if (status?.toLowerCase() === "approved") badgeStyle = styles.approved;
  else if (status?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (status?.toLowerCase() === "canceled") badgeStyle = styles.canceled;
  return <span className={`${styles.badge} ${badgeStyle}`}>{status ? status.charAt(0).toUpperCase() + status.slice(1) : "รอดำเนินการ"}</span>;
};

const RFQListPage = () => {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);

  // Load RFQs
  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/rfq");
        setRfqs(res.data);
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
    fetchRFQs();
  }, []);

  // Export PDF
  const handleExportPDF = async (rfq) => {
    const items = rfq.items || [];
    try {
      await exportPDF({
        filename: `ใบขอราคา_${rfq.rfq_no}.pdf`,
        title: "ใบขอราคา (Request for Quotation)",
        meta: {
          headerBlock: [
            ["เลขที่เอกสาร", rfq.rfq_no],
            ["วันที่ออก", new Date(rfq.created_at).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })],
          ],
          leftBlock: [
            ["ผู้จัดทำ", `${rfq.user_fname} ${rfq.user_lname}`],
            ["หน่วยงาน", "งานคลังพัสดุ"],
          ],
          rightBlock: [
            ["อีเมล", "purchasing@hospital.com"],
            ["เบอร์โทร", "02-123-4567"],
          ],
          footerBlock: [
            ["เงื่อนไขการชำระเงิน", "ชำระภายใน 30 วัน"],
            ["การจัดส่ง", "จัดส่งฟรีภายใน 7 วันทำการ"],
          ],
          sections: {
            leftTitle: "ข้อมูลผู้จัดทำ",
            rightTitle: "ข้อมูลการติดต่อ",
            footerTitle: "เงื่อนไขใบขอราคา",
          },
          layout: { tableColWidths: [15, 70, 20, 20, 65] },
        },
        columns: ["ลำดับ", "ชื่อสินค้า", "จำนวน", "หน่วย", "คุณลักษณะ"],
        rows: items.map((item, idx) => [
          idx + 1,
          item.item_name || "-",
          item.qty || 0,
          item.unit || "-",
          item.spec || "-",
        ]),
        signatures: { roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"] },
        options: {
          brand: {
            name: "โรงพยาบาลตัวอย่าง",
            logoUrl: "/font/Sarabun/logo.png",
            bandColor: [0, 141, 218],
            headerBand: true,
          },
          watermark: { text: "RFQ", angle: 45 },
        },
      });
      Swal.fire({
        title: "สำเร็จ",
        text: `ดาวน์โหลดใบขอราคา ${rfq.rfq_no} เรียบร้อย`,
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: "ไม่สามารถสร้าง PDF ได้: " + (err.response?.data?.message || err.message),
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  // Filter RFQs
  const filteredRfqs = rfqs.filter(
    (rfq) =>
      (filterStatus === "ทั้งหมด" || rfq.status?.toLowerCase() === filterStatus.toLowerCase()) &&
      (rfq.rfq_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${rfq.user_fname} ${rfq.user_lname}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>รายการใบขอราคา (RFQ)</h1>
        <p className={styles.subtitle}>ดูและจัดการใบขอราคาที่สร้างแล้ว</p>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input
            className={styles.input}
            placeholder="ค้นหา: RFQ NO, ผู้จัดทำ..."
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
      </section>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap} role="region" aria-label="ตารางใบขอราคา">
          {loading ? (
            <div className={styles.empty}>กำลังโหลด...</div>
          ) : filteredRfqs.length === 0 ? (
            <div className={styles.empty}>ไม่พบใบขอราคา</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>RFQ NO</th>
                  <th>ผู้จัดทำ</th>
                  <th>วันที่สร้าง</th>
                  <th>สถานะ</th>
                  <th>การกระทำ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRfqs.map((rfq) => (
                  <tr key={rfq.rfq_id}>
                    <td className={styles.mono}>{rfq.rfq_no}</td>
                    <td>{rfq.user_fname} {rfq.user_lname}</td>
                    <td>{new Date(rfq.created_at).toLocaleDateString("th-TH")}</td>
                    <td><StatusBadge status={rfq.status} /></td>
                    <td>
                      <button
                        className={styles.primaryButton}
                        onClick={() => setSelectedRFQ(rfq)}
                      >
                        <FaEye className={styles.buttonIcon} /> ดูรายละเอียด
                      </button>
                      <button
                        className={styles.secondaryButton}
                        onClick={() => handleExportPDF(rfq)}
                      >
                        <FaFilePdf className={styles.buttonIcon} /> ออกใบ PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedRFQ && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <header className={styles.modalHeader}>
              <h2>รายละเอียด RFQ: {selectedRFQ.rfq_no}</h2>
              <button className={styles.closeButton} onClick={() => setSelectedRFQ(null)}>
                <FaTimes />
              </button>
            </header>
            <section className={styles.modalBody}>
              <p><strong>ผู้จัดทำ:</strong> {selectedRFQ.user_fname} {selectedRFQ.user_lname}</p>
              <p><strong>วันที่:</strong> {new Date(selectedRFQ.created_at).toLocaleDateString("th-TH")}</p>
              <h3>รายการสินค้า</h3>
              <table className={styles.itemTable}>
                <thead>
                  <tr>
                    <th>ชื่อสินค้า</th>
                    <th>จำนวน</th>
                    <th>หน่วย</th>
                    <th>คุณลักษณะ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRFQ.items?.map((item) => (
                    <tr key={item.rfq_item_id}>
                      <td>{item.item_name || "-"}</td>
                      <td>{item.qty || 0}</td>
                      <td>{item.unit || "-"}</td>
                      <td>{item.spec || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <footer className={styles.modalFooter}>
              <button
                className={styles.secondaryButton}
                onClick={() => handleExportPDF(selectedRFQ)}
              >
                <FaFilePdf className={styles.buttonIcon} /> ดาวน์โหลด PDF
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => setSelectedRFQ(null)}
              >
                <FaTimes className={styles.buttonIcon} /> ปิด
              </button>
            </footer>
          </div>
        </div>
      )}
    </main>
  );
};

export default RFQListPage;