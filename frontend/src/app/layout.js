'use client';
// import { Html } from "next/document";

// ถ้าจะใช้ useEffect ต้องใส่
// import Sidebar from './components/Sidebar';
// import Header from './components/Header';
// import './globals.css';
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer ,toast} from "react-toastify";
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ToastContainer
          position="top-right" // หรือ "bottom-left", "top-center" เป็นต้น
          autoClose={3000} // เวลาที่จะให้แสดง toast นาน
          hideProgressBar={false} // ถ้าต้องการแสดง progress bar
          newestOnTop={false} // ถ้าอยากให้ล่าสุดแสดงข้างบน
          closeButton={true} // ถ้าต้องการให้ปุ่มปิดแสดง
          rtl={false} // สำหรับการแสดงข้อความจากขวาไปซ้าย
        />
        <div className="layout">
          {/* Sidebar */}
          {/* <Sidebar /> */}

          <div className="main-content">
            {/* Header */}
            {/* <Header /> */}

            {/* Main Content */}
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>

  );
}
