// src/app/purchasing/poList/[id]/page.jsx
"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";

const PoDetailsPage = ({ params }) => {
  const { id } = params;

  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAttachments, setNewAttachments] = useState({});
  const [deletedFileIds, setDeletedFileIds] = useState([]);

  // โหลดรายละเอียด PO เมื่อหน้าโหลด
  useEffect(() => {
    const fetchPoDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/po/${id}`);
        setPoData(res.data);
      } catch (err) {
        Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    fetchPoDetails();
  }, [id]);

  // จัดการการเพิ่มไฟล์ใหม่
  const handleNewAttachmentChange = (e, type) => {
    const files = Array.from(e.target.files);
    setNewAttachments({
      ...newAttachments,
      [type]: [...(newAttachments[type] || []), ...files],
    });
  };

  // จัดการการลบไฟล์ใหม่
  const handleRemoveNewAttachment = (type, idx) => {
    setNewAttachments({
      ...newAttachments,
      [type]: newAttachments[type].filter((_, i) => i !== idx),
    });
  };

  // จัดการการลบไฟล์ที่มีอยู่แล้ว
  const handleRemoveExistingAttachment = (fileId) => {
    setDeletedFileIds([...deletedFileIds, fileId]);
  };

  // จัดการการอัปเดตไฟล์ทั้งหมด
  const handleUpdateAttachments = async () => {
    try {
      const formData = new FormData();
      Object.values(newAttachments).forEach(filesArray => {
        filesArray.forEach(file => {
          formData.append("files", file);
        });
      });
      
      const existingFileIdsToKeep = poData.attachments
        .filter(file => !deletedFileIds.includes(file.file_id))
        .map(file => file.file_id);

      formData.append("existingAttachments", JSON.stringify(existingFileIdsToKeep));

      const res = await axiosInstance.put(`/po/${poData.po_id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire("สำเร็จ", "อัปเดตไฟล์แนบเรียบร้อย", "success");
      setPoData(res.data);
      setNewAttachments({});
      setDeletedFileIds([]);
    } catch (err) {
      Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
    }
  };

  if (loading) {
    return <div>กำลังโหลด...</div>;
  }

  if (!poData) {
    return <div>ไม่พบข้อมูลใบสั่งซื้อ</div>;
  }
  
  // จัดกลุ่มไฟล์ที่มีอยู่เพื่อแสดงผล
  const groupedExistingFiles = poData.attachments
    .filter(file => !deletedFileIds.includes(file.file_id))
    .reduce((acc, file) => {
      acc[file.file_type] = [...(acc[file.file_type] || []), file];
      return acc;
    }, {});

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
      <h1 className={styles.title}>รายละเอียดการสั่งซื้อ</h1>

      <div className={styles.detail}>
        <h2>รายละเอียด PO: {poData.po_no}</h2>

        <p><b>สถานะ:</b> {poData.status}</p>
        <p><b>วันที่สร้าง:</b> {new Date(poData.created_at).toLocaleDateString("th-TH")}</p>
        <p><b>ซัพพลายเออร์:</b> {poData.supplier_name || "-"}</p>
        <p><b>หมายเหตุ:</b> {poData.notes || "-"}</p>

        <div className={styles.section}>
          <h3>📦 รายการสินค้า</h3>
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
              {poData.items.map((item) => {
                const total = (item.quantity * item.price) - (item.discount || 0);
                return (
                  <tr key={item.po_item_id}>
                    <td>{item.item_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td>{Number(item.price).toLocaleString()}</td>
                    <td>{Number(item.discount || 0).toLocaleString()}</td>
                    <td>{total.toLocaleString()} บาท</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className={styles.summaryContainer}>
            <div className={styles.summaryRow}>
              <span>รวม (ก่อนภาษี):</span>
              <span>{Number(poData.subtotal).toLocaleString()} บาท</span>
            </div>
            <div className={styles.summaryRow}>
              <span>ภาษีมูลค่าเพิ่ม (7%):</span>
              <span>{Number(poData.vat_amount).toFixed(2).toLocaleString()} บาท</span>
            </div>
            <div className={styles.summaryRow + ' ' + styles.grandTotalRow}>
              <span>ยอดสุทธิ:</span>
              <span>{Number(poData.grand_total).toFixed(2).toLocaleString()} บาท</span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3>📎 เอกสารแนบ</h3>
          
          <div className={styles.fileGrid}>
            {attachmentTypes.map((fileType, idx) => (
              <div key={idx} className={styles.fileGroup}>
                <label className={styles.fileLabel}>
                  <div className={styles.uploadBox}>
                    <span>{fileType.label}</span>
                    <input
                      type="file"
                      multiple
                      className={styles.fileInput}
                      onChange={(e) => handleNewAttachmentChange(e, fileType.type)}
                    />
                  </div>
                </label>

                <div className={styles.fileList}>
                  {/* แสดงไฟล์ที่มีอยู่ */}
                  {(groupedExistingFiles[fileType.type] || []).map((file) => (
                    <div key={file.file_id} className={styles.fileItem}>
                      <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                        {file.file_name}
                      </a>
                      <button 
                        className={styles.removeButton} 
                        onClick={() => handleRemoveExistingAttachment(file.file_id)}
                      >
                        ลบ
                      </button>
                    </div>
                  ))}

                  {/* แสดงไฟล์ที่เพิ่งเพิ่มเข้ามาใหม่ */}
                  {(newAttachments[fileType.type] || []).map((file, i) => (
                    <div key={i} className={styles.fileItem}>
                      <span>{file.name}</span>
                      <button 
                        className={styles.removeButton} 
                        onClick={() => handleRemoveNewAttachment(fileType.type, i)}
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className={styles.footer}>
            <button className={styles.button} onClick={handleUpdateAttachments}>
              บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoDetailsPage;