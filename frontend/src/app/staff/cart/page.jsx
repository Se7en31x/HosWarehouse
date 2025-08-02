'use client';

import { useContext, useState, useEffect } from 'react';
import { CartContext } from '../context/CartContext';
import styles from './page.module.css';
import Image from 'next/image';
import axiosInstance from '../../utils/axiosInstance';
import Swal from 'sweetalert2';

export default function Cart() {
  const { cartItems, removeFromCart, clearCart, updateQuantity, updateReturnDate } = useContext(CartContext);

  const [urgent, setUrgent] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [requestDate, setRequestDate] = useState(today);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = 1; // จะปรับเป็น login user ในภายหลัง

  const [minReturnDate, setMinReturnDate] = useState('');
  const [maxReturnDate, setMaxReturnDate] = useState('');

  useEffect(() => {
    const todayDate = new Date();
    setMinReturnDate(todayDate.toISOString().split('T')[0]);

    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    setMaxReturnDate(maxDate.toISOString().split('T')[0]);
  }, []);

  const handleUrgentChange = (e) => {
    setUrgent(e.target.checked);
  };

  const handleQuantityChange = async (itemId, newQuantityStr) => {
    const newQuantity = Number(newQuantityStr);

    const itemInCart = cartItems.find(item => item.id === itemId);

    if (isNaN(newQuantity) || newQuantity <= 0) {
      await Swal.fire({
        icon: 'error',
        title: 'จำนวนไม่ถูกต้อง',
        text: 'กรุณากรอกจำนวนเป็นตัวเลขบวกที่มากกว่า 0',
      });
      return;
    }

    if (!itemInCart || typeof itemInCart.item_qty === 'undefined' || itemInCart.item_qty === null || isNaN(itemInCart.item_qty)) {
      await Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาดข้อมูลสินค้า',
        text: 'ไม่สามารถตรวจสอบจำนวนคงเหลือของสินค้าได้ กรุณาลองใหม่อีกครั้ง',
      });
      console.error(`[Cart.js] Missing or invalid item_qty for item ID: ${itemId}`, itemInCart);
      return;
    }

    if (newQuantity > itemInCart.item_qty) {
      await Swal.fire({
        icon: 'error',
        title: 'จำนวนไม่เพียงพอ',
        text: `จำนวนที่ต้องการเกินกว่าจำนวนคงเหลือในคลัง (${itemInCart.item_qty} ${itemInCart.unit || ''})`,
      });
      return;
    }

    updateQuantity(itemId, newQuantity);
  };

  const handleReturnDateChange = async (itemId, newReturnDateStr) => {
    if (!newReturnDateStr) {
      await Swal.fire({
        icon: 'error',
        title: 'วันที่คืนไม่ถูกต้อง',
        text: 'กรุณาระบุวันที่คืน',
      });
      return;
    }

    const selectedReturnDate = new Date(newReturnDateStr);
    const today = new Date(minReturnDate);
    const maxAllowedDate = new Date(maxReturnDate);

    today.setHours(0, 0, 0, 0);
    selectedReturnDate.setHours(0, 0, 0, 0);
    maxAllowedDate.setHours(0, 0, 0, 0);

    if (selectedReturnDate < today) {
      await Swal.fire({
        icon: 'error',
        title: 'วันที่คืนไม่ถูกต้อง',
        text: 'วันที่คืนต้องไม่ย้อนหลังกว่าวันนี้',
      });
      return;
    }
    if (selectedReturnDate > maxAllowedDate) {
      await Swal.fire({
        icon: 'error',
        title: 'วันที่คืนไม่ถูกต้อง',
        text: 'วันที่คืนต้องไม่เกิน 3 เดือนนับจากวันนี้',
      });
      return;
    }

    updateReturnDate(itemId, newReturnDateStr);
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

    const allActions = cartItems.map(item => item.action);
    const allSameAction = allActions.every(action => action === allActions[0]);

    if (!allSameAction) {
      await Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถส่งรายการได้',
        text: 'ไม่สามารถเบิกและยืมพร้อมกันได้ กรุณาเลือกอย่างใดอย่างหนึ่ง',
      });
      return;
    }

    setIsSubmitting(true);

    const translatedType = {
      withdraw: 'Withdraw',
      borrow: 'Borrow',
      return: 'Return',
    }[cartItems[0]?.action] || 'Withdraw';

    const payload = {
      items: cartItems.map((item) => {
        return {
          id: item.id,
          quantity: item.quantity,
          action: item.action,
          returnDate: item.action === 'borrow' ? item.returnDate : null,
          borrowedFromLocation: item.action === 'return' ? item.borrowedFromLocation : null,
        };
      }),
      note,
      urgent,
      date: requestDate,
      type: translatedType,
      user_id: userId,
    };

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
        setRequestDate(today);
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
      setRequestDate(today);
      clearCart();
    }
  };

  const translateAction = (action) => {
    switch (action) {
      case 'withdraw': return 'เบิก';
      case 'borrow': return 'ยืม';
      case 'return': return 'คืน';
      default: return action;
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.header}>
        รายการ{translateAction(cartItems[0]?.action || '')}
      </h2>
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
              <th>ประเภท</th>
              <th>วันที่คืน</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, index) => {
              return (
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
                  <td>
                    <input
                      type="number"
                      min="1"
                      max={item.item_qty || 1}
                      value={item.quantity || 1}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                      className={styles.quantityInput}
                      disabled={isSubmitting}
                    />
                  </td>
                  <td>{item.unit || '-'}</td>
                  <td>{item.type || '-'}</td>
                  <td>{translateAction(item.action)}</td>
                  <td>
                    {item.action === 'borrow' ? (
                      <input
                        type="date"
                        value={item.returnDate || ''}
                        onChange={(e) => handleReturnDateChange(item.id, e.target.value)}
                        min={minReturnDate}
                        max={maxReturnDate}
                        className={styles.dateInput}
                        disabled={isSubmitting}
                      />
                    ) : (
                      '-'
                    )}
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
              );
            })}

            {cartItems.length === 0 && (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>ไม่มีรายการในตะกร้า กรุณาเพิ่มรายการก่อนยืนยัน</td>
              </tr>
            )}
            {[...Array(Math.max(0, 10 - cartItems.length))].map((_, i) => (
              <tr key={`empty-${i}`}>
                <td colSpan={10}>&nbsp;</td>
              </tr>
            ))}
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
