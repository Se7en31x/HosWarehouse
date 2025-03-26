import Layout from "./layout.js";
import styles from "./page.module.css";  // ใช้ import แบบนี้

export default function Home() {
  return (
    <div className={styles.mainHome}>  {/* ใช้ styles.mainHome แทน className="main-home" */}
      <div className={styles.dataDashboard}>
        <div className={styles.dashboardData}>
          <p>data ยา</p>
          <hr className={styles.customHr}></hr>
        </div>
        <div className={styles.dashboardData}>data เวชภัณฑ์
          <hr className={styles.customHr}></hr>
        </div>
        <div className={styles.dashboardData}>data ครุภัณฑ์
          <hr className={styles.customHr}></hr>
        </div>
        <div className={styles.dashboardData}>data อุปกรณ์ทางการแพทย์
          <hr className={styles.customHr}></hr>
        </div>
        <div className={styles.dashboardData}>data ของใช้ทั่วไป
          <hr className={styles.customHr}></hr>
        </div>
      </div>

      <div className={styles.chartdata}>
        <p className = {styles.textchart}>ข้อมูลการทำรายการ</p>
      </div>

      <div className = {styles.block}>
        <div>สถานะคำขอทั้งหมด</div>
        <div>กิจกรรมล่าสุด</div>
      </div>

    </div>
  );
}
