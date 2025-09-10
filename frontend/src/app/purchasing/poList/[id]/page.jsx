"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import { PackageCheck } from "lucide-react";
import { FaTimes, FaFilePdf, FaFileImage, FaFile } from "react-icons/fa";
import styles from "./page.module.css";

/* ───────── Badge ───────── */
const StatusBadge = ({ status }) => {
  const t = String(status || "pending").toLowerCase();
  const map = {
    approved: { cls: styles.approved, label: "อนุมัติ" },
    completed: { cls: styles.completed, label: "เสร็จสิ้น" },
    canceled: { cls: styles.canceled, label: "ยกเลิก" },
    cancelled: { cls: styles.canceled, label: "ยกเลิก" },
    pending: { cls: styles.pending, label: "รอดำเนินการ" },
  };
  const m = map[t] || map.pending;
  return <span className={`${styles.stBadge} ${m.cls}`}>{m.label}</span>;
};

/* ───────── Utils ───────── */
const nf0 = new Intl.NumberFormat("th-TH");
const nf2 = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const PoDetailsPage = () => {
  const { id } = useParams();

  const [poData, setPoData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newAttachments, setNewAttachments] = useState({});
  const [deletedFileIds, setDeletedFileIds] = useState([]);
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    fetchPoDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleNewAttachmentChange = (e, type) => {
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: "ไฟล์ไม่ถูกต้อง",
          text: `ไฟล์ ${file.name} ต้องเป็น PDF, JPEG หรือ PNG`,
          icon: "warning",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }
      if (file.size > maxSize) {
        Swal.fire({
          title: "ไฟล์ใหญ่เกินไป",
          text: `ไฟล์ ${file.name} มีขนาดเกิน 10MB`,
          icon: "warning",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }
    }

    setNewAttachments((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), ...files],
    }));
  };

  const handleRemoveNewAttachment = (type, idx) => {
    setNewAttachments((prev) => ({
      ...prev,
      [type]: (prev[type] || []).filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveExistingAttachment = (fileId) => {
    setDeletedFileIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
  };

  const handleUpdateAttachments = async () => {
    setUploading(true);
    try {
      const files = [];
      const categories = [];
      const originalNames = [];

      Object.entries(newAttachments).forEach(([type, filesArray]) => {
        if (!validCategories.includes(type)) throw new Error(`หมวดหมู่ไม่ถูกต้อง: ${type}`);
        (filesArray || []).forEach((file) => {
          files.push(file);
          categories.push(type);
          originalNames.push(file.name);
        });
      });

      const existingFileIdsToKeep =
        poData?.attachments
          ?.filter((file) => !deletedFileIds.includes(file.file_id))
          ?.map((file) => file.file_id) || [];

      if (files.length === 0 && existingFileIdsToKeep.length === (poData?.attachments?.length || 0)) {
        Swal.fire({
          title: "ไม่มีการเปลี่ยนแปลง",
          text: "กรุณาเพิ่มหรือลบไฟล์ก่อนบันทึก",
          icon: "info",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }

      const formData = new FormData();
      files.forEach((file, idx) => {
        formData.append("files", file);
        formData.append("categories[]", categories[idx]);
        formData.append("originalNames[]", originalNames[idx]);
      });
      formData.append("existingAttachments", JSON.stringify(existingFileIdsToKeep));

      await purchasingAxios.put(`/po/${poData.po_id}/attachments`, formData, {
        headers: { "Content-Type": "multipart/form-data; charset=utf-8" },
      });

      Swal.fire({
        title: "สำเร็จ",
        text: "อัปเดตไฟล์แนบเรียบร้อย",
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });

      setNewAttachments({});
      setDeletedFileIds([]);
      fetchPoDetails();
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || "ไม่สามารถอัปโหลดไฟล์ได้ กรุณาตรวจสอบไฟล์และหมวดหมู่",
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType === "application/pdf") return <FaFilePdf size={18} className={styles.fileIcon} />;
    if (String(fileType).startsWith("image/")) return <FaFileImage size={18} className={styles.fileIcon} />;
    return <FaFile size={18} className={styles.fileIcon} />;
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
    return (
      poData?.attachments
        ?.filter((f) => !deletedFileIds.includes(f.file_id))
        ?.reduce((acc, file) => {
          const category = file.file_category || "other";
          acc[category] = [...(acc[category] || []), file];
          return acc;
        }, {}) || {}
    );
  }, [poData, deletedFileIds]);

  if (loading) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} role="status" aria-live="polite" aria-label="กำลังโหลด" />
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
          <div className={styles.footer}>
            <Link href="/purchasing/poList" className={`${styles.ghostBtn} ${styles.actionButton}`}>
              <FaTimes size={18} /> กลับไปยังรายการ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
             รายละเอียดการสั่งซื้อ
            </h1>
            {/* <p className={styles.subtitle}>
              ดูและจัดการข้อมูลใบสั่งซื้อเลขที่ <span className={styles.mono}>{poData.po_no}</span>
            </p> */}
          </div>

          <Link href="/purchasing/poList" className={`${styles.ghostBtn} ${styles.actionButton}`}>
            <FaTimes size={18} /> กลับไปยังรายการ
          </Link>
        </div>

        {/* Meta */}
        <div className={styles.detail}>
          <h2 className={styles.sectionTitle}>รายละเอียด PO: {poData.po_no}</h2>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>สถานะ:</span>
              <StatusBadge status={poData.status} />
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>วันที่สร้าง:</span>
              <span>{new Date(poData.created_at).toLocaleDateString("th-TH")}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>ซัพพลายเออร์:</span>
              <span className={styles.textWrap}>{poData.supplier_name || "-"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>หมายเหตุ:</span>
              <span className={styles.textWrap}>{poData.notes || "-"}</span>
            </div>
          </div>

          {/* Table */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📦 รายการสินค้า</h3>

            <div className={styles.tableSection}>
              {/* Header */}
              <div className={`${styles.tableGrid} ${styles.tableHeader}`} role="row" aria-label="หัวตารางรายการสินค้า">
                <div className={styles.headerItem}>ชื่อสินค้า</div>
                <div className={styles.headerItem}>จำนวน</div>
                <div className={styles.headerItem}>หน่วย</div>
                <div className={styles.headerItem}>ราคา/หน่วย</div>
                <div className={styles.headerItem}>ส่วนลด</div>
                <div className={styles.headerItem}>จำนวนเงิน</div>
              </div>

              {/* Body */}
              <div className={styles.inventory} role="rowgroup" aria-label="ตารางรายการสินค้า">
                {(poData.items || []).map((item) => {
                  const qty = Number(item.quantity || 0);
                  const price = Number(item.price || 0);
                  const discount = Number(item.discount || 0);
                  const total = qty * price - discount;

                  return (
                    <div key={item.po_item_id} className={`${styles.tableGrid} ${styles.tableRow}`} role="row">
                      <div className={`${styles.tableCell} ${styles.textWrap}`}>{item.item_name || "-"}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>{nf0.format(qty)}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.unit || "-"}</div>
                      <div className={`${styles.tableCell} ${styles.rightCell}`}>{nf2.format(price)} บาท</div>
                      <div className={`${styles.tableCell} ${styles.rightCell}`}>{nf2.format(discount)} บาท</div>
                      <div className={`${styles.tableCell} ${styles.rightCell}`}>{nf2.format(total)} บาท</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div className={styles.summaryContainer}>
              <div className={styles.summaryRow}>
                <span>รวม (ก่อนภาษี):</span>
                <span>{nf2.format(Number(poData.subtotal || 0))} บาท</span>
              </div>
              <div className={styles.summaryRow}>
                <span>ภาษีมูลค่าเพิ่ม (7%):</span>
                <span>{nf2.format(Number(poData.vat_amount || 0))} บาท</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
                <span>ยอดสุทธิ:</span>
                <span>{nf2.format(Number(poData.grand_total || 0))} บาท</span>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>📎 เอกสารแนบ</h3>

            <div className={styles.fileGrid}>
              {attachmentTypes.map(({ label, type }) => (
                <div key={type} className={styles.fileGroup}>
                  <label className={styles.fileLabel}>
                    <div className={styles.uploadBox}>
                      <span>{label}</span>
                      <input
                        type="file"
                        multiple
                        className={styles.fileInput}
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => handleNewAttachmentChange(e, type)}
                        disabled={uploading}
                      />
                    </div>
                  </label>

                  <div className={styles.fileList}>
                    {(groupedExistingFiles[type] || []).map((file) => {
                      const supabaseBase =
                        "https://ijvzxcyfkvahhlveukow.supabase.co/storage/v1/object/public/hospital-files/";
                      const fileLink =
                        file.signed_url ||
                        file.public_url ||
                        (file.file_path ? `${supabaseBase}${file.file_path}` : "#");
                      const displayName = file.original_file_name || file.file_name;

                      return (
                        <div key={file.file_id} className={styles.fileItem}>
                          <div className={styles.fileItemContent}>
                            {getFileIcon(file.file_type)}
                            <a
                              href={fileLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.textWrap}
                              title={displayName}
                            >
                              {displayName}
                            </a>
                          </div>
                          <button
                            className={`${styles.ghostBtn} ${styles.actionButton}`}
                            onClick={() => handleRemoveExistingAttachment(file.file_id)}
                            aria-label={`ลบไฟล์ ${displayName}`}
                            disabled={uploading}
                          >
                            <FaTimes size={18} /> ลบ
                          </button>
                        </div>
                      );
                    })}

                    {(newAttachments[type] || []).map((file, idx) => (
                      <div key={`${type}-${idx}`} className={styles.fileItem}>
                        <div className={styles.fileItemContent}>
                          {getFileIcon(file.type)}
                          <span className={styles.textWrap} title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <button
                          className={`${styles.ghostBtn} ${styles.actionButton}`}
                          onClick={() => handleRemoveNewAttachment(type, idx)}
                          aria-label={`ลบไฟล์ ${file.name}`}
                          disabled={uploading}
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
                disabled={uploading}
                aria-label="บันทึกรายการไฟล์แนบ"
              >
                {uploading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoDetailsPage;
