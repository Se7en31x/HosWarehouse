import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.mainHome}>
      {/* ส่วนข้อมูลประเภทต่างๆ */}
      <div className={styles.dataDashboard}>
        {["ยา", "เวชภัณฑ์", "ครุภัณฑ์", "อุปกรณ์ทางการแพทย์", "ของใช้ทั่วไป"].map((item, index) => (
          <div key={index} className={styles.dashboardData}>
            <div className={styles.cardHeader}>{`ข้อมูล${item}`}</div>
          </div>
        ))}
      </div>

      {/* ส่วนแสดงข้อมูลหลัก */}
      <div className={styles.dashboardContainer}>
        {/* กราฟข้อมูลการทำรายการ */}
        <div className={styles.chartdata}>
          <div className={styles.cardHeader}>ข้อมูลการทำรายการ</div>
          <div className={styles.chartPlaceholder}>{/* ใส่กราฟที่นี่ */}</div>
        </div>

        {/* กล่องสถานะคำขอ + กิจกรรมล่าสุด */}
        <div className={styles.infoContainer}>
          <div className={styles.requestStatus}>
            <div className={styles.cardHeader}>สถานะคำขอทั้งหมด</div>
            <p className={styles.dateRightTop}>📅 วันที่: 07/03/2023</p>
            <p className={styles.requestStatusItem}>
              ⏳ รอดำเนินการ <span className={styles.pending}>15 รายการ</span>
            </p>
            <p className={styles.requestStatusItem}>
              ✅ อนุมัติแล้ว <span className={styles.approved}>45 รายการ</span>
            </p>
            <p className={styles.requestStatusItem}>
              ❌ ถูกปฏิเสธ <span className={styles.rejected}>5 รายการ</span>
            </p>
          </div>

          <div className={styles.recentActivity}>
            <div className={styles.cardHeader}>กิจกรรมล่าสุด</div>
            <table>
              <thead>
                <tr>
                  <th>เวลา</th>
                  <th>กิจกรรม</th>
                  <th>แผน</th>
                  <th>จำนวนรายการ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>08:15 น.</td>
                  <td>ทำรายการเบิก</td>
                  <td>ทีมการแพทย์</td>
                  <td>12 รายการ</td>
                </tr>
                <tr>
                  <td>09:00 น.</td>
                  <td>ทำรายการเบิก</td>
                  <td>เวชระเบียน</td>
                  <td>10 รายการ</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
