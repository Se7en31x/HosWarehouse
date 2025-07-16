// page.js
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.mainHome}>
      {/*
        *** ส่วนของ Header และ Sidebar ของคุณ (จากโค้ดเดิมที่คุณมี) ***
        *** จะอยู่ที่นี่ หรือถูกจัดการโดย Layout Component ของคุณ ***
        *** ผมจะเน้นแค่โค้ดสำหรับเนื้อหาหลักของ Dashboard ตามคำสั่ง ***
      */}

      {/* Main Content Area: พื้นที่แสดงข้อมูลหลักของ Dashboard */}
      <div className={styles.contentWrapper}>
        {/* Overview Cards: บัตรสรุปข้อมูลภาพรวม */}
        <div className={styles.overviewCards}>
          {/* Card: จำนวนคงคลังรวม */}
          <div className={`${styles.card} ${styles.overviewCard}`} style={{ borderLeftColor: '#007bff' }}>
            <div className={styles.cardIcon}><span role="img" aria-label="package">📦</span></div>
            <div className={styles.cardContent}>
              <p className={styles.cardTitle}>จำนวนคงคลังรวม</p>
              <p className={styles.cardValue}>15,876 <span className={styles.unit}>ชิ้น</span></p>
            </div>
          </div>

          {/* Card: รายการใกล้หมด/วิกฤติ */}
          <div className={`${styles.card} ${styles.overviewCard}`} style={{ borderLeftColor: '#dc3545' }}>
            <div className={styles.cardIcon}><span role="img" aria-label="warning">⚠️</span></div>
            <div className={styles.cardContent}>
              <p className={styles.cardTitle}>รายการใกล้หมด/วิกฤติ</p>
              <p className={styles.cardValue}>32 <span className={styles.unit}>รายการ</span></p>
            </div>
          </div>

          {/* Card: มูลค่าคงคลังโดยประมาณ */}
          <div className={`${styles.card} ${styles.overviewCard}`} style={{ borderLeftColor: '#28a745' }}>
            <div className={styles.cardIcon}><span role="img" aria-label="money bag">💰</span></div>
            <div className={styles.cardContent}>
              <p className={styles.cardTitle}>มูลค่าคงคลังโดยประมาณ</p>
              <p className={styles.cardValue}>฿ 12,500,000</p>
            </div>
          </div>

          {/* Card: คำขอรอดำเนินการ */}
          <div className={`${styles.card} ${styles.overviewCard}`} style={{ borderLeftColor: '#ffc107' }}>
            <div className={styles.cardIcon}><span role="img" aria-label="hourglass">⏳</span></div>
            <div className={styles.cardContent}>
              <p className={styles.cardTitle}>คำขอรอดำเนินการ</p>
              <p className={styles.cardValue}>7 <span className={styles.unit}>รายการ</span></p>
            </div>
          </div>
        </div>

        {/* Main Content Grid: ตาราง Grid สำหรับกราฟและข้อมูลด้านข้าง */}
        <div className={styles.mainContentGrid}>
          {/* Chart Card: กราฟภาพรวมการทำรายการ */}
          <div className={`${styles.card} ${styles.chartCard}`}>
            <h3 className={styles.cardHeader}>ภาพรวมการทำรายการ (7 วันล่าสุด)</h3>
            <div className={styles.chartPlaceholder}>
              {/* รูปภาพจำลองกราฟ (จะแทนที่ด้วย Component กราฟจริงเมื่อมีข้อมูล) */}
              <img src="https://via.placeholder.com/800x350/E0F7FA/00BCD4?text=Daily+Inventory+Flow+Chart" alt="ภาพรวมการทำรายการ" style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }} />
              <p className={styles.chartCaption}>
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>— รับเข้า </span>
                <span style={{ color: '#007bff', fontWeight: 'bold' }}>— เบิกจ่าย</span>
              </p>
            </div>
          </div>

          {/* Side Info Cards: บัตรข้อมูลสถานะและกิจกรรมล่าสุด */}
          <div className={styles.sideInfoCards}>
            {/* Status Card: สถานะคำขอทั้งหมด */}
            <div className={`${styles.card} ${styles.statusCard}`}>
              <h3 className={styles.cardHeader}>สถานะคำขอทั้งหมด</h3>
              <div className={styles.statusList}>
                <p className={styles.statusItem}>
                  <span className={`${styles.statusDot} ${styles.pendingDot}`}></span> รอดำเนินการ: <span className={styles.statusCount}>15 รายการ</span>
                </p>
                <p className={styles.statusItem}>
                  <span className={`${styles.statusDot} ${styles.approvedDot}`}></span> อนุมัติแล้ว: <span className={styles.statusCount}>45 รายการ</span>
                </p>
                <p className={styles.statusItem}>
                  <span className={`${styles.statusDot} ${styles.rejectedDot}`}></span> ถูกปฏิเสธ: <span className={styles.statusCount}>5 รายการ</span>
                </p>
              </div>
            </div>

            {/* Activity Card: กิจกรรมล่าสุด */}
            <div className={`${styles.card} ${styles.activityCard}`}>
              <h3 className={styles.cardHeader}>กิจกรรมล่าสุด</h3>
              <table className={styles.activityTable}>
                <thead>
                  <tr>
                    <th>เวลา</th>
                    <th>กิจกรรม</th>
                    <th>แผนก</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>11:45 น.</td>
                    <td>รับเข้ายา Paracetamol</td>
                    <td>เภสัชกรรม</td>
                  </tr>
                  <tr>
                    <td>10:10 น.</td>
                    <td>เบิกผ้าก๊อซ</td>
                    <td>ห้องฉุกเฉิน</td>
                  </tr>
                  <tr>
                    <td>09:30 น.</td>
                    <td>แก้ไขครุภัณฑ์ X-ray</td>
                    <td>วิศวกรรม</td>
                  </tr>
                  <tr>
                    <td>08:00 น.</td>
                    <td>เบิกชุดทำแผล</td>
                    <td>หอผู้ป่วย 3</td>
                  </tr>
                </tbody>
              </table>
              <a href="#" className={styles.viewAllLink}>ดูทั้งหมด »</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}