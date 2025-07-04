'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import Image from 'next/image';

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

  useEffect(() => {
    if (!requestCode) return;

    const fetchRequestDetail = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/my-request-detail/${requestCode}?user_id=1`);
        setRequest(res.data);
      } catch (error) {
        console.error(error);
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

  const uniqueTypes = [...new Set(items.map(item => item.request_detail_type))];

  const typeNames = uniqueTypes.map(type => {
    if (!type) return '-';
    const t = type.toLowerCase();
    if (t === 'withdraw') return 'การเบิก';
    if (t === 'borrow') return 'การยืม';
    return type;
  });

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const statusClass = detail.request_status?.replace(/\s/g, '').toLowerCase();

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        รายละเอียดคำขอ <span className={styles.requestCode}>#{detail.request_code || requestCode}</span>
      </h2>

      <section className={styles.infoSection}>
        <div>
          <h3>ข้อมูลทั่วไป</h3>
          <p>
            <strong>วันที่และเวลา:</strong>{' '}
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
          </p>
          <p><strong>ผู้ขอ:</strong> {detail.user_name || '-'}</p>
          <p><strong>แผนก:</strong> {detail.department || '-'}</p>
          <p><strong>ประเภท:</strong> {typeNames.length > 0 ? typeNames.join(' และ ') : '-'}</p>
          <p>
            <strong>สถานะ:</strong>{' '}
            <span className={`${styles.status} ${styles[statusClass]}`}>
              {detail.request_status || '-'}
            </span>
          </p>
          <p><strong>หมายเหตุ:</strong> {detail.request_note || '-'}</p>
        </div>
      </section>

      <section className={styles.itemsSection}>
        <h3>รายการพัสดุ</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รูปภาพ</th>
              <th>ชื่อพัสดุ</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>ประเภท</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={item.request_detail_id}>
                  <td>{index + 1}</td>
                  <td>
                    <ItemImage item_img={item.item_img} alt={item.item_name} />
                  </td>
                  <td>{item.item_name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>
                    {(item.request_detail_type || '').toLowerCase() === 'withdraw' ? 'การเบิก' :
                     (item.request_detail_type || '').toLowerCase() === 'borrow' ? 'การยืม' :
                     item.request_detail_type || '-'}
                  </td>
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
              <td colSpan={2}><strong>รวมทั้งหมด</strong></td>
              <td><strong>{totalQuantity}</strong></td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
