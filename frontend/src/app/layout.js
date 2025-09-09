// src/app/layout.js
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer } from "react-toastify";

// ✅ ประกาศ metadata ตรงนี้
export const metadata = {
  title: "HosWarehouse",   // ชื่อแท็บ
  description: "Hospital Warehouse Management System",
  icons: {
    icon: "/favicon.ico",  // ใช้ไฟล์ใน public/
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeButton={true}
          rtl={false}
        />
        <div className="layout">
          <div className="main-content">
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
