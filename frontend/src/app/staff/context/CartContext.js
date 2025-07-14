'use client';

import { createContext, useState, useEffect } from 'react';

export const CartContext = createContext();
CartContext.displayName = "CartContext";

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // โหลดข้อมูลตะกร้าจาก Local Storage เมื่อ component โหลดครั้งแรก
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('cartItems');
      if (storedCart) {
        try {
          // ตรวจสอบและกำหนดค่าเริ่มต้นสำหรับ action และ returnDate
          // ในกรณีที่ข้อมูลเก่าใน localStorage ไม่มีสองฟิลด์นี้
          setCartItems(JSON.parse(storedCart).map(item => ({
            ...item,
            action: item.action || 'withdraw', // ค่าเริ่มต้นเป็น 'withdraw' ถ้าไม่มี
            returnDate: item.returnDate || null // ค่าเริ่มต้นเป็น null ถ้าไม่มี
          })));
        } catch (e) {
          console.error("Failed to parse cartItems from localStorage", e);
          localStorage.removeItem('cartItems');
        }
      }
    }
  }, []);

  // บันทึกข้อมูลตะกร้าลง Local Storage ทุกครั้งที่ cartItems เปลี่ยนแปลง
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  /**
   * เพิ่มรายการสินค้าลงในตะกร้า
   * @param {object} itemToAdd - Object ของสินค้าที่ต้องการเพิ่ม
   * ควรมี property: id, quantity, action, returnDate (ถ้ามี), borrowedFromLocation (ถ้ามี)
   */
  const addToCart = (itemToAdd) => { // <-- เปลี่ยนให้รับ itemToAdd เป็น object ก้อนเดียว
    setCartItems((prevItems) => {
      // ตรวจสอบความถูกต้องของ itemToAdd
      if (!itemToAdd || typeof itemToAdd.id === 'undefined' || typeof itemToAdd.quantity !== 'number' || itemToAdd.quantity <= 0) {
        console.error("addToCart: Invalid itemToAdd format or quantity", itemToAdd);
        return prevItems;
      }

      // ค้นหารายการที่มีอยู่แล้วในตะกร้าด้วย id และ action (เพื่อให้แยกรายการเบิก/ยืมของสินค้าเดียวกันได้)
      const existingItemIndex = prevItems.findIndex(
        (i) => i.id === itemToAdd.id && i.action === itemToAdd.action
      );

      if (existingItemIndex > -1) {
        // ถ้ามีรายการนี้อยู่แล้ว ให้อัปเดตจำนวนและข้อมูลอื่นๆ
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + itemToAdd.quantity,
          // อัปเดต action และ returnDate หากมีการระบุใหม่ (หรือใช้ค่าเดิม)
          action: itemToAdd.action || updatedItems[existingItemIndex].action,
          returnDate: itemToAdd.returnDate || updatedItems[existingItemIndex].returnDate,
          borrowedFromLocation: itemToAdd.borrowedFromLocation || updatedItems[existingItemIndex].borrowedFromLocation,
        };
        return updatedItems;
      } else {
        // ถ้ายังไม่มีรายการนี้ ให้เพิ่ม item ใหม่
        return [
          ...prevItems,
          {
            ...itemToAdd, // กระจาย property ทั้งหมดของ itemToAdd เข้าไป
            action: itemToAdd.action || 'withdraw', // ตั้งค่าเริ่มต้นถ้าไม่ได้ส่งมา
            returnDate: itemToAdd.returnDate || null, // ตั้งค่าเริ่มต้นถ้าไม่ได้ส่งมา
            borrowedFromLocation: itemToAdd.borrowedFromLocation || null, // ตั้งค่าเริ่มต้นถ้าไม่ได้ส่งมา
          },
        ];
      }
    });
  };

  const removeFromCart = (idToRemove) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== idToRemove));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const updateQuantity = (itemId, newQuantity) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateReturnDate = (itemId, newReturnDate) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, returnDate: newReturnDate } : item
      )
    );
  };

  const contextValue = {
    cartItems,
    addToCart,
    removeFromCart,
    clearCart,
    updateQuantity,
    updateReturnDate,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}
