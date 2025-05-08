"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function ApprovalDetail() {
  const requestDetails = {
    requestId: "12345",
    requestDate: "06/03/2025",
    requester: "นพ.สมชาย",
    department: "แผนกกายภาพบำบัด",
    dueDate: "01/03/2025",
    status: "รอดำเนินการ",
    items: [
      {
        id: "00123",
        img: "s",
        name: "ผ้าพันแผล",
        quantity: 5,
        unit: "กล่อง",
        category: "เวชภัณฑ์",
        available: true,
        image: "/images/bandage.png",
      },
      {
        id: "00456",
        img: "s",
        name: "ยาพาราเซตามอล",
        quantity: 10,
        unit: "กระปุก",
        category: "ยา",
        available: true,
        image: "/images/paracetamol.png",
      },
      {
        id: "00789",
        img: "s",
        name: "เข็มฉีดยา",
        quantity: 3,
        unit: "กล่อง",
        category: "อุปกรณ์การแพทย์",
        available: true,
        image: "/images/injection.png",
      },
      {
        id: "01012",
        img: "s",
        name: "น้ำเกลือ 0.9%",
        quantity: 30,
        unit: "ขวด",
        category: "เวชภัณฑ์",
        available: true,
        image: "/images/saline.png",
      },
    ],
    timeline: [
      { step: "ส่งคำร้อง", time: "2025-03-01 10:15", completed: true },
      { step: "รอตรวจสอบคำร้อง", time: "2025-03-01 11:00", completed: true },
      { step: "กำลังเตรียม", time: null, completed: false },
      { step: "อยู่ระหว่างนำส่ง", time: null, completed: false },
      { step: "เสร็จสิ้น", time: null, completed: false },
    ],
  };

  const currentItems = requestDetails.items;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>ตรวจสอบรายละเอียดคำร้องขอ</h1>

      <div className={styles.flexBox}>
        {/* ตารางรายการ */}
        <div className={styles.maindata}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>รายการที่</div>
            <div className={styles.headerItem}>รูปภาพ</div>
            <div className={styles.headerItem}>รายการ</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={styles.headerItem}>หน่วย</div>
            <div className={styles.headerItem}>หมวดหมู่</div>
            <div className={styles.headerItem}>สถานะ</div>
          </div>

          <div className={styles.inventory}>
            {currentItems.map((item) => (
              <div className={`${styles.tableGrid} ${styles.tableRow}`} key={item.id}>
                <div className={styles.tableCell}>{item.id}</div>
                <div className={styles.tableCell}>{item.img}</div>
                <div className={styles.tableCell}>{item.name}</div>
                <div className={styles.tableCell}>{item.quantity}</div>
                <div className={styles.tableCell}>{item.unit}</div>
                <div className={styles.tableCell}>{item.category}</div>
                <div className={styles.tableCell}>{item.available ? "พร้อมเบิก" : "ไม่มีในคลัง"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* กล่องขวา: ข้อมูลคำร้อง + สถานะ */}
        <div className={styles.detailsBox}>
          <div className={styles.infoBox}>
            <h3>ข้อมูลคำร้อง</h3>
            <p><strong>หมายเลขคำร้อง:</strong> {requestDetails.requestId}</p>
            <p><strong>วันที่ขอเบิก:</strong> {requestDetails.requestDate}</p>
            <p><strong>ผู้ขอเบิก:</strong> {requestDetails.requester}</p>
            <p><strong>แผนก/หน่วยงาน:</strong> {requestDetails.department}</p>
            <p><strong>จำนวนรายการ:</strong> {requestDetails.items.length} รายการ</p>
            <p><strong>สถานะคำร้อง:</strong> {requestDetails.status}</p>
            <p><strong>วันที่ต้องการรับวัสดุ:</strong> {requestDetails.dueDate}</p>
          </div>

          <div className={styles.timelineBox}>
            <h3>สถานะการนำส่ง</h3>
            <ul>
              {requestDetails.timeline.map((step, index) => (
                <li key={index}>
                  <span style={{ color: step.completed ? "green" : "gray" }}>●</span>{" "}
                  {step.step} {step.time && <span>({step.time})</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className={styles.buttonBox}>
        <button className={styles.cancelButton}>ยกเลิก</button>
        <button className={styles.approveButton}>อนุมัติ</button>
      </div>
    </div>
  );
}
