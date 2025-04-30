"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function ApprovalDetail() {
  const requestDetails = {
    requestId: "REQ-20250430-001",
    requester: "นายสมชาย ใจดี",
    date: "30 เมษายน 2568",
    items: [
      { name: "ถุงมือยาง", quantity: 10, unit: "กล่อง" },
      { name: "แอลกอฮอล์", quantity: 5, unit: "ลิตร" },
      { name: "เครื่องวัดความดัน", quantity: 1, unit: "เครื่อง" },
    ],
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>รายละเอียดคำร้องขอเบิก-ยืมพัสดุ</h1>
      <div className={styles.detailBox}>
        <p><strong>เลขที่คำร้อง:</strong> {requestDetails.requestId}</p>
        <p><strong>ผู้ขอ:</strong> {requestDetails.requester}</p>
        <p><strong>วันที่:</strong> {requestDetails.date}</p>
      </div>

      <h2 className={styles.subheading}>รายการที่ร้องขอ</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>ชื่อพัสดุ</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
          </tr>
        </thead>
        <tbody>
          {requestDetails.items.map((item, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{item.name}</td>
              <td>{item.quantity}</td>
              <td>{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
