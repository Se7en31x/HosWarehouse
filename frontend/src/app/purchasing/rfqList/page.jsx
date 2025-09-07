"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSearch, FaEye, FaFilePdf, FaTimes } from "react-icons/fa";
import { PackageCheck } from "lucide-react";
import Swal from "sweetalert2";
import exportPDF from "@/app/components/pdf/PDFExporter";

const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "อนุมัติ", "เสร็จสิ้น", "ยกเลิก"];

const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  if (status?.toLowerCase() === "approved") badgeStyle = styles.approved;
  else if (status?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (status?.toLowerCase() === "canceled") badgeStyle = styles.canceled;
  return (
    <span className={`${styles.stBadge} ${badgeStyle}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "รอดำเนินการ"}
    </span>
  );
};

const RFQListPage = () => {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/rfq");
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
            ["ผู้จัดทำ", `${rfq.firstname} ${rfq.lastname}`],
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

  const filteredRfqs = rfqs.filter(
    (rfq) =>
      (filterStatus === "ทั้งหมด" || rfq.status?.toLowerCase() === filterStatus.toLowerCase()) &&
      (rfq.rfq_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${rfq.firstname} ${rfq.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>รายการใบขอราคา (RFQ)</h1>
            <p className={styles.subtitle}>ดูและจัดการใบขอราคาที่สร้างแล้ว</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.input}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBar}>
                <FaSearch className={styles.searchIcon} />
                <input
                  className={styles.input}
                  placeholder="ค้นหา: RFQ NO, ผู้จัดทำ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.tableSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}>กำลังโหลด...</div>
            </div>
          ) : filteredRfqs.length === 0 ? (
            <div className={styles.noDataMessage}>ไม่พบใบขอราคา</div>
          ) : (
            <>
              <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                <div className={styles.headerItem}>RFQ NO</div>
                <div className={styles.headerItem}>ผู้จัดทำ</div>
                <div className={styles.headerItem}>วันที่สร้าง</div>
                <div className={styles.headerItem}>สถานะ</div>
                <div className={styles.headerItem}>การกระทำ</div>
              </div>
              <div className={styles.inventory}>
                {filteredRfqs.map((rfq) => (
                  <div key={rfq.rfq_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.mono}`}>{rfq.rfq_no}</div>
                    <div className={styles.tableCell}>
                      {rfq.firstname} {rfq.lastname}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {new Date(rfq.created_at).toLocaleDateString("th-TH")}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <StatusBadge status={rfq.status} />
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <button
                        className={`${styles.primaryButton} ${styles.actionButton}`}
                        onClick={() => setSelectedRFQ(rfq)}
                      >
                        <FaEye size={18} /> ดูรายละเอียด
                      </button>
                      <button
                        className={`${styles.ghostBtn} ${styles.actionButton}`}
                        onClick={() => handleExportPDF(rfq)}
                      >
                        <FaFilePdf size={18} /> ออกใบ PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {selectedRFQ && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>รายละเอียด RFQ: {selectedRFQ.rfq_no}</h2>
                <button className={styles.closeButton} onClick={() => setSelectedRFQ(null)}>
                  <FaTimes size={18} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <p>
                  <strong>ผู้จัดทำ:</strong> {selectedRFQ.firstname} {selectedRFQ.lastname}
                </p>
                <p>
                  <strong>วันที่:</strong>{" "}
                  {new Date(selectedRFQ.created_at).toLocaleDateString("th-TH")}
                </p>
                <h3>รายการสินค้า</h3>
                <div className={styles.tableSection}>
                  <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                    <div className={styles.headerItem}>ชื่อสินค้า</div>
                    <div className={styles.headerItem}>จำนวน</div>
                    <div className={styles.headerItem}>หน่วย</div>
                    <div className={styles.headerItem}>คุณลักษณะ</div>
                  </div>
                  <div className={styles.inventory}>
                    {selectedRFQ.items?.map((item) => (
                      <div key={item.rfq_item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                        <div className={styles.tableCell}>{item.item_name || "-"}</div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          {item.qty || 0}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          {item.unit || "-"}
                        </div>
                        <div className={styles.tableCell}>{item.spec || "-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.ghostBtn} ${styles.actionButton}`}
                  onClick={() => handleExportPDF(selectedRFQ)}
                >
                  <FaFilePdf size={18} /> ดาวน์โหลด PDF
                </button>
                <button
                  className={`${styles.ghostBtn} ${styles.actionButton}`}
                  onClick={() => setSelectedRFQ(null)}
                >
                  <FaTimes size={18} /> ปิด
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RFQListPage;
