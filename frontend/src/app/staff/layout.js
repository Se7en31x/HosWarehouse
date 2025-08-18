'use client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './globals.css';
import 'react-day-picker/dist/style.css';


import { CartProvider } from './context/CartContext'; // ✅ เพิ่มบรรทัดนี้

export default function RootLayout({ children }) {
  return (
    <CartProvider> {/* ✅ ครอบ context provider ตรงนี้ */}
      <div className="app-layout-container">
        <Header />
        <div className="main-content-wrapper">
          <Sidebar />
          <main className="content-area">
            {children}
          </main>
        </div>
      </div>
    </CartProvider>
  );
}