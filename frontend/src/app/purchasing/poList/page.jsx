"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./page.module.css";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaTimes, FaEye } from "react-icons/fa";
import { PackageCheck } from "lucide-react";
import Swal from "sweetalert2";
import Link from "next/link";

const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "อนุมัติ", "เสร็จสิ้น", "ยกเลิก"];

const StatusBadge = ({ poStatus }) => {
  let badgeStyle = styles.pending;
  if (poStatus?.toLowerCase() === "approved") badgeStyle = styles.approved;
  else if (poStatus?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (poStatus?.toLowerCase() === "canceled") badgeStyle = styles.canceled;
  return (
    <span className={`${styles.stBadge} ${badgeStyle}`}>
      {poStatus
        ? poStatus.charAt(0).toUpperCase() + poStatus.slice(1)
        : "รอดำเนินการ"}
    </span>
  );
};

const PoAndRfqPage = () => {
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
  const [poList, setPoList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVatInclusive, setIsVatInclusive] = useState(false);
  const fileInputRefs = useRef({});

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resRfq = await purchasingAxios.get("/rfq/pending");
        setRfqs(resRfq.data);
        const resPo = await purchasingAxios.get("/po");
        setPoList(resPo.data);
        const resSup = await purchasingAxios.get("/suppliers");
        setSuppliers(resSup.data);
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
      Object.keys(fileInputRefs.current).forEach((type) => {
        if (fileInputRefs.current[type]) {
          fileInputRefs.current[type].value = "";
        }
      });
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
      Object.keys(fileInputRefs.current).forEach((type) => {
        if (fileInputRefs.current[type]) {
          fileInputRefs.current[type].value = "";
        }
      });
    } catch (err) {
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
    setPrices({ ...prices, [itemId]: parseFloat(value) || 0 });
  };

  const handleDiscountChange = (itemId, value) => {
    setDiscounts({ ...discounts, [itemId]: parseFloat(value) || 0 });
  };

  useEffect(() => {
    if (!selectedRFQ) return;
    let totalItemsPrice = selectedRFQ.items.reduce((sum, item) => {
      const unitPrice = prices[item.rfq_item_id] || 0;
      const discount = discounts[item.rfq_item_id] || 0;
      return sum + (item.qty * unitPrice - discount);
    }, 0);

    let calculatedSubtotal = 0;
    let calculatedVat = 0;
    let calculatedGrandTotal = 0;

    if (isVatInclusive) {
      calculatedGrandTotal = totalItemsPrice;
      calculatedSubtotal = calculatedGrandTotal / 1.07;
      calculatedVat = calculatedGrandTotal - calculatedSubtotal;
    } else {
      calculatedSubtotal = totalItemsPrice;
      calculatedVat = calculatedSubtotal * 0.07;
      calculatedGrandTotal = calculatedSubtotal + calculatedVat;
    }

    setSubtotal(calculatedSubtotal);
    setVat(calculatedVat);
    setGrandTotal(calculatedGrandTotal);
  }, [selectedRFQ, prices, discounts, isVatInclusive]);

  const handleAttachmentChange = (e, type) => {
    if (!validCategories.includes(type)) {
      Swal.fire({
        title: "ผิดพลาด",
        text: `หมวดหมู่ไม่ถูกต้อง: ${type}`,
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    const files = Array.from(e.target.files);
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: "ผิดพลาด",
          text: `ไฟล์ ${file.name} ไม่ใช่ประเภทที่อนุญาต (PDF, JPEG, PNG เท่านั้น)`,
          icon: "error",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }
      if (file.size > maxSize) {
        Swal.fire({
          title: "ผิดพลาด",
          text: `ไฟล์ ${file.name} มีขนาดเกิน 10MB`,
          icon: "error",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }
    }

    console.log(`Selected files for ${type}:`, files.map((f) => f.name));

    setAttachments((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), ...files],
    }));

    if (fileInputRefs.current[type]) {
      fileInputRefs.current[type].value = "";
    }
  };

  const handleRemoveAttachment = (type, idx) => {
    setAttachments((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== idx),
    }));
  };

  const handleCreatePO = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!selectedRFQ) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือก RFQ ก่อน",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      setIsSubmitting(false);
      return;
    }
    if (!selectedSupplierId) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกซัพพลายเออร์",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      setIsSubmitting(false);
      return;
    }

    for (const item of selectedRFQ.items) {
      const unitPrice = prices[item.rfq_item_id] || 0;
      if (!item.unit || item.unit.trim() === "" || unitPrice <= 0) {
        Swal.fire({
          title: "แจ้งเตือน",
          text: `กรุณากรอกราคาต่อหน่วยให้ครบถ้วน`,
          icon: "warning",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
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

      if (Object.keys(attachments).some((type) => attachments[type]?.length > 0)) {
        const formData = new FormData();
        const files = [];
        const categories = [];
        const originalNames = [];

        Object.entries(attachments).forEach(([type, filesArray]) => {
          if (!validCategories.includes(type)) {
            throw new Error(`หมวดหมู่ไม่ถูกต้อง: ${type}`);
          }
          if (filesArray?.length > 0) {
            filesArray.forEach((file) => {
              files.push(file);
              categories.push(type);
              originalNames.push(file.name); // ใช้ file.name เพื่อให้ได้ชื่อไฟล์ดั้งเดิม
            });
          }
        });

        console.log("Files to send:", files.map((f) => f.name));
        console.log("Original names:", originalNames);
        console.log("Categories to send:", categories);
        console.log("Number of files:", files.length);
        console.log("Number of categories:", categories.length);
        console.log("Number of original names:", originalNames.length);

        if (files.length !== categories.length || files.length !== originalNames.length) {
          throw new Error("จำนวนไฟล์, หมวดหมู่, หรือชื่อไฟล์ไม่ตรงกันใน frontend");
        }

        files.forEach((file, index) => {
          formData.append("files", file);
          formData.append("categories[]", categories[index]);
          formData.append("originalNames[]", originalNames[index]);
        });
        formData.append("existingAttachments", JSON.stringify([]));

        console.log("FormData contents:");
        for (let pair of formData.entries()) {
          console.log(`${pair[0]}:`, pair[1]);
        }

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

      const resPo = await purchasingAxios.get("/po");
      setPoList(resPo.data);

      const resRfq = await purchasingAxios.get("/rfq/pending");
      setRfqs(resRfq.data);

      handleSelectRFQ("");
    } catch (err) {
      console.error("Frontend error:", err);
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || "เกิดข้อผิดพลาดในการสร้าง PO หรืออัปโหลดไฟล์",
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } finally {
      setIsSubmitting(false);
      Object.keys(fileInputRefs.current).forEach((type) => {
        if (fileInputRefs.current[type]) {
          fileInputRefs.current[type].value = "";
        }
      });
    }
  };

  const filteredPoList = poList.filter(
    (po) =>
      (filterStatus === "ทั้งหมด" ||
        po.po_status?.toLowerCase() === filterStatus.toLowerCase()) &&
      (po.po_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>สร้างข้อมูลการสั่งซื้อ</h1>
            <p className={styles.subtitle}>จัดการใบสั่งซื้อและดูรายการที่สร้างแล้ว</p>
          </div>
        </div>

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
                    {r.rfq_no} - {r.status}
                  </option>
                ))}
              </select>
            </div>
            {selectedRFQ && (
              <button
                className={`${styles.ghostBtn} ${styles.actionButton}`}
                onClick={() => handleSelectRFQ("")}
                disabled={isSubmitting}
              >
                <FaTimes size={18} /> ปิดฟอร์ม
              </button>
            )}
          </div>

          {selectedRFQ && (
            <div className={styles.detail}>
              <h2 className={styles.sectionTitle}>
                รายละเอียด RFQ: {selectedRFQ?.header?.rfq_no || selectedRFQ?.rfq_no || "-"}
              </h2>

              <div className={styles.tableSection}>
                <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                  <div className={styles.headerItem}>ชื่อสินค้า</div>
                  <div className={styles.headerItem}>จำนวน</div>
                  <div className={styles.headerItem}>หน่วย</div>
                  <div className={styles.headerItem}>ราคา/หน่วย</div>
                  <div className={styles.headerItem}>ส่วนลด</div>
                  <div className={styles.headerItem}>จำนวนเงิน</div>
                </div>
                <div className={styles.inventory}>
                  {selectedRFQ?.items?.map((item) => {
                    const unitPrice = prices[item.rfq_item_id] || 0;
                    const discount = discounts[item.rfq_item_id] || 0;
                    const total = item.qty * unitPrice - discount;
                    return (
                      <div key={item.rfq_item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                        <div className={`${styles.tableCell} ${styles.textWrap}`}>
                          {item.item_name || "-"}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          {item.qty || 0}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          {item.unit || "-"}
                        </div>
                        <div className={styles.tableCell}>
                          <input
                            type="number"
                            className={styles.input}
                            value={unitPrice}
                            onChange={(e) => handlePriceChange(item.rfq_item_id, e.target.value)}
                            placeholder="0.00"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className={styles.tableCell}>
                          <input
                            type="number"
                            className={styles.input}
                            value={discount}
                            onChange={(e) => handleDiscountChange(item.rfq_item_id, e.target.value)}
                            placeholder="0.00"
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          {Number(total).toLocaleString()} บาท
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.summaryContainer}>
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
                  <span>{Number(subtotal).toLocaleString()} บาท</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>ภาษีมูลค่าเพิ่ม (7%):</span>
                  <span>{vat.toFixed(2)} บาท</span>
                </div>
                <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
                  <span>ยอดสุทธิ:</span>
                  <span>{grandTotal.toFixed(2)} บาท</span>
                </div>
              </div>

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
                            <span className={styles.textWrap} title={file.name}>
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

              <div className={styles.footer}>
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
            </div>
          )}
        </section>

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

          <div className={styles.tableSection}>
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
                  <div className={styles.headerItem}>ยอดรวม (ก่อน VAT)</div>
                  <div className={styles.headerItem}>VAT</div>
                  <div className={styles.headerItem}>ยอดสุทธิ</div>
                  <div className={styles.headerItem}>สถานะ</div>
                  <div className={styles.headerItem}>การจัดการ</div>
                </div>
                <div className={styles.inventory}>
                  {filteredPoList.map((po) => (
                    <div key={po.po_id} className={`${styles.tableGrid} ${styles.tableRow} ${styles.poList}`}>
                      <div className={`${styles.tableCell} ${styles.mono}`}>{po.po_no}</div>
                      <div className={`${styles.tableCell} ${styles.textWrap}`}>{po.supplier_name || "-"}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {new Date(po.created_at).toLocaleDateString("th-TH")}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {Number(po.subtotal).toLocaleString()} บาท
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {Number(po.vat_amount).toFixed(2)} บาท
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {Number(po.grand_total).toFixed(2)} บาท
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <StatusBadge poStatus={po.po_status} />
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <Link href={`/purchasing/poList/${po.po_id}`}>
                          <button className={`${styles.primaryButton} ${styles.actionButton}`}>
                            <FaEye size={18} /> ดูรายละเอียด
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PoAndRfqPage;