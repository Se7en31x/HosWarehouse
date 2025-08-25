'use client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './globals.css';

// 🔔 Import Provider ที่เราสร้างไว้
import { NotificationProvider } from '../context/NotificationContextPurchasing';

export default function RootLayout({ children }) {
  return (
    <NotificationProvider>   {/* ✅ ครอบทั้งแอป */}
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
    </NotificationProvider>
  );
}
