
import { useMemo, useEffect, createContext, useState } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);// เก็บรายการ

    const totalItems = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    }, [cartItems]);
    
    CartContext.displayName = "CartContext";

    // โหลดข้อมูลจาก localStorage เมื่อเริ่มต้น
    useEffect(() => {
        try {
            const storedCart = localStorage.getItem("cartItems");
            const parsed = JSON.parse(storedCart);
            if (Array.isArray(parsed)) {
                setCartItems(parsed);
            } else {
                setCartItems([]);
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



    const addToCart = (item) => { //เพิ่มรายการไปที่ cart
        if (!item.id || typeof item.quantity !== "number" || item.quantity <= 0) return;

        setCartItems((prev) => {
            const exists = prev.find((i) => i.id === item.id);
            if (exists) {
                return prev.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
                );
            }
            return [...prev, item];
        });
    };

    const updateQuantity = (id, newQty) => {
        if (newQty <= 0) {
            removeFromCart(id);
            return;
        }

        setCartItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, quantity: newQty } : item
            )
        );
    };

    const removeFromCart = (id) => { // ลบค่า
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    const clearCart = () => setCartItems([]); // ล้างค่า

    return (
        <CartContext.Provider value={{ cartItems, addToCart, clearCart, updateQuantity, removeFromCart, totalItems }}>
            {children}
        </CartContext.Provider>
    );
}