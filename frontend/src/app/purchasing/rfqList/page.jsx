"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./page.module.css";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSearch, FaEye, FaFilePdf, FaTimes } from "react-icons/fa";
import { PackageCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";

// ⬇️ ใช้ตัวออก PDF ใหม่
import exportQuotation from "@/app/components/pdf/templates/purchasing/quotationTemplate";

const Select = dynamic(() => import("react-select"), { ssr: false });

/* ───────────────── Config ───────────────── */
const ITEMS_PER_PAGE = 12;
const statusFilterOptions = ["ทั้งหมด", "รอดำเนินการ", "อนุมัติ", "เสร็จสิ้น", "ยกเลิก"];

/* ─────────────── helpers (status) ─────────────── */
const normalizeStatus = (s) => {
  const t = String(s || "").trim().toLowerCase();
  if (["pending", "รอดำเนินการ"].includes(t)) return "pending";
  if (["approved", "อนุมัติ"].includes(t)) return "approved";
  if (["completed", "เสร็จสิ้น"].includes(t)) return "completed";
  if (["canceled", "cancelled", "ยกเลิก"].includes(t)) return "canceled";
  return "pending";
};
const statusToThai = (norm) =>
  ({ pending: "รอดำเนินการ", approved: "อนุมัติ", completed: "เสร็จสิ้น", canceled: "ยกเลิก" }[
    normalizeStatus(norm)
  ]);

// ตัวเลือกสถานะ (ไทย)
const statusOptionsRS = [
  { value: "ทั้งหมด", label: "ทั้งหมด" },
  { value: "รอดำเนินการ", label: "รอดำเนินการ" },
  { value: "อนุมัติ", label: "อนุมัติ" },
  { value: "เสร็จสิ้น", label: "เสร็จสิ้น" },
  { value: "ยกเลิก", label: "ยกเลิก" },
];

// สไตล์ react-select ให้เข้าธีม + แก้ปัญหาเมนูถูกบัง (portal + z-index)
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: 8,
    minHeight: 40,
    borderColor: state.isFocused ? "#2563EB" : "#E5E7EB",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563EB" },
    cursor: "pointer",
  }),
  valueContainer: (base) => ({ ...base, paddingInline: 10 }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  singleValue: (base) => ({ ...base, color: "#1F2A44" }),
  menuPortal: (base) => ({ ...base, zIndex: 13000 }),
  menu: (base) => ({
    ...base,
    zIndex: 13000,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    boxShadow: "0 8px 24px rgba(0,0,0,.08)",
    overflow: "hidden",
  }),
  menuList: (base) => ({ ...base, paddingBlock: 6 }),
  option: (base, state) => ({
    ...base,
    padding: "10px 12px",
    backgroundColor: state.isFocused ? "#F1F5FF" : "#FFF",
    color: "#111827",
    cursor: "pointer",
  }),
  indicatorsContainer: (base) => ({ ...base, paddingRight: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
};

const StatusBadge = ({ status }) => {
  const n = normalizeStatus(status);
  const mapClass = {
    pending: styles.stPending,
    approved: styles.stApproved,
    completed: styles.stCompleted,
    canceled: styles.stCanceled,
  };
  return <span className={`${styles.stBadge} ${mapClass[n]}`}>{statusToThai(n)}</span>;
};

export default function RFQListPage() {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  /* ─────────────── fetch ─────────────── */
  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/rfq");
        setRfqs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        Swal.fire({
          title: "ผิดพลาด",
          text: err?.response?.data?.message || err.message,
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

  /* ─────────────── filter + sort ─────────────── */
  const filteredRfqs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rfqs
      .filter((rfq) => {
        const statusThai = statusToThai(rfq?.status);
        const passStatus = filterStatus === "ทั้งหมด" ? true : statusThai === filterStatus;
        const who = `${rfq?.firstname || ""} ${rfq?.lastname || ""}`.trim();
        const passSearch =
          !q ||
          String(rfq?.rfq_no || "").toLowerCase().includes(q) ||
          who.toLowerCase().includes(q);
        return passStatus && passSearch;
      })
      .sort((a, b) => {
        const ta = new Date(a?.created_at || 0).getTime();
        const tb = new Date(b?.created_at || 0).getTime();
        if (ta !== tb) return tb - ta;
        return String(b?.rfq_no || "").localeCompare(String(a?.rfq_no || ""));
      });
  }, [rfqs, searchTerm, filterStatus]);

  /* ─────────────── pagination ─────────────── */
  const totalPages = Math.max(1, Math.ceil(filteredRfqs.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageEnd = pageStart + ITEMS_PER_PAGE;
  const pageRows = filteredRfqs.slice(pageStart, pageEnd);
  const fillersCount = Math.max(0, ITEMS_PER_PAGE - pageRows.length);

  useEffect(() => setCurrentPage(1), [searchTerm, filterStatus]);
  useEffect(() => setCurrentPage((p) => Math.min(Math.max(1, p), totalPages)), [totalPages]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  /* ─────────────── export PDF (ใช้ exportQuotation) ─────────────── */
  const handleExportPDF = async (rfq) => {
    try {
      // map meta ให้ตรงกับ template ใหม่
      const meta = {
        "เลขที่เอกสาร": rfq.rfq_no || "-",
        "วันที่": new Date(rfq.created_at).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        "ผู้ติดต่อ": `${rfq.firstname || ""} ${rfq.lastname || ""}`.trim() || "-",
      };

      // map items ให้เข้ากับ schema ของ template ใหม่
      const items = (rfq.items || []).map((it) => ({
        pr_no: it?.pr_no ?? rfq?.pr_no ?? rfq?.rfq_no ?? "-",
        item_name: it?.item_name ?? it?.name ?? "-",
        qty_requested: it?.qty ?? it?.qty_requested ?? 0,
        unit: it?.unit ?? "-",
        spec: it?.spec ?? "-",
      }));

      await exportQuotation({
        filename: `ใบเสนอราคา_${rfq.rfq_no || "quotation"}.pdf`,
        meta,
        items,
      });

      Swal.fire({
        title: "สำเร็จ",
        text: `ดาวน์โหลดเอกสารสำหรับ ${rfq.rfq_no} เรียบร้อย`,
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: "ไม่สามารถสร้าง PDF ได้: " + (err?.response?.data?.message || err.message),
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  const startDisplay = filteredRfqs.length ? pageStart + 1 : 0;
  const endDisplay = Math.min(pageEnd, filteredRfqs.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              รายการใบขอราคา (RFQ)
            </h1>
            <p className={styles.subtitle}>ดูและจัดการใบขอราคาที่สร้างแล้ว</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <div style={{ width: 220 }}>
                <Select
                  options={statusOptionsRS}
                  isSearchable={false}
                  styles={customSelectStyles}
                  value={statusOptionsRS.find((o) => o.value === filterStatus) || statusOptionsRS[0]}
                  onChange={(opt) => setFilterStatus(opt?.value ?? "ทั้งหมด")}
                  placeholder="เลือกสถานะ..."
                  menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                  menuPosition="fixed"
                  classNamePrefix="rs"
                />
              </div>
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
                  aria-label="ค้นหา RFQ"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}>กำลังโหลด...</div>
            </div>
          ) : filteredRfqs.length === 0 ? (
            <div className={styles.noDataMessage}>ไม่พบใบขอราคา</div>
          ) : (
            <>
              {/* Header row */}
              <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                <div className={styles.headerItem}>RFQ NO</div>
                <div className={styles.headerItem}>ผู้จัดทำ</div>
                <div className={styles.headerItem}>วันที่สร้าง</div>
                <div className={styles.headerItem}>สถานะ</div>
                <div className={styles.headerItem}>การกระทำ</div>
              </div>

              {/* Body */}
              <div className={styles.inventory} style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}>
                {pageRows.map((rfq) => (
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
                        title="ดูรายละเอียด"
                      >
                        <FaEye size={18} /> <span className={styles.hideSm}>ดูรายละเอียด</span>
                      </button>
                      <button
                        className={`${styles.ghostBtn} ${styles.actionButton}`}
                        onClick={() => handleExportPDF(rfq)}
                        title="ออกใบ PDF"
                      >
                        <FaFilePdf size={18} /> <span className={styles.hideSm}>ออกใบ PDF</span>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Filler rows to keep 12 rows height */}
                {Array.from({ length: fillersCount }).map((_, i) => (
                  <div
                    key={`filler-${i}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                    aria-hidden="true"
                  >
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                  </div>
                ))}
              </div>

              {/* Pagination bar */}
              <div className={styles.paginationBar}>
                <div className={styles.paginationInfo} aria-live="polite">
                  กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredRfqs.length} รายการ
                </div>
                <ul className={styles.paginationControls}>
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      aria-label="หน้าก่อนหน้า"
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
                          className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                          onClick={() => setCurrentPage(p)}
                          aria-current={p === currentPage ? "page" : undefined}
                        >
                          {p}
                        </button>
                      </li>
                    )
                  )}
                  <li>
                    <button
                      className={styles.pageButton}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      aria-label="หน้าถัดไป"
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
        {selectedRFQ && (
          <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>รายละเอียด RFQ: {selectedRFQ.rfq_no}</h2>
                <button className={styles.closeButton} onClick={() => setSelectedRFQ(null)}>
                  <FaTimes size={18} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.metaGrid}>
                  <p>
                    <strong>ผู้จัดทำ:</strong> {selectedRFQ.firstname} {selectedRFQ.lastname}
                  </p>
                  <p>
                    <strong>วันที่:</strong>{" "}
                    {new Date(selectedRFQ.created_at).toLocaleDateString("th-TH")}
                  </p>
                  <p>
                    <strong>สถานะ:</strong> {statusToThai(selectedRFQ.status)}
                  </p>
                </div>

                <h3 className={styles.sectionTitle}>รายการสินค้า</h3>
                <div className={styles.innerTableSection}>
                  <div className={`${styles.innerGrid} ${styles.innerHeader}`}>
                    <div className={styles.headerItem}>ชื่อสินค้า</div>
                    <div className={styles.headerItem}>จำนวน</div>
                    <div className={styles.headerItem}>หน่วย</div>
                    <div className={styles.headerItem}>คุณลักษณะ</div>
                  </div>
                  <div className={styles.innerBody}>
                    {selectedRFQ.items?.map((item) => (
                      <div key={item.rfq_item_id} className={`${styles.innerGrid} ${styles.innerRow}`}>
                        <div className={styles.tableCell}>{item.item_name || "-"}</div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.qty || 0}</div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.unit || "-"}</div>
                        <div className={styles.tableCell}>{item.spec || "-"}</div>
                      </div>
                    ))}
                    {!selectedRFQ.items?.length && (
                      <div className={styles.noDataMessage}>ไม่มีรายการสินค้า</div>
                    )}
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
}
