"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaTimes } from "react-icons/fa";
import { PackageCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import exportRFQ from "@/app/components/pdf/templates/purchasing/rfqTemplate"; // ✅ ใช้ RFQ Template

// ✅ แปลสถานะ
const translateStatus = (status) => {
  if (!status) return "-";
  switch (status.toLowerCase()) {
    case "pending": return "รอดำเนินการ";
    case "approved": return "อนุมัติแล้ว";
    case "completed": return "เสร็จสิ้น";
    case "canceled": return "ยกเลิก";
    default: return status;
  }
};

// ✅ Badge สถานะ
const StatusBadge = ({ status }) => {
  if (!status) return <span className={`${styles.stBadge} ${styles.stHold}`}>-</span>;
  let stClass = styles.stHold;
  switch (status.toLowerCase()) {
    case "pending": stClass = styles.stLow; break;
    case "approved": stClass = styles.stAvailable; break;
    case "completed": stClass = styles.stAvailable; break;
    case "canceled": stClass = styles.stOut; break;
  }
  return <span className={`${styles.stBadge} ${stClass}`}>{translateStatus(status)}</span>;
};

// ✅ แปลประเภทสินค้า
const translateCategory = (category) => {
  if (!category) return "-";
  switch (category.toLowerCase()) {
    case "medicine": return "ยา";
    case "medsup": return "เวชภัณฑ์";
    case "equipment": return "ครุภัณฑ์";
    case "meddevice": return "อุปกรณ์ทางการแพทย์";
    case "general": return "ของใช้ทั่วไป";
    default: return category;
  }
};

export default function PurchaseRequestPage() {
  const [requests, setRequests] = useState([]);
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [specs, setSpecs] = useState({});
  const [loading, setLoading] = useState(true);
  const [rfqNumber, setRfqNumber] = useState(""); // ✅ เก็บเลข RFQ ไว้ใน state

  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ โหลดข้อมูล
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/pr");
        setRequests(res.data.map((item) => ({ ...item, checked: false })));
      } catch (err) {
        Swal.fire({
          title: "ผิดพลาด",
          text: "ไม่สามารถดึงข้อมูลคำขอสั่งซื้อได้: " + (err.response?.data?.message || err.message),
          icon: "error",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  // ✅ เลือก / ยกเลิกเลือก
  const handleCheckboxChange = (id) =>
    setRequests((prev) =>
      prev.map((item) =>
        (item.pr_item_id || item.pr_id) === id
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  const handleSelectAll = () =>
    setRequests((prev) => prev.map((item) => ({ ...item, checked: true })));
  const handleClearSelection = () => {
    setRequests((prev) => prev.map((item) => ({ ...item, checked: false })));
    setSpecs({});
    setRfqNumber("");
  };
  const handleSpecChange = (id, value) =>
    setSpecs((prev) => ({ ...prev, [id]: value }));

  // ✅ ออกใบขอราคา
  const handleGenerateQuotation = () => {
    if (!requests.some((item) => item.checked)) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",
        icon: "warning",
      });
      return;
    }
    const newRfqNumber = `RFQ-${new Date().getTime()}`;
    setRfqNumber(newRfqNumber); // ✅ สร้างเลข RFQ
    setShowModal(true);
  };

  // ✅ ส่ง RFQ
  const handleSubmitQuotation = async () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) return;
    try {
      const res = await purchasingAxios.post("/rfq", {
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
        text: `สร้างใบขอราคา: ${res.data.rfq_no}`,
        icon: "success",
      }).then(() => {
        setShowModal(false);
        handleClearSelection();
      });
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || err.message,
        icon: "error",
      });
    }
  };

  // ✅ ดาวน์โหลด PDF
  const handleExportPDF = async () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) return;
    const { default: exportRFQ } = await import(
      "@/app/components/pdf/templates/purchasing/rfqTemplate"
    );

    await exportRFQ({
      filename: `ใบขอราคา_${rfqNumber}.pdf`,
      meta: {
        "เลขที่เอกสาร": rfqNumber,
        "วันที่": new Date().toLocaleDateString("th-TH"),
        "ผู้จัดทำ": "ระบบจัดซื้อ",
        // เติม: "ผู้ติดต่อ": "...", "โทร": "...", "อีเมล": "...", "ส่งที่": "..."
      },
      items: selectedItems.map(it => ({
        pr_no: it.pr_no,
        item_name: it.item_name,
        qty_requested: it.qty_requested,
        unit: it.unit,
        spec: specs[it.pr_item_id || it.pr_id] || "-",
      })),
      options: {
        brand: { name: "โรงพยาบาลตัวอย่าง", address: "ที่อยู่ …", tel: "0-xxxx-xxxx" },
        // signatures: { roles: ["ผู้ขอราคา","ผู้อนุมัติ","ผู้จัดซื้อ"], names: ["","",""] }
      },
    });
    Swal.fire({
      title: "สำเร็จ",
      text: `ดาวน์โหลดใบขอราคา ${rfqNumber} เรียบร้อย`,
      icon: "success",
    });
  };

  // ✅ ฟิลเตอร์ + แบ่งหน้า
  const filteredRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          (filterCategory === "ทั้งหมด" ||
            translateCategory(item.item_category) === filterCategory) &&
          (item.pr_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [requests, filterCategory, searchTerm]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRequests.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRequests, currentPage]);
  const fillersCount = Math.max(
    0,
    ITEMS_PER_PAGE - (paginatedItems?.length || 0)
  );

  const getPageNumbers = () => {
    if (totalPages <= 4)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, "...", totalPages];
    if (currentPage >= totalPages - 3)
      return [
        1,
        "...",
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const startDisplay = filteredRequests.length ? start + 1 : 0;
  const endDisplay = Math.min(
    start + ITEMS_PER_PAGE,
    filteredRequests.length
  );
  const hasSelectedItems = requests.some((item) => item.checked);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              ระบบการสั่งซื้อ - ออกใบขอราคา
            </h1>
            <p className={styles.subtitle}>
              จัดการคำขอสั่งซื้อและสร้างใบขอราคา (RFQ)
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภท</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={styles.input}
              >
                {[
                  "ทั้งหมด",
                  "ยา",
                  "เวชภัณฑ์",
                  "ครุภัณฑ์",
                  "อุปกรณ์ทางการแพทย์",
                  "ของใช้ทั่วไป",
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
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
            <button className={`${styles.ghostBtn}`} onClick={handleSelectAll}>
              <FaPlusCircle /> เลือกทั้งหมด
            </button>
            <button
              className={`${styles.ghostBtn}`}
              onClick={handleClearSelection}
            >
              <FaTimes /> ล้างการเลือก
            </button>
            <button
              className={`${styles.primaryButton}`}
              onClick={handleGenerateQuotation}
              disabled={!hasSelectedItems}
            >
              <FaPlusCircle /> ออกใบขอราคา
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          {loading ? (
            <div className={styles.loadingContainer}>กำลังโหลด...</div>
          ) : filteredRequests.length === 0 ? (
            <div className={styles.noDataMessage}>
              ไม่พบรายการคำขอสั่งซื้อ
            </div>
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
              <div
                className={styles.inventory}
                style={{ "--rows-per-page": ITEMS_PER_PAGE }}
              >
                {paginatedItems.map((item) => {
                  const rowKey = item.pr_item_id || item.pr_id;
                  return (
                    <div
                      key={rowKey}
                      className={`${styles.tableGrid} ${styles.tableRow} ${item.checked ? styles.rowSelected : ""
                        }`}
                    >
                      <div
                        className={`${styles.tableCell} ${styles.centerCell}`}
                      >
                        <input
                          type="checkbox"
                          checked={item.checked || false}
                          onChange={() => handleCheckboxChange(rowKey)}
                        />
                      </div>
                      <div
                        className={`${styles.tableCell} ${styles.mono}`}
                      >
                        {item.pr_no || "-"}
                      </div>
                      <div className={styles.tableCell}>
                        {item.item_name || "-"}
                      </div>
                      <div
                        className={`${styles.tableCell} ${styles.centerCell}`}
                      >
                        {item.qty_requested || 0}
                      </div>
                      <div
                        className={`${styles.tableCell} ${styles.centerCell}`}
                      >
                        {item.unit || "-"}
                      </div>
                      <div className={styles.tableCell}>
                        {translateCategory(item.item_category)}
                      </div>
                      <div className={styles.tableCell}>
                        {item.firstname || ""} {item.lastname || ""}
                      </div>
                      <div
                        className={`${styles.tableCell} ${styles.centerCell}`}
                      >
                        <StatusBadge status={item.status} />
                      </div>
                      <div
                        className={`${styles.tableCell} ${styles.centerCell}`}
                      >
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("th-TH", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          : "-"}
                      </div>
                    </div>
                  );
                })}
                {Array.from({
                  length: paginatedItems.length > 0 ? fillersCount : 0,
                }).map((_, i) => (
                  <div
                    key={`filler-${i}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 9 }).map((_, c) => (
                      <div key={c} className={styles.tableCell}>
                        &nbsp;
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className={styles.paginationBar}>
                <div className={styles.paginationInfo}>
                  กำลังแสดง {startDisplay}-{endDisplay} จาก{" "}
                  {filteredRequests.length} รายการ
                </div>
                <ul className={styles.paginationControls}>
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() =>
                        setCurrentPage((c) => Math.max(1, c - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </li>
                  {getPageNumbers().map((p, idx) =>
                    p === "..." ? (
                      <li key={`ellipsis-${idx}`} className={styles.ellipsis}>
                        …
                      </li>
                    ) : (
                      <li key={`page-${p}`}>
                        <button
                          className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""
                            }`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      </li>
                    )
                  )}
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() =>
                        setCurrentPage((c) => Math.min(totalPages, c + 1))
                      }
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>สร้างใบขอราคา (RFQ)</h2>
                <button
                  className={styles.closeButton}
                  onClick={() => setShowModal(false)}
                >
                  <FaTimes />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.tableSection}>
                  <div
                    className={`${styles.tableGrid} ${styles.tableHeader}`}
                  >
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
                          <div
                            key={rowKey}
                            className={`${styles.tableGrid} ${styles.tableRow}`}
                          >
                            <div
                              className={`${styles.tableCell} ${styles.mono}`}
                            >
                              {item.pr_no || "-"}
                            </div>
                            <div className={styles.tableCell}>
                              {item.item_name || "-"}
                            </div>
                            <div
                              className={`${styles.tableCell} ${styles.centerCell}`}
                            >
                              {item.qty_requested || 0}
                            </div>
                            <div
                              className={`${styles.tableCell} ${styles.centerCell}`}
                            >
                              {item.unit || "-"}
                            </div>
                            <div className={styles.tableCell}>
                              <input
                                type="text"
                                value={specs[rowKey] || ""}
                                onChange={(e) =>
                                  handleSpecChange(rowKey, e.target.value)
                                }
                                placeholder="คุณลักษณะ เช่น ขนาด, สี, รุ่น"
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
                  className={`${styles.ghostBtn}`}
                  onClick={handleExportPDF}
                >
                  <FaPlusCircle /> ดาวน์โหลด PDF
                </button>
                <button
                  className={`${styles.primaryButton}`}
                  onClick={handleSubmitQuotation}
                >
                  <FaPlusCircle /> บันทึกและส่ง
                </button>
                <button
                  className={`${styles.ghostBtn}`}
                  onClick={() => setShowModal(false)}
                >
                  <FaTimes /> ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
