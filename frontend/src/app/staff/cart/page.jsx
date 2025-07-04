'use client';

import { useContext, useState } from 'react';
import { CartContext } from '../context/CartContext';
import styles from './page.module.css';
import Image from 'next/image';
import axiosInstance from '../../utils/axiosInstance';
import Swal from 'sweetalert2';

export default function Cart() {
  const { cartItems, removeFromCart, clearCart } = useContext(CartContext);

  const [urgent, setUrgent] = useState(false);
  const [requestDate, setRequestDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = 1; // จะปรับเป็น login user ในภายหลัง

  const handleUrgentChange = (e) => {
    setUrgent(e.target.checked);
  };

  const handleSubmit = async () => {
    if (!requestDate || cartItems.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณาเลือกวันที่ และเพิ่มรายการเบิก/ยืม',
      });
      return;
    }

    setIsSubmitting(true);

    const actionType = cartItems[0]?.action || 'withdraw';
    const translatedType =
      actionType === 'เบิก' ? 'Withdraw' :
        actionType === 'ยืม' ? 'Borrow' :
          actionType === 'คืน' ? 'Return' :
            actionType;

    const payload = {
      items: cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        action: item.action,
      })),
      note,
      urgent,
      date: requestDate,
      type: translatedType,
      user_id: userId,
    };
    console.log('payload to send:', payload);
    try {
      const res = await axiosInstance.post('/requests', payload);
      if (res.status === 200 || res.status === 201) {
        await Swal.fire({
          icon: 'success',
          title: 'ส่งคำขอสำเร็จ',
          showConfirmButton: false,
          timer: 2000,
        });

        setNote('');
        setUrgent(false);
        setRequestDate('');
        clearCart();
      }
    } catch (err) {
      console.error(err);
      await Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถส่งคำขอได้ โปรดลองใหม่ภายหลัง',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'การยกเลิกนี้จะล้างข้อมูลทั้งหมดในฟอร์ม',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบทั้งหมด',
      cancelButtonText: 'ยกเลิก',
    });

    if (result.isConfirmed) {
      setNote('');
      setUrgent(false);
      setRequestDate('');
      clearCart();
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>รายการเบิก/ยืม</h2>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัส</th>
              <th>รูปภาพ</th>
              <th>ชื่อ</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>หมวดหมู่</th>
              <th>สถานที่จัดเก็บ</th>
              <th>ประเภท</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td>{item.code || '-'}</td>
                <td>
                  <Image
                    src={item.item_img || '/defaults/landscape.png'}
                    alt={item.name}
                    width={50}
                    height={50}
                    style={{ objectFit: 'cover', borderRadius: '4px' }}
                  />
                </td>
                <td>{item.name || '-'}</td>
                <td>{item.quantity || 0}</td>
                <td>{item.unit || '-'}</td>
                <td>{item.type || '-'}</td>
                <td>{item.location || '-'}</td>
                <td>
                  {item.action === 'borrow'
                    ? 'ยืม'
                    : item.action === 'withdraw'
                      ? 'เบิก'
                      : item.action}
                </td>
                <td>
                  <button
                    className={styles.delete}
                    onClick={() => removeFromCart(item.id)}
                    disabled={isSubmitting}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {cartItems.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '1rem' }}>
                  ไม่มีรายการในตะกร้า
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.footer}>
        <div className={styles.formRow}>
          <div className={styles.leftColumn}>
            <div className={styles.topRow}>
              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={urgent}
                    onChange={handleUrgentChange}
                    disabled={isSubmitting}
                  />
                  <span>ต้องการเร่งด่วน</span>
                </label>
              </div>

              <input
                type="date"
                className={styles.datePicker}
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <textarea
              className={styles.textarea}
              placeholder="หมายเหตุ"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.rightColumn}>
            <div className={styles.buttons}>
              <button
                className={styles.cancel}
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                className={styles.draft}
                onClick={() =>
                  Swal.fire({
                    icon: 'info',
                    title: 'ฟีเจอร์ฉบับร่าง',
                    text: 'ยังไม่พร้อมใช้งานในขณะนี้',
                  })
                }
                disabled={isSubmitting}
              >
                ฉบับร่าง
              </button>
              <button
                className={styles.confirm}
                onClick={handleSubmit}
                disabled={isSubmitting || cartItems.length === 0 || !requestDate}
              >
                {isSubmitting ? 'กำลังส่ง...' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
