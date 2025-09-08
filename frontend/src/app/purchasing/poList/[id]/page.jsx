"use client";

import { useState, useEffect, useMemo } from "react";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import { PackageCheck } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import Link from "next/link";

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

const PoDetailsPage = ({ params }) => {
  const { id } = params;

  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAttachments, setNewAttachments] = useState({});
  const [deletedFileIds, setDeletedFileIds] = useState([]);

  useEffect(() => {
    const fetchPoDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await purchasingAxios.get(`/po/${id}`);
        setPoData(res.data);
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
    fetchPoDetails();
  }, [id]);

  const handleNewAttachmentChange = (e, type) => {
    const files = Array.from(e.target.files);
    setNewAttachments({
      ...newAttachments,
      [type]: [...(newAttachments[type] || []), ...files],
    });
  };

  const handleRemoveNewAttachment = (type, idx) => {
    setNewAttachments({
      ...newAttachments,
      [type]: newAttachments[type].filter((_, i) => i !== idx),
    });
  };

  const handleRemoveExistingAttachment = (fileId) => {
    setDeletedFileIds([...deletedFileIds, fileId]);
  };

  const handleUpdateAttachments = async () => {
    try {
      const formData = new FormData();

      // ✅ ส่งทั้งไฟล์และ category มาด้วย
      Object.entries(newAttachments).forEach(([type, filesArray]) => {
        filesArray.forEach((file) => {
          formData.append("files", file);
          formData.append("categories", type); // << ส่ง category ตาม type ของไฟล์
        });
      });

      const existingFileIdsToKeep = poData.attachments
        .filter((file) => !deletedFileIds.includes(file.file_id))
        .map((file) => file.file_id);

      formData.append(
        "existingAttachments",
        JSON.stringify(existingFileIdsToKeep)
      );

      const res = await purchasingAxios.put(
        `/po/${poData.po_id}/attachments`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      Swal.fire({
        title: "สำเร็จ",
        text: "อัปเดตไฟล์แนบเรียบร้อย",
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      setPoData(res.data);
      setNewAttachments({});
      setDeletedFileIds([]);
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

  const groupedExistingFiles = useMemo(() => {
    return poData?.attachments
      ?.filter((file) => !deletedFileIds.includes(file.file_id))
      ?.reduce((acc, file) => {
        const category = file.file_category || "other"; // ✅ ใช้ file_category
        acc[category] = [...(acc[category] || []), file];
        return acc;
      }, {}) || {};
  }, [poData, deletedFileIds]);


  if (loading) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}>กำลังโหลด...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!poData) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.noDataMessage}>ไม่พบข้อมูลใบสั่งซื้อ</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <PackageCheck size={28} /> รายละเอียดการสั่งซื้อ
            </h1>
            <p className={styles.subtitle}>
              ดูและจัดการข้อมูลใบสั่งซื้อเลขที่ {poData.po_no}
            </p>
          </div>
          <Link href="/purchasing/poList">
            <button className={`${styles.ghostBtn} ${styles.actionButton}`}>
              <FaTimes size={18} /> กลับไปยังรายการ
            </button>
          </Link>
        </div>

        <div className={styles.detail}>
          <h2 className={styles.sectionTitle}>รายละเอียด PO: {poData.po_no}</h2>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="status-label">สถานะ:</span>
              <StatusBadge status={poData.status} aria-describedby="status-label" />
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="date-label">วันที่สร้าง:</span>
              <span aria-describedby="date-label">
                {new Date(poData.created_at).toLocaleDateString("th-TH")}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="supplier-label">ซัพพลายเออร์:</span>
              <span className={styles.textWrap} aria-describedby="supplier-label">
                {poData.supplier_name || "-"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="notes-label">หมายเหตุ:</span>
              <span className={styles.textWrap} aria-describedby="notes-label">
                {poData.notes || "-"}
              </span>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📦 รายการสินค้า</h3>
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
                {poData.items.map((item) => {
                  const total = (item.quantity * item.price) - (item.discount || 0);
                  return (
                    <div
                      key={item.po_item_id}
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                    >
                      <div className={`${styles.tableCell} ${styles.textWrap}`}>
                        {item.item_name || "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.quantity || 0}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.unit || "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {Number(item.price).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} บาท
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {Number(item.discount || 0).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} บาท
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {Number(total).toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} บาท
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.summaryContainer}>
              <div className={styles.summaryRow}>
                <span>รวม (ก่อนภาษี):</span>
                <span>
                  {Number(poData.subtotal).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} บาท
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span>ภาษีมูลค่าเพิ่ม (7%):</span>
                <span>
                  {Number(poData.vat_amount).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} บาท
                </span>
              </div>
              <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
                <span>ยอดสุทธิ:</span>
                <span>
                  {Number(poData.grand_total).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} บาท
                </span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📎 เอกสารแนบ</h3>
            <div className={styles.fileGrid}>
              {attachmentTypes.map((fileType) => (
                <div key={fileType.type} className={styles.fileGroup}>
                  <label className={styles.fileLabel}>
                    <div className={styles.uploadBox}>
                      <span>{fileType.label}</span>
                      <input
                        type="file"
                        multiple
                        className={styles.fileInput}
                        onChange={(e) => handleNewAttachmentChange(e, fileType.type)}
                        aria-label={`อัปโหลดไฟล์ ${fileType.label}`}
                      />
                    </div>
                  </label>
                  <div className={styles.fileList}>
                    {(groupedExistingFiles[fileType.type] || []).map((file) => (
                      <div key={file.file_id} className={styles.fileItem}>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.textWrap}
                          title={file.file_name}
                        >
                          {file.file_name}
                        </a>
                        <button
                          className={`${styles.ghostBtn} ${styles.actionButton}`}
                          onClick={() => handleRemoveExistingAttachment(file.file_id)}
                          aria-label={`ลบไฟล์ ${file.file_name}`}
                        >
                          <FaTimes size={18} /> ลบ
                        </button>
                      </div>
                    ))}
                    {(newAttachments[fileType.type] || []).map((file, i) => (
                      <div key={i} className={styles.fileItem}>
                        <span className={styles.textWrap} title={file.name}>
                          {file.name}
                        </span>
                        <button
                          className={`${styles.ghostBtn} ${styles.actionButton}`}
                          onClick={() => handleRemoveNewAttachment(fileType.type, i)}
                          aria-label={`ลบไฟล์ ${file.name}`}
                        >
                          <FaTimes size={18} /> ลบ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.footer}>
              <button
                className={`${styles.primaryButton} ${styles.actionButton}`}
                onClick={handleUpdateAttachments}
                aria-label="บันทึกการเปลี่ยนแปลงไฟล์แนบ"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoDetailsPage;