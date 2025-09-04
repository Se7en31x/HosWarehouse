'use client';

import { useContext, useState, useEffect } from 'react';
import { CartContext } from '../context/CartContext';
import styles from './page.module.css';
import Image from 'next/image';
import { staffAxios } from '../../utils/axiosInstance';
import Swal from 'sweetalert2';

export default function Cart() {
  const { cartItems, removeFromCart, clearCart, updateQuantity, updateReturnDate } =
    useContext(CartContext);

  const [urgent, setUrgent] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [requestDate, setRequestDate] = useState(today);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = 1; // TODO: replace with logged-in user id

  const [minReturnDate, setMinReturnDate] = useState('');
  const [maxReturnDate, setMaxReturnDate] = useState('');

  useEffect(() => {
    const todayDate = new Date();
    setMinReturnDate(todayDate.toISOString().split('T')[0]);

    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    setMaxReturnDate(maxDate.toISOString().split('T')[0]);
  }, []);

  const translateCategory = (category) => {
    switch (category) {
      case 'medicine':
        return 'ยา';
      case 'general':
        return 'ของใช้ทั่วไป';
      case 'meddevice':
        return 'อุปกรณ์ทางการแพทย์';
      case 'equipment':
        return 'ครุภัณฑ์';
      case 'medsup':
        return 'เวชภัณฑ์';
      default:
        return category || '-';
    }
  };

  const handleUrgentChange = (e) => setUrgent(e.target.checked);

  const handleQuantityChange = async (itemId, newQuantityStr) => {
    const newQuantity = Number(newQuantityStr);
    const itemInCart = cartItems.find((item) => item.id === itemId);

    if (isNaN(newQuantity) || newQuantity <= 0) {
      await Swal.fire({
        icon: 'error',
        title: 'จำนวนไม่ถูกต้อง',
        text: 'กรุณากรอกจำนวนเป็นตัวเลขบวกที่มากกว่า 0',
      });
      return;
    }

    if (!itemInCart || itemInCart.item_qty == null || isNaN(itemInCart.item_qty)) {
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
        text: `จำนวนที่ต้องการเกินกว่าจำนวนคงเหลือในคลัง (${itemInCart.item_qty} ${
          itemInCart.unit || ''
        })`,
      });
      return;
    }

    updateQuantity(itemId, newQuantity);
  };

  const handleReturnDateChange = async (itemId, newReturnDateStr) => {
    if (!newReturnDateStr) {
      await Swal.fire({ icon: 'error', title: 'วันที่คืนไม่ถูกต้อง', text: 'กรุณาระบุวันที่คืน' });
      return;
    }

    const selectedReturnDate = new Date(newReturnDateStr);
    const todayD = new Date(minReturnDate);
    const maxAllowedDate = new Date(maxReturnDate);

    todayD.setHours(0, 0, 0, 0);
    selectedReturnDate.setHours(0, 0, 0, 0);
    maxAllowedDate.setHours(0, 0, 0, 0);

    if (selectedReturnDate < todayD) {
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

    const allActions = cartItems.map((item) => item.action);
    const allSameAction = allActions.every((action) => action === allActions[0]);
    if (!allSameAction) {
      await Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถส่งรายการได้',
        text: 'ไม่สามารถเบิกและยืมพร้อมกันได้ กรุณาเลือกอย่างใดอย่างหนึ่ง',
      });
      return;
    }

    setIsSubmitting(true);

    const requestType = cartItems[0]?.action || 'withdraw';

    const payload = {
      items: cartItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        action: item.action,
        returnDate: item.action === 'borrow' ? item.returnDate : null,
        borrowstatus: item.action === 'borrow' ? 'waiting_borrow' : null,
      })),
      note,
      urgent,
      date: requestDate,
      type: requestType,
      user_id: userId,
    };

    try {
      const res = await staffAxios.post('/requests', payload);
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

  const handleClearCart = async () => {
    const result = await Swal.fire({
      title: 'ล้างตะกร้าทั้งหมด?',
      text: 'คุณต้องการลบรายการทั้งหมดออกจากตะกร้าหรือไม่',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ล้างตะกร้า',
      cancelButtonText: 'ยกเลิก',
    });
    if (result.isConfirmed) clearCart();
  };

  const translateAction = (action) => {
    switch (action) {
      case 'withdraw':
        return 'เบิก';
      case 'borrow':
        return 'ยืม';
      case 'return':
        return 'คืน';
      default:
        return action;
    }
  };

  // ✅ helper เลือก path รูปภาพ
  const getImageSrc = (imgPath) => {
    if (!imgPath || imgPath.trim() === '') {
      return '/defaults/landscape.png'; // fallback
    }
    // ถ้าเป็น URL จาก backend
    if (imgPath.startsWith('http')) {
      return imgPath;
    }
    // ถ้าเป็น path ใน public เช่น /uploads/xxx.png
    return `/uploads/${imgPath}`;
  };

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h2 className={styles.pageTitle}>
              รายการ{translateAction(cartItems[0]?.action || '')}
            </h2>
          </div>
          <div className={styles.actionsRight}>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={handleClearCart}
              disabled={isSubmitting}
            >
              ล้างตะกร้า
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableFrame} ${styles.scrollable}`}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>รหัส</div>
              <div className={styles.headerItem}>รูปภาพ</div>
              <div className={styles.headerItem}>ชื่อ</div>
              <div className={styles.headerItem}>จำนวน</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>หมวดหมู่</div>
              <div className={styles.headerItem}>ประเภท</div>
              <div className={styles.headerItem}>วันที่คืน</div>
              <div className={styles.headerItem}>การดำเนินการ</div>
            </div>

            <div className={styles.inventory} style={{ '--rows-per-page': 10 }}>
              {cartItems.length > 0 ? (
                cartItems.map((item, index) => (
                  <div key={item.id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{index + 1}</div>
                    <div className={styles.tableCell}>{item.code || '-'}</div>
                    <div className={`${styles.tableCell} ${styles.imageCell}`}>
                      <Image
                        src={getImageSrc(item.item_img)}
                        alt={item.name || 'no-image'}
                        width={50}
                        height={50}
                        style={{
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                        }}
                      />
                    </div>
                    <div className={styles.tableCell}>{item.name || '-'}</div>
                    <div className={styles.tableCell}>
                      <input
                        type="number"
                        min={1}
                        max={item.item_qty || 1}
                        value={item.quantity || 1}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className={styles.quantityInput}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className={styles.tableCell}>{item.unit || '-'}</div>
                    <div className={styles.tableCell}>{translateCategory(item.type)}</div>
                    <div className={styles.tableCell}>
                      {item.action === 'borrow'
                        ? 'ยืม'
                        : item.action === 'withdraw'
                        ? 'เบิก'
                        : 'คืน'}
                    </div>
                    <div className={styles.tableCell}>
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
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <button
                        className={`${styles.actionButton} ${styles.dangerBtnOutline}`}
                        onClick={() => removeFromCart(item.id)}
                        disabled={isSubmitting}
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>
                  ไม่มีรายการในตะกร้า กรุณาเพิ่มรายการก่อนยืนยัน
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className={styles.footerBar}>
          <div className={styles.footerActions}>
            <button
              className={`${styles.actionButton} ${styles.cancelBtn}`}
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              className={`${styles.actionButton} ${styles.successBtn}`}
              onClick={handleSubmit}
              disabled={isSubmitting || cartItems.length === 0 || !requestDate}
            >
              {isSubmitting ? 'กำลังส่ง...' : 'ยืนยัน'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
