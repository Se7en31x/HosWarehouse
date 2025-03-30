// src/app/layout.js
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
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
      </body>
    </html>
  );
}
