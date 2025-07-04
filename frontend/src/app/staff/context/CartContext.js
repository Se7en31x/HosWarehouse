import { useMemo, useEffect, createContext, useState, useCallback } from "react";

export const CartContext = createContext();
CartContext.displayName = "CartContext";

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]); // เก็บรายการ

  // คำนวนจำนวนรวมของสินค้าในตะกร้า
  const totalItems = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  // โหลดข้อมูลจาก localStorage เมื่อเริ่มต้น
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("cartItems");
      const parsed = JSON.parse(storedCart);
      if (Array.isArray(parsed)) {
        setCartItems(parsed);
      }
    } catch (error) {
      console.error("Error loading cart from localStorage", error);
      setCartItems([]);
    }
  }, []);

  // เก็บข้อมูลลง localStorage เมื่อ cartItems มีการเปลี่ยนแปลง
  useEffect(() => {
    if (cartItems.length > 0) {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    } else {
      localStorage.removeItem("cartItems");
    }
  }, [cartItems]);

  const addToCart = useCallback((item) => {
    if (
      !item.id ||
      typeof item.quantity !== "number" ||
      item.quantity <= 0 ||
      !Number.isInteger(item.quantity)
    ) return;

    setCartItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const updateQuantity = useCallback((id, newQty) => {
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQty } : item))
    );
  }, []);

  const removeFromCart = useCallback((id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        clearCart,
        updateQuantity,
        removeFromCart,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
