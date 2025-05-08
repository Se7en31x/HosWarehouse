"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Report() {
    const [filter, setFilter] = useState("");
    const [category, setCategory] = useState("");
    const [unit, setUnit] = useState("");
    const [storage, setStorage] = useState("");
  
    const handleFilterChange = (event) => {
      setFilter(event.target.value);
    };
  
    const handleCategoryChange = (event) => {
      setCategory(event.target.value);
    };
  
    const handleUnitChange = (event) => {
      setUnit(event.target.value);
    };
  
    const handleStorageChange = (event) => {
      setStorage(event.target.value);
    };

   
    return(
        <div className={styles.mainHome}>
             {/* แถบบน */}
            <div className={styles.bar}>
             {/* ช่องค้นหา */}
              <h1>ออกรายงาน</h1>
                <div className={styles.filterGroupSearch}>
                    <label htmlFor="filter" className={styles.filterLabel}></label>
                    <input 
                    type="text" 
                    id="filter" 
                    className={styles.filterInput} 
                    value={filter} 
                    onChange={handleFilterChange} 
                    placeholder="กรอกเพื่อค้นหา..." 
                    />
                </div>
               </div>
        
               <div className={styles.mainbody}>
                 {/* แถบหัวข้อคล้าย Excel */}
                    <div className={styles.tableHeader}>
                        <div className={styles.headerItem}>ลำดับ</div>
                        <div className={styles.headerItem}>รายงาน</div>
                        <div className={styles.headerItem}>จัดการ</div>
                    </div>
                    
               </div>

        </div>
    );
}