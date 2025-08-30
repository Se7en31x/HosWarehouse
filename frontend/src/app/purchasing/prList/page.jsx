"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaTimes } from "react-icons/fa";
import { PackageCheck } from "lucide-react"; 
import Swal from "sweetalert2";
import exportPDF from "@/app/components/pdf/PDFExporter";

const categories = ["ทั้งหมด", "ยา", "เวชภัณฑ์", "ครุภัณฑ์", "อุปกรณ์ทางการแพทย์", "ของใช้ทั่วไป"];

// ✅ ฟังก์ชันแปลสถานะ
const translateStatus = (status) => {
  if (!status) return "-";
  switch (status.toLowerCase()) {
    case "pending":
      return "รอดำเนินการ";
    case "approved":
      return "อนุมัติแล้ว";
    case "completed":
      return "เสร็จสิ้น";
    case "canceled":
      return "ยกเลิก";
    default:
      return status;
  }
};

// ✅ ฟังก์ชันแปลประเภทสินค้า
const translateCategory = (category) => {
  if (!category) return "-";
  switch (category.toLowerCase()) {
    case "medicine":
      return "ยา";
    case "medsup":
      return "เวชภัณฑ์";
    case "equipment":
      return "ครุภัณฑ์";
    case "meddevice":
      return "อุปกรณ์ทางการแพทย์";
    case "general":
      return "ของใช้ทั่วไป";
    default:
      return category;
  }
};

// ✅ Component แสดง Badge สถานะ
const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  let displayText = translateStatus(status);

  if (status) {
    switch (status.toLowerCase()) {
      case "pending":
        badgeStyle = styles.pending;
        break;
      case "approved":
        badgeStyle = styles.approved;
        break;
      case "completed":
        badgeStyle = styles.completed;
        break;
      case "canceled":
        badgeStyle = styles.canceled;
        break;
      default:
        badgeStyle = styles.pending;
    }
  }

  return <span className={`${styles.stBadge} ${badgeStyle}`}>{displayText}</span>;
};

const PurchaseRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [specs, setSpecs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/pr");
        setRequests(res.data.map((item) => ({ ...item, checked: false })));
      } catch (err) {
        Swal.fire({
          title: "ผิดพลาด",
          text: "ไม่สามารถดึงข้อมูลคำขอสั่งซื้อได้: " + (err.response?.data?.message || err.message),
          icon: "error",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleFilterChange = (e) => setFilterCategory(e.target.value);

  const handleCheckboxChange = (id) => {
    setRequests((prev) =>
      prev.map((item) =>
        (item.pr_item_id || item.pr_id) === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleSelectAll = () => {
    setRequests((prev) => prev.map((item) => ({ ...item, checked: true })));
  };

  const handleClearSelection = () => {
    setRequests((prev) => prev.map((item) => ({ ...item, checked: false })));
    setSpecs({});
  };

  const handleSpecChange = (id, value) => {
    setSpecs((prev) => ({ ...prev, [id]: value }));
  };

  // ✅ ออกใบขอราคา (เปิด modal)
  const handleGenerateQuotation = () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }
    setShowModal(true);
  };

  // ✅ บันทึกและส่ง RFQ
  const handleSubmitQuotation = async () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    try {
      const res = await axiosInstance.post("/rfq", {
        created_by: 1,
        items: selectedItems.map((item) => ({
          pr_id: item.pr_id,
          pr_item_id: item.pr_item_id,
          qty: item.qty_requested,
          unit: item.unit,
          spec: specs[item.pr_item_id || item.pr_id] || null,
        })),
      });

      Swal.fire({
        title: "สำเร็จ",
        text: `สร้างใบขอราคาเรียบร้อย: ${res.data.rfq_no}`,
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      }).then(() => {
        setShowModal(false);
        setRequests((prev) => prev.map((item) => ({ ...item, checked: false })));
        setSpecs({});
      });
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || err.message,
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  // ✅ ดาวน์โหลด PDF
  const handleExportPDF = async () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    const rfqNumber = `RFQ-${new Date().getTime()}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    await exportPDF({
      filename: `ใบขอราคา_${rfqNumber}.pdf`,
      title: "ใบขอราคา (Request for Quotation)",
      meta: {
        headerBlock: [
          ["เลขที่เอกสาร", rfqNumber],
          ["วันที่ออก", new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })],
        ],
        leftBlock: [
          ["ผู้จัดทำ", "ฝ่ายจัดซื้อ โรงพยาบาลตัวอย่าง"],
          ["ที่อยู่", "123/45 ถนนสุขภาพ แขวงการแพทย์ เขตเมือง กรุงเทพฯ 10110"],
          ["เบอร์โทร", "02-123-4567"],
        ],
        rightBlock: [
          ["หน่วยงาน", "งานคลังพัสดุ"],
          ["อีเมล", "purchasing@hospital.com"],
          ["กำหนดส่งใบเสนอราคา", dueDate],
        ],
        footerBlock: [
          ["เงื่อนไขการชำระเงิน", "ชำระภายใน 30 วันหลังรับสินค้า"],
          ["การจัดส่ง", "จัดส่งฟรีภายใน 7 วันทำการ ถึงโรงพยาบาลตัวอย่าง"],
          ["ภาษี", "ราคารวมภาษีมูลค่าเพิ่ม 7%"],
          ["หมายเหตุ", "กรุณาระบุระยะเวลาการส่งมอบและเงื่อนไขการรับประกันในใบเสนอราคา"],
        ],
        sections: {
          leftTitle: "ข้อมูลผู้จัดทำ",
          rightTitle: "ข้อมูลการติดต่อ",
          footerTitle: "เงื่อนไขใบขอราคา",
        },
        layout: {
          tableColWidths: [15, 70, 20, 20, 65],
        },
      },
      columns: ["ลำดับ", "ชื่อสินค้า", "จำนวน", "หน่วย", "คุณลักษณะ"],
      rows: selectedItems.map((item, idx) => [
        idx + 1,
        item.item_name || "-",
        item.qty_requested || 0,
        item.unit || "-",
        specs[item.pr_item_id || item.pr_id] || "-",
      ]),
      signatures: { roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"] },
      options: {
        brand: {
          name: "โรงพยาบาลตัวอย่าง",
          address: "123/45 ถนนสุขภาพ แขวงการแพทย์ เขตเมือง กรุงเทพฯ 10110",
          phone: "02-123-4567",
          email: "purchasing@hospital.com",
          logoUrl: "/font/Sarabun/logo.png",
          headerBand: true,
          bandColor: [0, 141, 218],
          logoWidth: 20,
          logoHeight: 20,
        },
        watermark: { text: "RFQ", angle: 45 },
        footerCols: 1,
        margin: { left: 15, right: 15, top: 20, bottom: 20 },
        font: { size: { title: 18, body: 11, table: 10, footer: 9 } },
      },
    });

    Swal.fire({
      title: "สำเร็จ",
      text: `ดาวน์โหลดใบขอราคา ${rfqNumber} เรียบร้อย`,
      icon: "success",
      confirmButtonText: "ตกลง",
      customClass: { confirmButton: styles.swalButton },
    });
  };

  const filteredRequests = requests.filter(
    (item) =>
      (filterCategory === "ทั้งหมด" || translateCategory(item.item_category) === filterCategory) &&
      (item.pr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const hasSelectedItems = requests.some((item) => item.checked);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
               ระบบการสั่งซื้อ - ออกใบขอราคา
            </h1>
            <p className={styles.subtitle}>จัดการคำขอสั่งซื้อและสร้างใบขอราคา (RFQ)</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภท</label>
              <select value={filterCategory} onChange={handleFilterChange} className={styles.input}>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
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
                  placeholder="ค้นหา: PR NO, ชื่อสินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className={styles.searchCluster}>
            <button
              className={`${styles.ghostBtn} ${styles.actionButton}`}
              onClick={handleSelectAll}
              disabled={filteredRequests.length === 0}
            >
              <FaPlusCircle size={18} /> เลือกทั้งหมด
            </button>
            <button
              className={`${styles.ghostBtn} ${styles.actionButton}`}
              onClick={handleClearSelection}
              disabled={!hasSelectedItems}
            >
              <FaTimes size={18} /> ล้างการเลือก
            </button>
            <button
              className={`${styles.primaryButton} ${styles.actionButton}`}
              onClick={handleGenerateQuotation}
              disabled={!hasSelectedItems}
            >
              <FaPlusCircle size={18} /> ออกใบขอราคา
            </button>
          </div>
        </div>

        <div className={styles.tableSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}>กำลังโหลด...</div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className={styles.noDataMessage}>ไม่พบรายการคำขอสั่งซื้อ</div>
          ) : (
            <>
              <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                <div className={styles.headerItem}>เลือก</div>
                <div className={styles.headerItem}>PR NO</div>
                <div className={styles.headerItem}>ชื่อสินค้า</div>
                <div className={styles.headerItem}>จำนวน</div>
                <div className={styles.headerItem}>หน่วย</div>
                <div className={styles.headerItem}>ประเภท</div>
                <div className={styles.headerItem}>ผู้ขอ</div>
                <div className={styles.headerItem}>สถานะ</div>
                <div className={styles.headerItem}>วันที่</div>
              </div>
              <div className={styles.inventory}>
                {filteredRequests.map((item) => {
                  const rowKey = item.pr_item_id || item.pr_id;
                  return (
                    <div
                      key={rowKey}
                      className={`${styles.tableGrid} ${styles.tableRow} ${item.checked ? styles.rowSelected : ""}`}
                    >
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <input
                          type="checkbox"
                          checked={item.checked || false}
                          onChange={() => handleCheckboxChange(rowKey)}
                        />
                      </div>
                      <div className={`${styles.tableCell} ${styles.mono}`}>{item.pr_no || "-"}</div>
                      <div className={styles.tableCell}>{item.item_name || "-"}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.qty_requested || 0}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.unit || "-"}
                      </div>
                      {/* ✅ ใช้ translateCategory */}
                      <div className={styles.tableCell}>{translateCategory(item.item_category)}</div>
                      <div className={styles.tableCell}>
                        {item.user_fname || ""} {item.user_lname || ""}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString("th-TH")
                          : "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>สร้างใบขอราคา (RFQ)</h2>
                <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                  <FaTimes size={18} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <h3>รายการสินค้า</h3>
                <div className={styles.tableSection}>
                  <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                    <div className={styles.headerItem}>PR NO</div>
                    <div className={styles.headerItem}>ชื่อสินค้า</div>
                    <div className={styles.headerItem}>จำนวน</div>
                    <div className={styles.headerItem}>หน่วย</div>
                    <div className={styles.headerItem}>คุณลักษณะ</div>
                  </div>
                  <div className={styles.inventory}>
                    {requests
                      .filter((item) => item.checked)
                      .map((item) => {
                        const rowKey = item.pr_item_id || item.pr_id;
                        return (
                          <div key={rowKey} className={`${styles.tableGrid} ${styles.tableRow}`}>
                            <div className={`${styles.tableCell} ${styles.mono}`}>
                              {item.pr_no || "-"}
                            </div>
                            <div className={styles.tableCell}>{item.item_name || "-"}</div>
                            <div className={`${styles.tableCell} ${styles.centerCell}`}>
                              {item.qty_requested || 0}
                            </div>
                            <div className={`${styles.tableCell} ${styles.centerCell}`}>
                              {item.unit || "-"}
                            </div>
                            <div className={styles.tableCell}>
                              <input
                                type="text"
                                value={specs[rowKey] || ""}
                                onChange={(e) => handleSpecChange(rowKey, e.target.value)}
                                placeholder="ระบุคุณลักษณะ เช่น ขนาด, สี, รุ่น"
                                className={styles.input}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.ghostBtn} ${styles.actionButton}`}
                  onClick={handleExportPDF}
                  disabled={!hasSelectedItems}
                >
                  <FaPlusCircle size={18} /> ดาวน์โหลด PDF
                </button>
                <button
                  className={`${styles.primaryButton} ${styles.actionButton}`}
                  onClick={handleSubmitQuotation}
                  disabled={!hasSelectedItems}
                >
                  <FaPlusCircle size={18} /> บันทึกและส่ง
                </button>
                <button
                  className={`${styles.ghostBtn} ${styles.actionButton}`}
                  onClick={() => setShowModal(false)}
                >
                  <FaTimes size={18} /> ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseRequestPage;
