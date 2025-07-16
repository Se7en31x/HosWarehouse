// src/app/layout.js
'use client';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './globals.css'; // ยังคงใช้ globals.css เหมือนที่คุณเลือก

export default function RootLayout({ children }) {
  return (
    <div className="app-layout-container"> {/* เปลี่ยนชื่อ className เพื่อให้ชัดเจน */}
      {/* Header จะอยู่ด้านบนสุดและขยายเต็มความกว้าง */}
      <Header />

      {/* ส่วนที่รวม Sidebar และ Main Content ที่จะอยู่ใต้ Header */}
      <div className="main-content-wrapper"> {/* เปลี่ยนชื่อ className เพื่อให้ชัดเจน */}
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area (Header ของเนื้อหาส่วนนี้, และ Main content จริงๆ) */}
        <main className="content-area"> {/* เปลี่ยนชื่อ className เพื่อให้ชัดเจน */}
          {children} {/* เนื้อหาของหน้าแต่ละหน้า */}
        </main>
      </div>
    </div>
  );
}