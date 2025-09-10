"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaTimes, FaEye } from "react-icons/fa";
import { PackageCheck, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";

/* ฟิลเตอร์สถานะ */
const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "อนุมัติ", "เสร็จสิ้น", "ยกเลิก"];

/* helper: แปลงสถานะระบบ -> ภาษาไทย */
const toThaiStatus = (s = "") => {
  const t = s.toLowerCase();
  if (t === "approved") return "อนุมัติ";
  if (t === "completed") return "เสร็จสิ้น";
  if (t === "canceled" || t === "cancelled") return "ยกเลิก";
  return "รอดำเนินการ";
};

/* ป้ายสถานะ */
const StatusBadge = ({ poStatus }) => {
  let badgeStyle = styles.pending;
  const t = (poStatus || "").toLowerCase();
  if (t === "approved") badgeStyle = styles.approved;
  else if (t === "completed") badgeStyle = styles.completed;
  else if (t === "canceled" || t === "cancelled") badgeStyle = styles.canceled;
  return <span className={`${styles.stBadge} ${badgeStyle}`}>{toThaiStatus(poStatus)}</span>;
};

/* ฟอร์แมตตัวเลขเงิน */
const money = (n) =>
  Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* จำนวนรายการต่อหน้า (ตาราง PO) */
const PO_ITEMS_PER_PAGE = 10;

export default function PoAndRfqPage() {
  /* --- ส่วน RFQ -> สร้าง PO --- */
  const [rfqs, setRfqs] = useState([]);
  const [selectedRFQ, setSelectedRFQ] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplier, setSupplier] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    taxId: "",
  });

  const [prices, setPrices] = useState({});
  const [discounts, setDiscounts] = useState({});
  const [attachments, setAttachments] = useState({});
  const [notes, setNotes] = useState("");
  const [subtotal, setSubtotal] = useState(0);
  const [vat, setVat] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [isVatInclusive, setIsVatInclusive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRefs = useRef({});

  /* --- ส่วนตาราง PO --- */
  const [poList, setPoList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  /* โหลดข้อมูล */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resRfq, resPo, resSup] = await Promise.all([
          purchasingAxios.get("/rfq/pending"),
          purchasingAxios.get("/po"),
          purchasingAxios.get("/suppliers"),
        ]);
        setRfqs(Array.isArray(resRfq.data) ? resRfq.data : []);
        setPoList(Array.isArray(resPo.data) ? resPo.data : []);
        setSuppliers(Array.isArray(resSup.data) ? resSup.data : []);
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
    fetchData();
  }, []);

  /* เลือก/ปิด RFQ */
  const handleSelectRFQ = async (id) => {
    if (!id) {
      setSelectedRFQ(null);
      setPrices({});
      setDiscounts({});
      setSubtotal(0);
      setVat(0);
      setGrandTotal(0);
      setAttachments({});
      setSupplier({ name: "", address: "", phone: "", email: "", taxId: "" });
      setSelectedSupplierId("");
      setNotes("");
      setIsVatInclusive(false);
      Object.keys(fileInputRefs.current).forEach((t) => fileInputRefs.current[t] && (fileInputRefs.current[t].value = ""));
      return;
    }
    try {
      const res = await purchasingAxios.get(`/rfq/${id}`);
      setSelectedRFQ(res.data);
      setPrices({});
      setDiscounts({});
      setSubtotal(0);
      setVat(0);
      setGrandTotal(0);
      setAttachments({});
      setIsVatInclusive(false);
      Object.keys(fileInputRefs.current).forEach((t) => fileInputRefs.current[t] && (fileInputRefs.current[t].value = ""));
    } catch {
      Swal.fire({
        title: "ผิดพลาด",
        text: "โหลด RFQ ไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  const handlePriceChange = (itemId, value) => {
    setPrices((s) => ({ ...s, [itemId]: parseFloat(value) || 0 }));
  };
  const handleDiscountChange = (itemId, value) => {
    setDiscounts((s) => ({ ...s, [itemId]: parseFloat(value) || 0 }));
  };

  /* คำนวณยอด */
  useEffect(() => {
    if (!selectedRFQ) return;
    const totalItemsPrice = selectedRFQ.items.reduce((sum, item) => {
      const unitPrice = prices[item.rfq_item_id] || 0;
      const discount = discounts[item.rfq_item_id] || 0;
      return sum + (item.qty * unitPrice - discount);
    }, 0);

    if (isVatInclusive) {
      const gt = totalItemsPrice;
      const st = gt / 1.07;
      setSubtotal(st);
      setVat(gt - st);
      setGrandTotal(gt);
    } else {
      const st = totalItemsPrice;
      const v = st * 0.07;
      setSubtotal(st);
      setVat(v);
      setGrandTotal(st + v);
    }
  }, [selectedRFQ, prices, discounts, isVatInclusive]);

  /* แนบไฟล์ */
  const validCategories = [
    "quotation",
    "delivery_note",
    "tax_invoice",
    "invoice",
    "payment_proof",
    "receipt",
    "contract",
    "other",
  ];
  const handleAttachmentChange = (e, type) => {
    if (!validCategories.includes(type)) {
      Swal.fire({ title: "ผิดพลาด", text: `หมวดหมู่ไม่ถูกต้อง: ${type}`, icon: "error", confirmButtonText: "ตกลง", customClass: { confirmButton: styles.swalButton } });
      return;
    }
    const files = Array.from(e.target.files);
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    const maxSize = 10 * 1024 * 1024;
    for (const f of files) {
      if (!allowed.includes(f.type)) {
        Swal.fire({ title: "ผิดพลาด", text: `ไฟล์ ${f.name} ต้องเป็น PDF/JPEG/PNG เท่านั้น`, icon: "error", confirmButtonText: "ตกลง", customClass: { confirmButton: styles.swalButton } });
        return;
      }
      if (f.size > maxSize) {
        Swal.fire({ title: "ผิดพลาด", text: `ไฟล์ ${f.name} มีขนาดเกิน 10MB`, icon: "error", confirmButtonText: "ตกลง", customClass: { confirmButton: styles.swalButton } });
        return;
      }
    }
    setAttachments((prev) => ({ ...prev, [type]: [...(prev[type] || []), ...files] }));
    fileInputRefs.current[type] && (fileInputRefs.current[type].value = "");
  };
  const handleRemoveAttachment = (type, idx) => {
    setAttachments((prev) => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
  };

  /* สร้าง PO */
  const handleCreatePO = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!selectedRFQ) {
      Swal.fire({ title: "แจ้งเตือน", text: "กรุณาเลือก RFQ ก่อน", icon: "warning", confirmButtonText: "ตกลง", customClass: { confirmButton: styles.swalButton } });
      setIsSubmitting(false);
      return;
    }
    if (!selectedSupplierId) {
      Swal.fire({ title: "แจ้งเตือน", text: "กรุณาเลือกซัพพลายเออร์", icon: "warning", confirmButtonText: "ตกลง", customClass: { confirmButton: styles.swalButton } });
      setIsSubmitting(false);
      return;
    }
    for (const item of selectedRFQ.items) {
      const unitPrice = prices[item.rfq_item_id] || 0;
      if (!item.unit || unitPrice <= 0) {
        Swal.fire({ title: "แจ้งเตือน", text: "กรุณากรอกราคาต่อหน่วยให้ครบถ้วน", icon: "warning", confirmButtonText: "ตกลง", customClass: { confirmButton: styles.swalButton } });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        rfq_id: selectedRFQ?.header?.rfq_id || selectedRFQ?.rfq_id,
        supplier_id: selectedSupplierId,
        notes,
        subtotal,
        vat_amount: vat,
        grand_total: grandTotal,
        is_vat_included: isVatInclusive,
        items: selectedRFQ?.items?.map((item) => ({
          rfq_item_id: item.rfq_item_id,
          item_id: item.item_id,
          qty: item.qty,
          unit: item.unit,
          price: prices[item.rfq_item_id] || 0,
          discount: discounts[item.rfq_item_id] || 0,
        })),
      };

      const res = await purchasingAxios.post("/po/from-rfq", payload);
      const newPo = res.data;

      if (Object.keys(attachments).some((t) => attachments[t]?.length)) {
        const formData = new FormData();
        Object.entries(attachments).forEach(([type, arr]) => {
          (arr || []).forEach((file) => {
            formData.append("files", file);
            formData.append("categories[]", type);
            formData.append("originalNames[]", file.name);
          });
        });
        formData.append("existingAttachments", JSON.stringify([]));
        await purchasingAxios.put(`/po/${newPo.po_id}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data; charset=utf-8" },
        });
      }

      Swal.fire({
        title: "สำเร็จ",
        text: `สร้าง PO เลขที่ ${newPo.po_no} แล้ว`,
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });

      const [resPo, resRfq] = await Promise.all([
        purchasingAxios.get("/po"),
        purchasingAxios.get("/rfq/pending"),
      ]);
      setPoList(resPo.data);
      setRfqs(resRfq.data);
      handleSelectRFQ("");
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการสร้าง PO หรืออัปโหลดไฟล์",
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } finally {
      setIsSubmitting(false);
      Object.keys(fileInputRefs.current).forEach((t) => fileInputRefs.current[t] && (fileInputRefs.current[t].value = ""));
    }
  };

  /* ฟิลเตอร์ PO */
  const filteredPoList = poList.filter(
    (po) =>
      (filterStatus === "ทั้งหมด" || toThaiStatus(po.po_status) === filterStatus) &&
      (po.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  /* หน้า/เพจ (ตาราง PO) */
  const totalPages = Math.max(1, Math.ceil(filteredPoList.length / PO_ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * PO_ITEMS_PER_PAGE;
  const pageEnd = Math.min(filteredPoList.length, pageStart + PO_ITEMS_PER_PAGE);
  const visibleRows = filteredPoList.slice(pageStart, pageStart + PO_ITEMS_PER_PAGE);
  const fillersCount = Math.max(0, PO_ITEMS_PER_PAGE - visibleRows.length);
  const startDisplay = filteredPoList.length ? pageStart + 1 : 0;
  const endDisplay = pageEnd;

  useEffect(() => setCurrentPage(1), [searchTerm, filterStatus]);
  useEffect(() => setCurrentPage((p) => Math.min(Math.max(1, p), totalPages)), [totalPages]);

  const getPageNumbers = (total, cur) => {
    const pages = [];
    if (total <= 4) for (let i = 1; i <= total; i++) pages.push(i);
    else if (cur <= 4) pages.push(1, 2, 3, 4, "...", total);
    else if (cur >= total - 3) pages.push(1, "...", total - 3, total - 2, total - 1, total);
    else pages.push(1, "...", cur - 1, cur, cur + 1, "...", total);
    return pages;
  };

  /* ประเภทไฟล์แนบ */
  const attachmentTypes = [
    { label: "ใบเสนอราคา", type: "quotation" },
    { label: "ใบส่งของ / ใบส่งมอบ", type: "delivery_note" },
    { label: "ใบกำกับภาษี", type: "tax_invoice" },
    { label: "ใบแจ้งหนี้", type: "invoice" },
    { label: "หลักฐานการจ่ายเงิน", type: "payment_proof" },
    { label: "ใบเสร็จรับเงิน", type: "receipt" },
    { label: "สัญญาซื้อขาย", type: "contract" },
    { label: "อื่น ๆ", type: "other" },
  ];

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>

        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              รายการใบสั่งซื้อ & สร้างจาก RFQ
            </h1>
            <p className={styles.subtitle}>สร้างใบสั่งซื้อจาก RFQ และดูรายการที่สร้างแล้ว</p>
          </div>
        </div>

        {/* ===== สร้าง PO จาก RFQ ===== */}
        <section className={styles.formSection}>
          <div className={styles.selector}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>เลือก RFQ</label>
              <select
                value={selectedRFQ?.rfq_id || ""}
                onChange={(e) => handleSelectRFQ(e.target.value)}
                className={styles.input}
                disabled={isSubmitting}
              >
                <option value="">-- กรุณาเลือก --</option>
                {rfqs.map((r) => (
                  <option key={r.rfq_id} value={r.rfq_id}>
                    {r.rfq_no} - {toThaiStatus(r.status)}
                  </option>
                ))}
              </select>
            </div>

            {selectedRFQ && (
              <div className={styles.btnGroup}>
                <button
                  className={`${styles.ghostBtn} ${styles.actionButton}`}
                  onClick={() => handleSelectRFQ("")}
                  disabled={isSubmitting}
                >
                  <FaTimes size={18} /> ปิดฟอร์ม
                </button>
              </div>
            )}
          </div>

          {selectedRFQ && (
            <>
              <h2 className={styles.sectionTitle}>
                รายละเอียด RFQ: {selectedRFQ?.header?.rfq_no || selectedRFQ?.rfq_no || "-"}
              </h2>

              {/* ตารางซ้าย + กล่องสรุปขวา (sticky) */}
              <div className={styles.rfqLayout}>
                {/* ตารางกรอกราคา */}
                <div className={styles.tableSection}>
                  <div className={`${styles.tableGrid} ${styles.tableHeader} ${styles.rfqGrid}`}>
                    <div className={styles.headerItem}>ชื่อสินค้า</div>
                    <div className={styles.headerItem}>จำนวน</div>
                    <div className={styles.headerItem}>หน่วย</div>
                    <div className={styles.headerItem}>ราคา/หน่วย</div>
                    <div className={styles.headerItem}>ส่วนลด</div>
                    <div className={styles.headerItem} style={{ justifyContent: "flex-end" }}>
                      จำนวนเงิน
                    </div>
                  </div>

                  <div className={styles.inventoryAuto}>
                    {selectedRFQ?.items?.map((item) => {
                      const unitPrice = prices[item.rfq_item_id] || 0;
                      const discount = discounts[item.rfq_item_id] || 0;
                      const total = item.qty * unitPrice - discount;
                      return (
                        <div
                          key={item.rfq_item_id}
                          className={`${styles.tableGrid} ${styles.tableRow} ${styles.rfqGrid}`}
                        >
                          <div className={styles.tableCell} title={item.item_name || "-"}>
                            {item.item_name || "-"}
                          </div>
                          <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.qty || 0}</div>
                          <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.unit || "-"}</div>
                          <div className={styles.tableCell}>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              className={`${styles.input} ${styles.inputInline} ${styles.numberInput}`}
                              value={unitPrice}
                              onChange={(e) => handlePriceChange(item.rfq_item_id, e.target.value)}
                              placeholder="0.00"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className={styles.tableCell}>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              className={`${styles.input} ${styles.inputInline} ${styles.numberInput}`}
                              value={discount}
                              onChange={(e) => handleDiscountChange(item.rfq_item_id, e.target.value)}
                              placeholder="0.00"
                              disabled={isSubmitting}
                            />
                          </div>
                          <div className={`${styles.tableCell} ${styles.moneyCell}`}>{money(total)} บาท</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* กล่องสรุป sticky ขวา */}
                <aside className={`${styles.summaryContainer} ${styles.summarySticky}`}>
                  <div className={styles.summaryRow}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={isVatInclusive}
                        onChange={(e) => setIsVatInclusive(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      ราคาที่กรอกรวมภาษีแล้ว
                    </label>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>รวม (ก่อนภาษี):</span>
                    <span>{money(subtotal)} บาท</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>ภาษีมูลค่าเพิ่ม (7%):</span>
                    <span>{money(vat)} บาท</span>
                  </div>
                  <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
                    <span>ยอดสุทธิ:</span>
                    <span>{money(grandTotal)} บาท</span>
                  </div>
                </aside>
              </div>

              {/* ข้อมูลซัพพลายเออร์ */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>ข้อมูลบริษัท/ซัพพลายเออร์</h3>
                <div className={styles.formGrid}>
                  <select
                    className={styles.input}
                    value={selectedSupplierId}
                    onChange={(e) => {
                      const supplierId = e.target.value;
                      setSelectedSupplierId(supplierId);
                      const selected = suppliers.find((s) => s.supplier_id == supplierId);
                      if (selected) {
                        setSupplier({
                          name: selected.supplier_name,
                          address: selected.supplier_address,
                          phone: selected.supplier_phone,
                          email: selected.supplier_email,
                          taxId: selected.supplier_tax_id,
                        });
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <option value="">-- เลือกซัพพลายเออร์ --</option>
                    {suppliers
                      .filter((s) => s.is_active)
                      .map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.supplier_name}
                        </option>
                      ))}
                  </select>
                  <input type="text" placeholder="ที่อยู่" value={supplier.address} className={styles.input} disabled />
                  <input type="text" placeholder="เบอร์โทร" value={supplier.phone} className={styles.input} disabled />
                  <input type="email" placeholder="อีเมล" value={supplier.email} className={styles.input} disabled />
                  <input type="text" placeholder="เลขผู้เสียภาษี" value={supplier.taxId} className={styles.input} disabled />
                </div>
              </div>

              {/* แนบไฟล์ */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>แนบไฟล์ประกอบ</h3>
                <div className={styles.fileGrid}>
                  {attachmentTypes.map((f) => (
                    <div key={f.type} className={styles.fileGroup}>
                      <label className={styles.fileLabel}>
                        <div className={styles.uploadBox}>
                          <span>{f.label}</span>
                          <input
                            type="file"
                            multiple
                            className={styles.fileInput}
                            accept="application/pdf,image/jpeg,image/png"
                            onChange={(e) => handleAttachmentChange(e, f.type)}
                            ref={(el) => (fileInputRefs.current[f.type] = el)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </label>
                      <div className={styles.fileList}>
                        {(attachments[f.type] || []).map((file, i) => (
                          <div key={`${f.type}-${i}`} className={styles.fileItem}>
                            <span className={styles.textEllipsis} title={file.name}>
                              {file.name}
                            </span>
                            <button
                              type="button"
                              className={`${styles.ghostBtn} ${styles.actionButton}`}
                              onClick={() => handleRemoveAttachment(f.type, i)}
                              disabled={isSubmitting}
                            >
                              <FaTimes size={18} /> ลบ
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* หมายเหตุ + ปุ่มบันทึก */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>หมายเหตุ</h3>
                <textarea
                  className={styles.textarea}
                  placeholder="ระบุหมายเหตุเพิ่มเติม..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className={`${styles.footer} ${styles.btnGroup}`}>
                <button
                  className={`${styles.primaryButton} ${styles.actionButton}`}
                  onClick={handleCreatePO}
                  disabled={isSubmitting}
                >
                  <FaPlusCircle size={18} /> {isSubmitting ? "กำลังบันทึก..." : "สร้างใบสั่งซื้อ"}
                </button>
                <button
                  className={`${styles.ghostBtn} ${styles.actionButton}`}
                  onClick={() => handleSelectRFQ("")}
                  disabled={isSubmitting}
                >
                  <FaTimes size={18} /> ยกเลิก
                </button>
              </div>
            </>
          )}
        </section>

        {/* ===== ตารางรายการ PO (ล็อค 12 แถว + มุมล่างขวาโค้งพิเศษ) ===== */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>รายการใบสั่งซื้อ</h2>

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
                    placeholder="ค้นหา: PO NO, ซัพพลายเออร์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ใส่ roundBR ตรงคอนเทนเนอร์ตาราง */}
          <div className={`${styles.tableSection} ${styles.roundBR}`}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}>กำลังโหลด...</div>
              </div>
            ) : filteredPoList.length === 0 ? (
              <div className={styles.noDataMessage}>ยังไม่มีใบสั่งซื้อ</div>
            ) : (
              <>
                <div className={`${styles.tableGrid} ${styles.tableHeader} ${styles.poList}`}>
                  <div className={styles.headerItem}>เลขที่ PO</div>
                  <div className={styles.headerItem}>ซัพพลายเออร์</div>
                  <div className={styles.headerItem}>วันที่</div>
                  <div className={styles.headerItem} style={{ justifyContent: "flex-end" }}>ยอดรวม (ก่อน VAT)</div>
                  <div className={styles.headerItem} style={{ justifyContent: "flex-end" }}>VAT</div>
                  <div className={styles.headerItem} style={{ justifyContent: "flex-end" }}>ยอดสุทธิ</div>
                  <div className={styles.headerItem}>สถานะ</div>
                  <div className={styles.headerItem}>การจัดการ</div>
                </div>

                <div className={styles.inventory} style={{ "--rows-per-page": PO_ITEMS_PER_PAGE }}>
                  {visibleRows.map((po) => (
                    <div key={po.po_id} className={`${styles.tableGrid} ${styles.tableRow} ${styles.poList}`}>
                      <div className={`${styles.tableCell} ${styles.mono}`}>{po.po_no}</div>
                      <div className={`${styles.tableCell} ${styles.textEllipsis}`} title={po.supplier_name || "-"}>
                        {po.supplier_name || "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {new Date(po.created_at).toLocaleDateString("th-TH")}
                      </div>
                      <div className={`${styles.tableCell} ${styles.moneyCell}`}>{money(po.subtotal)} บาท</div>
                      <div className={`${styles.tableCell} ${styles.moneyCell}`}>{money(po.vat_amount)} บาท</div>
                      <div className={`${styles.tableCell} ${styles.moneyCell}`}>{money(po.grand_total)} บาท</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <StatusBadge poStatus={po.po_status} />
                      </div>
                      {/* ✅ จัดกึ่งกลางคอลัมน์การจัดการให้ตรงกับหัวตาราง */}
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <div className={styles.btnGroup}>
                          <Link href={`/purchasing/poList/${po.po_id}`}>
                            <button className={`${styles.primaryButton} ${styles.actionButton}`}>
                              <FaEye size={18} /> ดูรายละเอียด
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* เติมแถวว่างให้ครบ 12 แถว */}
                  {Array.from({ length: fillersCount }).map((_, i) => (
                    <div
                      key={`filler-${i}`}
                      className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow} ${styles.poList}`}
                      aria-hidden="true"
                    >
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                    </div>
                  ))}
                </div>

                <div className={styles.paginationBar}>
                  <div className={styles.paginationInfo} aria-live="polite">
                    กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredPoList.length} รายการ
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
                    {getPageNumbers(totalPages, currentPage).map((p, idx) =>
                      p === "..." ? (
                        <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
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
        </section>
      </div>
    </div>
  );
}
