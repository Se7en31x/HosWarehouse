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
        name: "ผ้าพันแผล",
        quantity: 5,
        unit: "กล่อง",
        category: "เวชภัณฑ์",
        available: true,
        image: "/images/bandage.png",
      },
      {
        id: "00456",
        name: "ยาพาราเซตามอล",
        quantity: 10,
        unit: "กระปุก",
        category: "ยา",
        available: true,
        image: "/images/paracetamol.png",
      },
      {
        id: "00789",
        name: "เข็มฉีดยา",
        quantity: 3,
        unit: "กล่อง",
        category: "อุปกรณ์การแพทย์",
        available: true,
        image: "/images/injection.png",
      },
      {
        id: "01012",
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

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>ตรวจสอบรายละเอียดคำร้องขอ</h1>
      
      <div className={styles.flexBox}>
        {/* ตารางรายการ */}
        <table className={styles.table}>
          <thead>
            <tr>
              <th>หมายเลข</th>
              <th>รูปภาพ</th>
              <th>ชื่อ</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>หมวดหมู่</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {requestDetails.items.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>
                  <img src={item.image} alt={item.name} width="40" height="40" />
                </td>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>{item.category}</td>
                <td>
                  {item.available ? <span style={{ color: "green" }}>✔ มีของ</span> : "✖ ไม่มี"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>


        {/* กล่องขวา: ข้อมูลคำร้อง + สถานะ */}
        <div className={styles.detailsBox}>
          {/* กล่องข้อมูลคำร้อง */}
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

          {/* กล่องสถานะการนำส่ง */}
          <div className={styles.timelineBox}>
            <h3>สถานะการนำส่ง</h3>
            <ul>
              {requestDetails.timeline.map((step, index) => (
                <li key={index}>
                  <span style={{ color: step.completed ? "green" : "gray" }}>●</span>{" "}
                  {step.step} {step.time ? `(${step.time})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ปุ่มอนุมัติ/ยกเลิก */}
      <div className={styles.buttonBox}>
        <button className={styles.cancelButton}>ยกเลิก</button>
        <button className={styles.approveButton}>อนุมัติ</button>
      </div>
    </div>
  );
}
