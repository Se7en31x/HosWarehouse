import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="user-info">
              <img src="https://s.isanook.com/ca/0/ud/284/1423051/821547.jpg?ip/resize/w728/q80/jpg" alt="User Profile" className="user-img" />
              <div className="user-details">
                <p className="user-name">ชื่อผู้ใช้งาน</p>
                <p className="user-position">ตำแหน่ง</p>
              </div>
            </div>

            <hr className="divider" /> {/* เส้นกั้น */}

            <nav>
              <div className="sidebar-item">
                <Link href="/" className="no-style-link">
                  <span className="sidebar-icon">🏠</span> {/* ไอคอน Home */}
                  <span className="sidebar-text">หน้าแรก</span>
                </Link>
              </div>

              <div className="sidebar-item">
                <Link href="/inventoryCheck" className="no-style-link">
                  <span className="sidebar-icon">🔍</span> {/* ไอคอน ตรวจสอบยอดคงคลัง */}
                  <span className="sidebar-text">ตรวจสอบยอดคงคลัง</span>
                </Link>
              </div>

              <div className="sidebar-item">
                <Link href="/approvalRequest" className="no-style-link">
                  <span className="sidebar-icon">✅</span> {/* ไอคอน ตรวจสอบและอนุมัติคำขอเบิก */}
                  <span className="sidebar-text">ตรวจสอบคำขอเบิก</span>
                </Link>
              </div>

              <div className="sidebar-item">
                <Link href="/manageData" className="no-style-link">
                  <span className="sidebar-icon">⚙️</span> {/* ไอคอน จัดการข้อมูล */}
                  <span className="sidebar-text">จัดการข้อมูล</span>
                </Link>
              </div>

              <div className="sidebar-item">
                <Link href="/transactionHistory" className="no-style-link">
                  <span className="sidebar-icon">📜</span> {/* ไอคอน ประวัติการนำเข้านำออก */}
                  <span className="sidebar-text">ประวัติการนำเข้านำออก</span>
                </Link>
              </div>

              <div className="sidebar-item">
                <Link href="/report" className="no-style-link">
                  <span className="sidebar-icon">📊</span> {/* ไอคอน ออกรายงาน */}
                  <span className="sidebar-text">ออกรายงาน</span>
                </Link>
              </div>

            </nav>
          </aside>

          <div className="main-content">
            {/* Header */}
            <header className="header">
              <h1 className="header-title">ระบบคลังโรงพยาบาล</h1>
              <div className="header-icons">
                <button className="icon-button">🔔</button> {/* ไอคอนแจ้งเตือน */}
                <button className="icon-button">⚙️</button> {/* ไอคอนตั้งค่า */}
              </div>
            </header>
            {/* Main Content */}
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}