'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axiosInstance from '../../../utils/axiosInstance';
import Swal from 'sweetalert2';
import Image from 'next/image';
import styles from './page.module.css';

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
      style={{ objectFit: "cover", borderRadius: 8 }}
      onError={() => setImgSrc(defaultImg)}
    />
  );
}

export default function ApprovalDetailPage() {
  const { request_id } = useParams();

  const [request, setRequest] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [processingIds, setProcessingIds] = useState([]); // รหัสรายการที่กำลังดำเนินการ

  useEffect(() => {
    fetchRequestDetail();
  }, []);

  const fetchRequestDetail = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/approval/${request_id}`);
      setRequest(res.data.request);
      setDetails(res.data.details);
      setStatus(res.data.request?.request_status || '');
    } catch (err) {
      console.error('โหลดข้อมูลคำขอล้มเหลว', err);
      Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลคำขอได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันช่วยจัดการสถานะปุ่มกำลังประมวลผล
  const toggleProcessing = (id, add) => {
    setProcessingIds((prev) => {
      if (add) return [...prev, id];
      else return prev.filter((x) => x !== id);
    });
  };

  const handleApproveAll = async () => {
    const result = await Swal.fire({
      title: 'ยืนยันอนุมัติทุกรายการ?',
      text: 'คุณต้องการอนุมัติคำขอทั้งหมดนี้หรือไม่',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ อนุมัติทั้งหมด',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      await axiosInstance.put(`/approval/${request_id}/approve`);  // แก้ URL ให้ตรงกับ backend
      Swal.fire('สำเร็จ', 'อนุมัติรายการทั้งหมดเรียบร้อยแล้ว', 'success');
      await fetchRequestDetail();
    } catch (err) {
      console.error('เกิดข้อผิดพลาด', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถอนุมัติทั้งหมดได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveOne = async (request_detail_id) => {
    const result = await Swal.fire({
      title: 'ยืนยันอนุมัติรายการนี้?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '✅ อนุมัติ',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    toggleProcessing(request_detail_id, true);
    try {
      await axiosInstance.put(`/approval/detail/${request_detail_id}/approve`);
      Swal.fire('สำเร็จ', 'อนุมัติรายการเรียบร้อยแล้ว', 'success');
      await fetchRequestDetail();
    } catch (err) {
      console.error('เกิดข้อผิดพลาด', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถอนุมัติรายการนี้ได้', 'error');
    } finally {
      toggleProcessing(request_detail_id, false);
    }
  };

  const handleRejectOne = async (request_detail_id) => {
    const result = await Swal.fire({
      title: 'ยืนยันปฏิเสธรายการนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: '❌ ปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    toggleProcessing(request_detail_id, true);
    try {
      await axiosInstance.put(`/approval/detail/${request_detail_id}/reject`);
      Swal.fire('สำเร็จ', 'ปฏิเสธรายการเรียบร้อยแล้ว', 'success');
      await fetchRequestDetail();
    } catch (err) {
      console.error('เกิดข้อผิดพลาด', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถปฏิเสธรายการนี้ได้', 'error');
    } finally {
      toggleProcessing(request_detail_id, false);
    }
  };

  if (loading) return <p className={styles.loading}>กำลังโหลดข้อมูล...</p>;
  if (!request) return <p className={styles.error}>ไม่พบคำขอ</p>;

  return (
    <div className={styles.pageBackground}>
      <div className={styles.container}>
        <h2 className={styles.title}>รายละเอียดคำขอ: {request.request_code}</h2>
        <div className={styles.infoGrid}>
          <div><strong>วันที่ขอ:</strong> {new Date(request.request_date).toLocaleDateString('th-TH')}</div>
          <div><strong>กำหนดส่ง:</strong> {new Date(request.request_due_date).toLocaleDateString('th-TH')}</div>
          <div><strong>ผู้ขอ:</strong> {request.user_name} ({request.department})</div>
          <div><strong>ประเภทคำขอ:</strong> {request.request_type === 'borrow' ? 'ยืม' : 'เบิก'}</div>
          <div><strong>สถานะ:</strong> <span className={styles.status}>{request.request_status}</span></div>
          <div><strong>ความเร่งด่วน:</strong> {request.is_urgent ? 'ด่วน' : 'ปกติ'}</div>
          <div><strong>หมายเหตุ:</strong> {request.request_note || '-'}</div>
        </div>

        <h3 className={styles.subtitle}>รายการที่ขอ:</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รูป</th>
              <th>ชื่อพัสดุ</th>
              <th>จำนวนที่ขอ</th>
              <th>หน่วย</th>
              <th>หมายเหตุ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d, i) => {
              const isProcessing = processingIds.includes(d.request_detail_id);
              return (
                <tr key={d.request_detail_id}>
                  <td>{i + 1}</td>
                  <td><ItemImage item_img={d.item_img} alt={d.item_name} /></td>
                  <td>{d.item_name}</td>
                  <td>{d.requested_qty}</td>
                  <td>{d.item_unit}</td>
                  <td>{d.request_detail_note || '-'}</td>
                  <td>
                    {d.request_detail_status === 'pending'
                      ? 'รออนุมัติ'
                      : d.request_detail_status === 'approved'
                        ? 'อนุมัติแล้ว'
                        : d.request_detail_status === 'rejected'
                          ? 'ปฏิเสธแล้ว'
                          : '-'}
                  </td>
                  <td>
                    <button
                      className={`${styles.button} ${styles['button-approve']}`}
                      onClick={() => handleApproveOne(d.request_detail_id)}
                      disabled={isProcessing}
                      style={{ marginRight: 8 }}
                    >
                      ✅ อนุมัติ
                    </button>
                    <button
                      className={`${styles.button} ${styles['button-reject']}`}
                      onClick={() => handleRejectOne(d.request_detail_id)}
                      disabled={isProcessing}
                    >
                      ❌ ปฏิเสธ
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {status === 'รอดำเนินการ' && (
          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles['button-approve']}`}
              onClick={handleApproveAll}
              disabled={loading}
            >
              ✅ อนุมัติทั้งหมด
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
