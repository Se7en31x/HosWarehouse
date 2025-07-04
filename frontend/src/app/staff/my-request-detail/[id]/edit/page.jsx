'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axiosInstance from '../../../../utils/axiosInstance';
import Swal from 'sweetalert2';
import Image from 'next/image';
import styles from './page.module.css';

function ItemImage({ item_img, alt }) {
  const defaultImg = 'http://localhost:5000/public/defaults/landscape.png';
  const [imgSrc, setImgSrc] = useState(
    item_img && item_img.trim() !== '' ? `http://localhost:5000/uploads/${item_img}` : defaultImg
  );

  return (
    <Image
      src={imgSrc}
      alt={alt || 'ไม่มีคำอธิบายภาพ'}
      width={70}
      height={70}
      style={{ objectFit: 'cover', borderRadius: '6px' }}
      onError={() => setImgSrc(defaultImg)}
    />
  );
}

export default function EditRequestPage() {
  const router = useRouter();
  const { id: request_id } = useParams();

  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState(null);

  const [editedItems, setEditedItems] = useState([]);
  const [itemsToDelete, setItemsToDelete] = useState([]);

  const [note, setNote] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [requestDate, setRequestDate] = useState('');

  useEffect(() => {
    if (request_id) fetchRequest();
  }, [request_id]);

  const fetchRequest = async () => {
    try {
      const res = await axiosInstance.get(`/my-request-detail/${request_id}?user_id=1`);
      const data = res.data.detail;
      setRequestData(data);
      setNote(data.request_note || '');
      setIsUrgent(data.is_urgent || false);
      setRequestDate(data.request_date?.split('T')[0] || '');

      const items = res.data.items || [];
      setEditedItems(items.map(i => ({
        ...i,
        quantity: i.quantity || 1,
        action: i.request_detail_type || 'withdraw',
      })));
      setItemsToDelete([]);
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'โหลดข้อมูลคำขอไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (id, qty) => {
    if (qty < 1) return;
    setEditedItems(prev => prev.map(item =>
      item.request_detail_id === id ? { ...item, quantity: qty } : item
    ));
  };

  const handleActionChange = (id, action) => {
    setEditedItems(prev => prev.map(item =>
      item.request_detail_id === id ? { ...item, action } : item
    ));
  };

  const handleDeleteItem = (id) => {
    setEditedItems(prev => prev.filter(item => item.request_detail_id !== id));
    setItemsToDelete(prev => [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!requestDate) {
      Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่', 'warning');
      return;
    }
    if (editedItems.length === 0) {
      Swal.fire('แจ้งเตือน', 'กรุณาเพิ่มรายการอย่างน้อย 1 รายการ', 'warning');
      return;
    }

    const payload = {
      request_note: note,
      is_urgent: isUrgent,
      request_due_date: requestDate, // หรือ request_date ถ้า backend ใช้แบบนั้น
      items: editedItems.map(i => ({
        request_detail_id: i.request_detail_id,
        item_id: i.item_id,
        requested_qty: i.quantity,  // ชื่อตรงกับฐานข้อมูล
        request_detail_type: i.action,
      })),
      itemsToDelete,
    };
    try {
      const res = await axiosInstance.put(`/my-request-detail/${request_id}/edit`, payload);
      if (res.status === 200) {
        Swal.fire('สำเร็จ', 'แก้ไขคำขอเรียบร้อยแล้ว', 'success');
        router.push('/staff/my-requests');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('ผิดพลาด', 'ไม่สามารถแก้ไขคำขอได้', 'error');
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>กำลังโหลดข้อมูล...</p>;
  if (!requestData) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>ไม่พบข้อมูลคำขอ</p>;

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>แก้ไขคำขอ {requestData.request_code}</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>รูปภาพ</th>
            <th>ชื่อสินค้า</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
            <th>ประเภทคำขอ</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {editedItems.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: '1rem' }}>ไม่มีรายการ</td>
            </tr>
          ) : (
            editedItems.map((item, idx) => (
              <tr key={item.request_detail_id}>
                <td>{idx + 1}</td>
                <td><ItemImage item_img={item.item_img} alt={item.item_name} /></td>
                <td>{item.item_name}</td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleQtyChange(item.request_detail_id, +e.target.value)}
                    className={styles.qtyInput}
                  />
                </td>
                <td>{item.unit || '-'}</td>
                <td>
                  <select
                    value={item.action}
                    onChange={(e) => handleActionChange(item.request_detail_id, e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="withdraw">เบิก</option>
                    <option value="borrow">ยืม</option>
                    <option value="return">คืน</option>
                  </select>
                </td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => handleDeleteItem(item.request_detail_id)}>ลบ</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className={styles.formGroup}>
        <label>หมายเหตุ</label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={styles.textarea}
          placeholder="ใส่หมายเหตุเพิ่มเติม"
        />
      </div>

      <div className={styles.formRow}>
        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="urgentCheck"
            checked={isUrgent}
            onChange={(e) => setIsUrgent(e.target.checked)}
          />
          <label htmlFor="urgentCheck">เร่งด่วน</label>
        </div>

        <input
          type="date"
          value={requestDate}
          onChange={(e) => setRequestDate(e.target.value)}
          className={styles.dateInput}
        />
      </div>

      <div className={styles.buttonGroup}>
        <button onClick={() => router.back()} className={styles.cancelBtn}>ยกเลิก</button>
        <button onClick={handleSubmit} className={styles.submitBtn}>บันทึก</button>
      </div>
    </div>
  );
}
