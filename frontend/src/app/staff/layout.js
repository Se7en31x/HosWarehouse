'use client'; // ถ้าจะใช้ useEffect ต้องใส่
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './globals.css';
import { CartProvider } from './context/CartContext';
export default function RootLayout({ children }) {
  return (
    <CartProvider>
      <div className="layout">
        {/* Sidebar */}
        <Sidebar />

        <div className="main-content">
          {/* Header */}
          <Header />

          {/* Main Content */}
          <main>{children}</main>
        </div>
      </div>
    </CartProvider>

  );
}
