'use client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './globals.css';

// 🔔 Context Providers
import { NotificationProvider } from '../context/NotificationContextUser';
import { CartProvider } from '../staff/context/CartContext';

export default function RootLayout({ children }) {
  return (
    <NotificationProvider>
      <CartProvider>  {/* ✅ ครอบ Cart ด้วย */}
        <div className="app-layout-container">
          {/* Header ด้านบน */}
          <Header />

          {/* Layout ส่วนที่เหลือ */}
          <div className="main-content-wrapper">
            <Sidebar />

            <main className="content-area">
              {children}
            </main>
          </div>
        </div>
      </CartProvider>
    </NotificationProvider>
  );
}
