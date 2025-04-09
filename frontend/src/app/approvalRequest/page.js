"use client";

import styles from "./page.module.css";

export default function approvalRequest(){
    return(
        <div className={styles.mainHome}>

        <div className={styles.dashboardContainer}>
        {/* กราฟข้อมูลการทำรายการ */}
            <div className={styles.chartdata}>
                <div className={styles.cardHeader}>ข้อมูลการทำรายการ</div>
                <div className={styles.chartPlaceholder}>{/* ใส่กราฟที่นี่ */}</div>
            </div> 
            
            {/* กล่องสถานะคำขอ + กิจกรรมล่าสุด */}
        <div className={styles.infoContainer}>
          </div>

          <div className={styles.recentActivity}>
          </div>
        </div>
    </div>
    );
}