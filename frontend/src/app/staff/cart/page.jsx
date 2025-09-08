'use client';

import { useContext, useState, useEffect } from 'react';
import { CartContext } from '../context/CartContext';
import styles from './page.module.css';
import Image from 'next/image';
import { staffAxios } from '../../utils/axiosInstance';
import Swal from 'sweetalert2';

// Map รหัสแผนกเป็นชื่อ
const departmentMap = {
  "01": "แผนกเวชระเบียน",
  "02": "แผนกผู้ป่วยใน",
  "03": "แผนกจ่ายยา",
  "04": "แผนกฉุกเฉิน",
  "05": "แผนกผู้ป่วยนอก",
  "06": "แผนกชีวาภิบาล",
  "07": "แผนกคลัง",
};

export default function Cart() {
  const { cartItems, removeFromCart, clearCart, updateQuantity, updateReturnDate } =
    useContext(CartContext);

  const [urgent, setUrgent] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [requestDate, setRequestDate] = useState(today);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [minReturnDate, setMinReturnDate] = useState('');
  const [maxReturnDate, setMaxReturnDate] = useState('');

  // department state
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');

  useEffect(() => {
    const todayDate = new Date();
    setMinReturnDate(todayDate.toISOString().split('T')[0]);

    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    setMaxReturnDate(maxDate.toISOString().split('T')[0]);

    // decode JWT token เพื่อเอา departments
    const token = localStorage.getItem('authToken_staff');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.departments && payload.departments.length > 0) {
          // ✅ normalize: ถ้าเป็นชื่อเต็ม → แปลงกลับมาเป็น code
          const deptCodes = payload.departments.map((dept) => {
            const foundCode = Object.keys(departmentMap).find(
              (code) => departmentMap[code] === dept
            );
            return foundCode || dept;
          });

          setDepartments(deptCodes);
          setSelectedDept(deptCodes[0]); // ใช้อันแรกเป็นค่าเริ่มต้น
        }
      } catch (err) {
        console.error('ไม่สามารถ decode token:', err);
      }
    }
  }, []);

  const translateCategory = (category) => {
    switch (category) {
      case 'medicine': return 'ยา';
      case 'general': return 'ของใช้ทั่วไป';
      case 'meddevice': return 'อุปกรณ์ทางการแพทย์';
      case 'equipment': return 'ครุภัณฑ์';
      case 'medsup': return 'เวชภัณฑ์';
      default: return category || '-';
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
        text: `จำนวนที่ต้องการเกินกว่าจำนวนคงเหลือในคลัง (${itemInCart.item_qty} ${itemInCart.unit || ''})`,
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
    if (!requestDate || cartItems.length === 0 || !selectedDept) {
      await Swal.fire({
        icon: 'warning',
        title: 'กรุณากรอกข้อมูลให้ครบ',
        text: 'กรุณาเลือกวันที่, รายการ และแผนก',
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
      department_id: selectedDept, // ✅ ส่งเป็น code เสมอ
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
      case 'withdraw': return 'เบิก';
      case 'borrow': return 'ยืม';
      case 'return': return 'คืน';
      default: return action;
    }
  };

  const getImageSrc = (imgPath) => {
    if (!imgPath || imgPath.trim() === '') {
      return '/defaults/landscape.png';
    }
    if (imgPath.startsWith('http')) {
      return imgPath;
    }
    return `/uploads/${imgPath}`;
  };

  // Pagination for consistent table height
  const itemsPerPage = 10;

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h2 className={styles.pageTitle}>
              รายการ{translateAction(cartItems[0]?.action || '')}
            </h2>
          </div>
        </div>

        {/* Table Section */}
        <div className={styles.tableFrame} style={{ '--rows-per-page': itemsPerPage }}>
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

          <div className={styles.tableBody}>
            {cartItems.length > 0 ? (
              <>
                {cartItems.map((item, index) => (
                  <div key={item.id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{index + 1}</div>
                    <div className={styles.tableCell}>{item.code || '-'}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell} ${styles.imageCell}`}>
                      <Image
                        src={getImageSrc(item.item_img)}
                        alt={item.name || 'no-image'}
                        width={45}
                        height={45}
                        className={styles.imgThumb}
                        onError={(e) => {
                          e.target.src = '/defaults/landscape.png';
                        }}
                      />
                    </div>
                    <div className={styles.tableCell} title={item.name}>{item.name || '-'}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
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
                    {/* ✅ Align กลางเพิ่มตรงนี้ */}
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.unit || '-'}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{translateCategory(item.type)}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {item.action === 'borrow'
                        ? 'ยืม'
                        : item.action === 'withdraw'
                          ? 'เบิก'
                          : 'คืน'}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
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
                ))}
                {/* Filler rows */}
                {Array.from({ length: Math.max(0, itemsPerPage - cartItems.length) }).map((_, i) => (
                  <div
                    key={`filler-${i}`}
                    className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                    aria-hidden="true"
                  >
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell} ${styles.imageCell}`}>&nbsp;</div>
                    <div className={styles.tableCell}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  </div>
                ))}
              </>
            ) : (
              <div className={styles.noDataCell}>ไม่มีรายการในตะกร้า กรุณาเพิ่มรายการก่อนยืนยัน</div>
            )}
          </div>
        </div>

        {/* Request Section */}
        <div className={styles.requestSection}>
          <div className={styles.requestHeader}>
            <h3 className={styles.requestTitle}>รายละเอียดคำขอ</h3>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="requestDate">📅 วันที่นำส่ง</label>
              <input
                type="date"
                id="requestDate"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                disabled={isSubmitting}
                className={styles.inputField}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="urgent">⚡ เร่งด่วน</label>
              <div className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  id="urgent"
                  checked={urgent}
                  onChange={handleUrgentChange}
                  disabled={isSubmitting}
                />
                <span>ต้องการเร่งด่วน</span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="department">🏥 เลือกแผนก</label>
              <select
                id="department"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                disabled={isSubmitting}
                className={styles.selectInput}
              >
                {departments.map((deptCode) => (
                  <option key={deptCode} value={deptCode}>
                    {departmentMap[deptCode] || deptCode}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${styles.noteBox}`}>
              <label htmlFor="note">📝 หมายเหตุ</label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
                className={styles.textareaField}
                rows="3"
                placeholder="กรอกหมายเหตุเพิ่มเติม (ถ้ามี)"
              />
            </div>
          </div>

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
    </div>
  );
}
