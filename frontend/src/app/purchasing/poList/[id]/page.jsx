"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import { PackageCheck } from "lucide-react";
import { FaTimes, FaFilePdf, FaFileImage, FaFile } from "react-icons/fa";
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

const PoDetailsPage = () => {
  const params = useParams();
  const id = params?.id;

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

    const files = Array.from(e.target.files);
    if (files.length === 0) return;

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

    setNewAttachments((prev) => ({
      ...prev,
      [type]: [...(prev[type] || []), ...files],
    }));
  };

  const handleRemoveNewAttachment = (type, idx) => {
    setNewAttachments((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveExistingAttachment = (fileId) => {
    setDeletedFileIds((prev) => [...prev, fileId]);
  };

  const handleUpdateAttachments = async () => {
    setUploading(true);
    try {
      const formData = new FormData();
      const files = [];
      const categories = [];
      const originalNames = [];

      Object.entries(newAttachments).forEach(([type, filesArray]) => {
        if (!validCategories.includes(type)) {
          throw new Error(`หมวดหมู่ไม่ถูกต้อง: ${type}`);
        }
        if (filesArray?.length > 0) {
          filesArray.forEach((file) => {
            files.push(file);
            categories.push(type);
            originalNames.push(file.name);
          });
        }
      });

      console.log("Files to send:", files.map((f) => f.name));
      console.log("Categories to send:", categories);
      console.log("Original names to send:", originalNames);
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

      const existingFileIdsToKeep = poData?.attachments
        ?.filter((file) => !deletedFileIds.includes(file.file_id))
        ?.map((file) => file.file_id) || [];

      formData.append("existingAttachments", JSON.stringify(existingFileIdsToKeep));

      console.log("FormData contents:");
      for (let pair of formData.entries()) {
        console.log(`${pair[0]}:`, pair[1]);
      }

      if (files.length === 0 && existingFileIdsToKeep.length === poData?.attachments?.length) {
        Swal.fire({
          title: "ไม่มีข้อมูลเปลี่ยนแปลง",
          text: "กรุณาเพิ่มหรือลบไฟล์ก่อนบันทึก",
          icon: "warning",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }

      const res = await purchasingAxios.put(`/po/${poData.po_id}/attachments`, formData, {
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
      console.error("Frontend error:", err);
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
    if (fileType.startsWith("image/")) return <FaFileImage size={18} className={styles.fileIcon} />;
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
        ?.filter((file) => !deletedFileIds.includes(file.file_id))
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
                  const total = item.quantity * item.price - (item.discount || 0);
                  return (
                    <div key={item.po_item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
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
                <span>{Number(poData.subtotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
              </div>
              <div className={styles.summaryRow}>
                <span>ภาษีมูลค่าเพิ่ม (7%):</span>
                <span>{Number(poData.vat_amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.grandTotalRow}`}>
                <span>ยอดสุทธิ:</span>
                <span>{Number(poData.grand_total).toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท</span>
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
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => handleNewAttachmentChange(e, fileType.type)}
                        disabled={uploading}
                      />
                    </div>
                  </label>
                  <div className={styles.fileList}>
                    {(groupedExistingFiles[fileType.type] || []).map((file) => {
                      const supabaseBase =
                        "https://ijvzxcyfkvahhlveukow.supabase.co/storage/v1/object/public/hospital-files/";
                      const fileLink = file.signed_url || file.public_url || (file.file_path ? `${supabaseBase}${file.file_path}` : "#");
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
                    {(newAttachments[fileType.type] || []).map((file, idx) => (
                      <div key={`${fileType.type}-${idx}`} className={styles.fileItem}>
                        <div className={styles.fileItemContent}>
                          {getFileIcon(file.type)}
                          <span className={styles.textWrap} title={file.name}>
                            {file.name}
                          </span>
                        </div>
                        <button
                          className={`${styles.ghostBtn} ${styles.actionButton}`}
                          onClick={() => handleRemoveNewAttachment(fileType.type, idx)}
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