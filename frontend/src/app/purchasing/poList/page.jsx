// src/app/poList/page.jsx
"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import Link from "next/link";

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
  const [loading, setLoading] = useState(true);

  // Load RFQ and PO
  useEffect(() => {
    const fetchData = async () => {
      try {
        const resRfq = await axiosInstance.get("/rfq");
        setRfqs(resRfq.data);

        const resPo = await axiosInstance.get("/po");
        setPoList(resPo.data);
      } catch (err) {
        Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
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
      Swal.fire("ผิดพลาด", "โหลด RFQ ไม่สำเร็จ", "error");
    }
  };

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

  // Create PO
  const handleCreatePO = async () => {
    if (!selectedRFQ) {
      Swal.fire("แจ้งเตือน", "กรุณาเลือก RFQ ก่อน", "warning");
      return;
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

      // Handle file uploads after successful PO creation
      if (Object.keys(attachments).some(type => attachments[type]?.length > 0)) {
        const formData = new FormData();
        Object.values(attachments).forEach(filesArray => {
          filesArray.forEach(file => {
            formData.append("files", file);
          });
        });
        
        await axiosInstance.post(`/po/${newPo.po_id}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      Swal.fire("สำเร็จ", `สร้าง PO เลขที่ ${newPo.po_no} แล้ว`, "success");
      setPoList((prev) => [{ ...newPo, attachments: newPo.attachments || [] }, ...prev]);

      // Reset form
      setSelectedRFQ(null);
      setPrices({});
      setDiscounts({});
      setSubtotal(0);
      setVat(0);
      setGrandTotal(0);
      setAttachments({});
      setSupplier({ name: "", address: "", phone: "", email: "", taxId: "" });
      setNotes("");
    } catch (err) {
      Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
    }
  };

  if (loading) {
    return <div>กำลังโหลด...</div>;
  }

  // กำหนดประเภทไฟล์
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
    <div className={styles.container}>
      {/* ส่วนสำหรับสร้างใบสั่งซื้อจาก RFQ */}
      <h1 className={styles.title}>สร้างใบสั่งซื้อ (PO) จาก RFQ</h1>

      <div className={styles.selector}>
        <label>เลือก RFQ: </label>
        <select 
          onChange={(e) => handleSelectRFQ(e.target.value)} 
          value={selectedRFQ?.rfq_id || ""}
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
            type="button" 
            className={styles.cancelButton} 
            onClick={() => handleSelectRFQ("")}
          >
            ❌ ปิดฟอร์ม
          </button>
        )}
      </div>

      {selectedRFQ && (
        <div className={styles.detail}>
          <h2>
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
                const total = (item.qty * unitPrice) - discount;

                return (
                  <tr key={item.rfq_item_id}>
                    <td>{item.item_name}</td>
                    <td>{item.qty}</td>
                    <td>{item.unit}</td>
                    <td>
                      <input
                        type="number"
                        className={styles.inputItem}
                        value={unitPrice}
                        onChange={(e) =>
                          handlePriceChange(item.rfq_item_id, e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className={styles.inputItem}
                        value={discount}
                        onChange={(e) =>
                          handleDiscountChange(item.rfq_item_id, e.target.value)
                        }
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
              <span>{Number(vat).toFixed(2).toLocaleString()} บาท</span>
            </div>
            <div className={styles.summaryRow + ' ' + styles.grandTotalRow}>
              <span>ยอดสุทธิ:</span>
              <span>{Number(grandTotal).toFixed(2).toLocaleString()} บาท</span>
            </div>
          </div>

          <div className={styles.section}>
            <h3>ข้อมูลบริษัท/ซัพพลายเออร์</h3>
            <div className={styles.formGrid}>
              <input
                type="text"
                placeholder="ชื่อบริษัท"
                value={supplier.name}
                onChange={(e) =>
                  setSupplier({ ...supplier, name: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="ที่อยู่"
                value={supplier.address}
                onChange={(e) =>
                  setSupplier({ ...supplier, address: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="เบอร์โทร"
                value={supplier.phone}
                onChange={(e) =>
                  setSupplier({ ...supplier, phone: e.target.value })
                }
              />
              <input
                type="email"
                placeholder="อีเมล"
                value={supplier.email}
                onChange={(e) =>
                  setSupplier({ ...supplier, email: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="เลขผู้เสียภาษี"
                value={supplier.taxId}
                onChange={(e) =>
                  setSupplier({ ...supplier, taxId: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.section}>
            <h3>แนบไฟล์ประกอบ</h3>
            <div className={styles.fileGrid}>
              {attachmentTypes.map((f, idx) => (
                <div key={idx} className={styles.fileGroup}>
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
                        <button type="button" className={styles.removeButton} onClick={() => handleRemoveAttachment(f.type, i)}>
                          ลบ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={styles.section}>
            <textarea
              className={styles.textarea}
              placeholder="หมายเหตุ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.footer}>
            <button className={styles.button} onClick={handleCreatePO}>
              ✅ สร้างใบสั่งซื้อ
            </button>
          </div>
        </div>
      )}

      {/* ส่วนสำหรับรายการใบสั่งซื้อ */}
      <div className={styles.section}>
        <h2>📑 รายการใบสั่งซื้อ</h2>
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
            {poList.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", color: "#6b7280" }}>
                  ยังไม่มีใบสั่งซื้อ
                </td>
              </tr>
            ) : (
              poList.map((po) => (
                <tr key={po.po_id}>
                  <td>{po.po_no}</td>
                  <td>{po.supplier_name}</td>
                  <td>{new Date(po.created_at).toLocaleDateString("th-TH")}</td>
                  <td>{Number(po.subtotal).toLocaleString()} บาท</td>
                  <td>{Number(po.vat_amount).toFixed(2).toLocaleString()} บาท</td>
                  <td>{Number(po.grand_total).toFixed(2).toLocaleString()} บาท</td>
                  <td>{po.status}</td>
                  <td>
                    <Link href={`/purchasing/poList/${po.po_id}`}>
                      <button className={styles.viewButton}>ดูรายละเอียด</button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PoAndRfqPage;
