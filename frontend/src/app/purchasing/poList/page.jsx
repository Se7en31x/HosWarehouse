"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSearch, FaPlusCircle, FaTimes, FaEye } from "react-icons/fa";
import Swal from "sweetalert2";
import Link from "next/link";

const statusOptions = ["ทั้งหมด", "รอดำเนินการ", "อนุมัติ", "เสร็จสิ้น", "ยกเลิก"];

// Component สำหรับแสดง Badge สถานะ
const StatusBadge = ({ poStatus }) => {
  let badgeStyle = styles.pending;
  if (poStatus?.toLowerCase() === "approved") badgeStyle = styles.approved;
  else if (poStatus?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (poStatus?.toLowerCase() === "canceled") badgeStyle = styles.canceled;
  return (
    <span className={`${styles.badge} ${badgeStyle}`}>
      {poStatus
        ? poStatus.charAt(0).toUpperCase() + poStatus.slice(1)
        : "รอดำเนินการ"}
    </span>
  );
};

const PoAndRfqPage = () => {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRFQ, setSelectedRFQ] = useState(null);
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
  const [isSubmitting, setIsSubmitting] = useState(false); // ✅ กันกดซ้ำ

  // Load RFQ and PO
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const resRfq = await axiosInstance.get("/rfq/pending");
        setRfqs(resRfq.data);
        const resPo = await axiosInstance.get("/po");
        setPoList(resPo.data);
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

  // Load selected RFQ
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
      setNotes("");
      return;
    }
    try {
      const res = await axiosInstance.get(`/rfq/${id}`);
      setSelectedRFQ(res.data);
      setPrices({});
      setDiscounts({});
      setSubtotal(0);
      setVat(0);
      setGrandTotal(0);
      setAttachments({});
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

  // Handle price and discount changes
  const handlePriceChange = (itemId, value) => {
    setPrices({ ...prices, [itemId]: parseFloat(value) || 0 });
  };

  const handleDiscountChange = (itemId, value) => {
    setDiscounts({ ...discounts, [itemId]: parseFloat(value) || 0 });
  };

  // Calculate totals
  useEffect(() => {
    if (!selectedRFQ) return;
    let sub = selectedRFQ.items.reduce((sum, item) => {
      const unitPrice = prices[item.rfq_item_id] || 0;
      const discount = discounts[item.rfq_item_id] || 0;
      return sum + (item.qty * unitPrice - discount);
    }, 0);

    setSubtotal(sub);
    const vatCalc = (sub * 0.07).toFixed(2);
    setVat(parseFloat(vatCalc));
    setGrandTotal(sub + parseFloat(vatCalc));
  }, [selectedRFQ, prices, discounts]);

  // Handle attachments
  const handleAttachmentChange = (e, type) => {
    const files = Array.from(e.target.files);
    setAttachments({
      ...attachments,
      [type]: [...(attachments[type] || []), ...files],
    });
  };

  const handleRemoveAttachment = (type, idx) => {
    setAttachments({
      ...attachments,
      [type]: attachments[type].filter((_, i) => i !== idx),
    });
  };

  // ✅ Create PO (แก้กันกดซ้ำ)
  const handleCreatePO = async () => {
    if (isSubmitting) return; // ✅ กันการกดซ้ำ
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
    if (!supplier.name || !supplier.address || !supplier.email) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณากรอกข้อมูลซัพพลายเออร์ให้ครบถ้วน",
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
        supplier_name: supplier.name,
        supplier_address: supplier.address,
        supplier_phone: supplier.phone,
        supplier_email: supplier.email,
        supplier_tax_id: supplier.taxId,
        created_by: 1,
        notes,
        subtotal,
        vat_amount: vat,
        grand_total: grandTotal,
        items: selectedRFQ?.items?.map((item) => ({
          rfq_item_id: item.rfq_item_id,
          item_id: item.item_id,
          qty: item.qty,
          unit: item.unit,
          price: prices[item.rfq_item_id] || 0,
          discount: discounts[item.rfq_item_id] || 0,
        })),
      };

      const res = await axiosInstance.post("/po/from-rfq", payload);
      const newPo = res.data;

      if (Object.keys(attachments).some((type) => attachments[type]?.length > 0)) {
        const formData = new FormData();
        Object.values(attachments).forEach((filesArray) => {
          filesArray.forEach((file) => {
            formData.append("files", file);
          });
        });
        await axiosInstance.post(`/po/${newPo.po_id}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      Swal.fire({
        title: "สำเร็จ",
        text: `สร้าง PO เลขที่ ${newPo.po_no} แล้ว`,
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });

      setPoList((prev) => [
        { ...newPo, attachments: newPo.attachments || [] },
        ...prev,
      ]);
      handleSelectRFQ("");
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || err.message,
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } finally {
      setIsSubmitting(false); // ✅ เปิดปุ่มกลับมาใหม่
    }
  };

  // Filter PO list
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
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>สร้างข้อมูลการสั่งซื้อ</h1>
        <p className={styles.subtitle}>
          จัดการใบสั่งซื้อและดูรายการที่สร้างแล้ว
        </p>
      </header>

      {/* ฟอร์มสร้าง PO */}
      <section className={styles.formSection}>
        <div className={styles.selector}>
          <label>เลือก RFQ:</label>
          <select
            value={selectedRFQ?.rfq_id || ""}
            onChange={(e) => handleSelectRFQ(e.target.value)}
          >
            <option value="">-- กรุณาเลือก --</option>
            {rfqs.map((r) => (
              <option key={r.rfq_id} value={r.rfq_id}>
                {r.rfq_no} - {r.status}
              </option>
            ))}
          </select>
          {selectedRFQ && (
            <button
              className={styles.dangerButton}
              onClick={() => handleSelectRFQ("")}
            >
              <FaTimes className={styles.buttonIcon} /> ปิดฟอร์ม
            </button>
          )}
        </div>

        {selectedRFQ && (
          <div className={styles.detail}>
            <h2 className={styles.sectionTitle}>
              รายละเอียด RFQ:{" "}
              {selectedRFQ?.header?.rfq_no || selectedRFQ?.rfq_no || "-"}
            </h2>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ชื่อสินค้า</th>
                  <th>จำนวน</th>
                  <th>หน่วย</th>
                  <th>ราคา/หน่วย</th>
                  <th>ส่วนลด</th>
                  <th>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {selectedRFQ?.items?.map((item) => {
                  const unitPrice = prices[item.rfq_item_id] || 0;
                  const discount = discounts[item.rfq_item_id] || 0;
                  const total = item.qty * unitPrice - discount;
                  return (
                    <tr key={item.rfq_item_id}>
                      <td>{item.item_name || "-"}</td>
                      <td>{item.qty || 0}</td>
                      <td>{item.unit || "-"}</td>
                      <td>
                        <input
                          type="number"
                          className={styles.inputItem}
                          value={unitPrice}
                          onChange={(e) =>
                            handlePriceChange(item.rfq_item_id, e.target.value)
                          }
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className={styles.inputItem}
                          value={discount}
                          onChange={(e) =>
                            handleDiscountChange(
                              item.rfq_item_id,
                              e.target.value
                            )
                          }
                          placeholder="0.00"
                        />
                      </td>
                      <td>{Number(total).toLocaleString()} บาท</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className={styles.summaryContainer}>
              <div className={styles.summaryRow}>
                <span>รวม (ก่อนภาษี):</span>
                <span>{Number(subtotal).toLocaleString()} บาท</span>
              </div>
              <div className={styles.summaryRow}>
                <span>ภาษีมูลค่าเพิ่ม (7%):</span>
                <span>{vat.toFixed(2)} บาท</span>
              </div>
              <div
                className={`${styles.summaryRow} ${styles.grandTotalRow}`}
              >
                <span>ยอดสุทธิ:</span>
                <span>{grandTotal.toFixed(2)} บาท</span>
              </div>
            </div>

            {/* supplier form */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>ข้อมูลบริษัท/ซัพพลายเออร์</h3>
              <div className={styles.formGrid}>
                <input
                  type="text"
                  placeholder="ชื่อบริษัท"
                  value={supplier.name}
                  onChange={(e) =>
                    setSupplier({ ...supplier, name: e.target.value })
                  }
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="ที่อยู่"
                  value={supplier.address}
                  onChange={(e) =>
                    setSupplier({ ...supplier, address: e.target.value })
                  }
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="เบอร์โทร"
                  value={supplier.phone}
                  onChange={(e) =>
                    setSupplier({ ...supplier, phone: e.target.value })
                  }
                  className={styles.input}
                />
                <input
                  type="email"
                  placeholder="อีเมล"
                  value={supplier.email}
                  onChange={(e) =>
                    setSupplier({ ...supplier, email: e.target.value })
                  }
                  className={styles.input}
                />
                <input
                  type="text"
                  placeholder="เลขผู้เสียภาษี"
                  value={supplier.taxId}
                  onChange={(e) =>
                    setSupplier({ ...supplier, taxId: e.target.value })
                  }
                  className={styles.input}
                />
              </div>
            </div>

            {/* Attachments */}
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
                          onChange={(e) => handleAttachmentChange(e, f.type)}
                        />
                      </div>
                    </label>
                    <div className={styles.fileList}>
                      {(attachments[f.type] || []).map((file, i) => (
                        <div key={i} className={styles.fileItem}>
                          <span>{file.name}</span>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => handleRemoveAttachment(f.type, i)}
                          >
                            <FaTimes className={styles.buttonIcon} /> ลบ
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>หมายเหตุ</h3>
              <textarea
                className={styles.textarea}
                placeholder="ระบุหมายเหตุเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className={styles.footer}>
              <button
                className={styles.primaryButton}
                onClick={handleCreatePO}
                disabled={isSubmitting} // ✅ disable ปุ่มตอนกำลังส่ง
              >
                <FaPlusCircle className={styles.buttonIcon} />{" "}
                {isSubmitting ? "กำลังบันทึก..." : "สร้างใบสั่งซื้อ"}
              </button>
              <button
                className={styles.dangerButton}
                onClick={() => handleSelectRFQ("")}
                disabled={isSubmitting}
              >
                <FaTimes className={styles.buttonIcon} /> ยกเลิก
              </button>
            </div>
          </div>
        )}
      </section>

      {/* PO List Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>รายการใบสั่งซื้อ</h2>
        <div className={styles.toolbar}>
          <div className={styles.searchBar}>
            <FaSearch className={styles.searchIcon} />
            <input
              className={styles.input}
              placeholder="ค้นหา: PO NO, ซัพพลายเออร์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className={styles.filter}>
            <label>สถานะ:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.spacer} />
        </div>

        <div className={styles.tableCard}>
          <div
            className={styles.tableWrap}
            role="region"
            aria-label="ตารางใบสั่งซื้อ"
          >
            {loading ? (
              <div className={styles.empty}>กำลังโหลด...</div>
            ) : filteredPoList.length === 0 ? (
              <div className={styles.empty}>ยังไม่มีใบสั่งซื้อ</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>เลขที่ PO</th>
                    <th>ซัพพลายเออร์</th>
                    <th>วันที่สร้าง</th>
                    <th>ยอดรวม (ก่อน VAT)</th>
                    <th>VAT</th>
                    <th>ยอดสุทธิ</th>
                    <th>สถานะ</th>
                    <th>การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPoList.map((po) => (
                    <tr key={po.po_id}>
                      <td className={styles.mono}>{po.po_no}</td>
                      <td>{po.supplier_name || "-"}</td>
                      <td>
                        {new Date(po.created_at).toLocaleDateString("th-TH")}
                      </td>
                      <td>{Number(po.subtotal).toLocaleString()} บาท</td>
                      <td>{Number(po.vat_amount).toFixed(2)} บาท</td>
                      <td>{Number(po.grand_total).toFixed(2)} บาท</td>
                      <td>
                        <StatusBadge poStatus={po.po_status} />
                      </td>
                      <td>
                        <Link href={`/purchasing/poList/${po.po_id}`}>
                          <button className={styles.primaryButton}>
                            <FaEye className={styles.buttonIcon} /> ดูรายละเอียด
                          </button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default PoAndRfqPage;