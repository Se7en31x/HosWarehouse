// MyRequestDetailPage.js - No changes needed, use the previous version
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import Image from 'next/image';

// Memoized Image component for better performance
function ItemImage({ item_img, alt }) {
  const defaultImg = "http://localhost:5000/public/defaults/landscape.png";

  const [imgSrc, setImgSrc] = useState(
    item_img && typeof item_img === "string" && item_img.trim() !== ""
      ? `http://localhost:5000/uploads/${item_img}`
      : defaultImg
  );

  return (
    <Image
      src={imgSrc}
      alt={alt || "ไม่มีคำอธิบายภาพ"}
      width={70}
      height={70}
      style={{ objectFit: "cover", borderRadius: 4 }}
      onError={() => setImgSrc(defaultImg)}
    />
  );
}

export default function MyRequestDetailPage() {
  const { id: requestCode } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to translate request types
  const translateRequestType = useCallback((type) => {
    if (!type) return '-';
    const t = type.toLowerCase();
    if (t === 'withdraw') return 'การเบิก';
    if (t === 'borrow') return 'การยืม';
    // เพิ่มการจัดการสำหรับ "return" ถ้ามี
    if (t === 'return') return 'การคืน';
    return type; // Fallback for other types
  }, []);

  useEffect(() => {
    if (!requestCode) return;

    const fetchRequestDetail = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/my-request-detail/${requestCode}?user_id=1`);
        setRequest(res.data);
      } catch (error) {
        console.error("Error fetching request detail:", error);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลคำขอได้', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetail();
  }, [requestCode]);

  if (loading) return <div className={styles.loading}>กำลังโหลดข้อมูล...</div>;
  if (!request) return <div className={styles.empty}>ไม่พบข้อมูลคำขอ</div>;

  const detail = request.detail || {};
  const items = request.items || [];

  const uniqueTranslatedTypes = [...new Set(items.map(item => translateRequestType(item.request_detail_type)))];
  const typeDisplay = uniqueTranslatedTypes.length > 0 ? uniqueTranslatedTypes.join(' และ ') : '-';

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const statusClass = detail.request_status?.replace(/\s/g, '').toLowerCase();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>
            รายละเอียดคำขอ <span className={styles.requestCode}>#{detail.request_code || requestCode}</span>
          </h2>
          <div className={`${styles.statusBadge} ${styles[statusClass]}`}>
            {detail.request_status || 'ไม่ระบุสถานะ'}
          </div>
        </div>
        {/* Optional: Action Button, keep it if needed, remove if not */}
        {/* <button className={styles.actionButton}>แก้ไข</button> */}
      </header>

      <section className={styles.infoSection}>
        <h3 className={styles.sectionTitle}>ข้อมูลทั่วไป</h3>
        <div className={styles.infoCards}>
          <div className={styles.card}>
            <span className={styles.cardLabel}>วันที่และเวลา:</span>
            <span className={styles.cardValue}>
              {detail.request_date
                ? new Date(detail.request_date).toLocaleString('th-TH', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : '-'}
            </span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>ผู้ขอ:</span>
            <span className={styles.cardValue}>{detail.user_name || '-'}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>แผนก:</span>
            <span className={styles.cardValue}>{detail.department || '-'}</span>
          </div>
          <div className={styles.card}>
            <span className={styles.cardLabel}>ประเภทคำขอ:</span>
            <span className={styles.cardValue}>{typeDisplay}</span>
          </div>
          <div className={styles.cardFullWidth}>
            <span className={styles.cardLabel}>หมายเหตุ:</span>
            <span className={styles.cardValue}>{detail.request_note || '-'}</span>
          </div>
        </div>
      </section>

      <section className={styles.itemsSection}>
        <h3 className={styles.sectionTitle}>รายการพัสดุ</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ลำดับ</th>
                <th>รูปภาพ</th>
                <th>ชื่อพัสดุ</th>
                <th>จำนวน</th>
                <th>หน่วย</th>
                <th>ประเภทรายการ</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={item.request_detail_id || index}>
                    <td>{index + 1}</td>
                    <td>
                      <ItemImage item_img={item.item_img} alt={item.item_name} />
                    </td>
                    <td>{item.item_name || '-'}</td>
                    <td>{item.quantity || 0}</td>
                    <td>{item.unit || '-'}</td>
                    <td>{translateRequestType(item.request_detail_type)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>ไม่มีรายการพัสดุ</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className={styles.footerSummary}><strong>รวมทั้งหมด</strong></td>
                <td><strong>{totalQuantity}</strong></td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}