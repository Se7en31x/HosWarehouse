// Dashboard.jsx
'use client';

import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import styles from './page.module.css';

// --- ข้อมูลจำลอง (Mock Data) ---
const kpiData = {
  totalValue: '฿25,500,000',
  lowStock: 210,
  outOfStock: 15,
  loanedItems: 45,
};

const stockByCategoryData = [
  { name: 'ยา', value: 12000000, color: '#4CAF50' },
  { name: 'เวชภัณฑ์', value: 8500000, color: '#2196F3' },
  { name: 'ครุภัณฑ์', value: 4000000, color: '#FFC107' },
  { name: 'ของใช้ทั่วไป', value: 1000000, color: '#F44336' },
];

const transactionLogData = [
  { date: '2025-08-05', time: '10:30', type: 'นำเข้า', item: 'Surgical Gloves', amount: '+500 กล่อง', user: 'สมชาย' },
  { date: '2025-08-05', time: '09:45', type: 'เบิก', item: 'Paracetamol 500mg', amount: '-100 แผง', user: 'แผนก OPD' },
  { date: '2025-08-04', time: '16:20', type: 'คืน', item: 'Wheelchair', amount: '+1 คัน', user: 'แผนกผู้ป่วยใน' },
  { date: '2025-08-04', time: '14:00', type: 'ยืม', item: 'Defibrillator', amount: '-1 เครื่อง', user: 'แผนก ER' },
  { date: '2025-08-04', time: '11:10', type: 'นำออก', item: 'ผ้าห่ม (เก่า)', amount: '-10 ผืน', user: 'จัดการทรัพย์สิน' },
];

const loanedEquipmentData = [
  { id: 'C001', name: 'Ultrasound Portable', borrowedDate: '2025-08-01', dueDate: '2025-08-08', status: 'กำลังใช้งาน', borrower: 'คุณหมอสมศรี', dept: 'ศัลยกรรม' },
  { id: 'C005', name: 'Patient Monitor', borrowedDate: '2025-07-28', dueDate: '2025-08-04', status: 'เลยกำหนด', borrower: 'คุณพยาบาลวันดี', dept: 'ICU' },
  { id: 'C012', name: 'Infusion Pump', borrowedDate: '2025-08-04', dueDate: '2025-08-11', status: 'กำลังใช้งาน', borrower: 'คุณพยาบาลฟ้าใส', dept: 'ผู้ป่วยใน' },
];

const KPIHeader = ({ data }) => (
  <div className={styles.kpiContainer}>
    <div className={styles.kpiCard}>
      <p className={styles.kpiValue}>{data.totalValue}</p>
      <p className={styles.kpiLabel}>มูลค่าสต็อกรวม</p>
    </div>
    <div className={styles.kpiCard}>
      <p className={`${styles.kpiValue} ${styles.warning}`}>{data.lowStock}</p>
      <p className={styles.kpiLabel}>รายการต่ำกว่าเกณฑ์</p>
    </div>
    <div className={styles.kpiCard}>
      <p className={`${styles.kpiValue} ${styles.danger}`}>{data.outOfStock}</p>
      <p className={styles.kpiLabel}>รายการหมดสต็อก</p>
    </div>
    <div className={styles.kpiCard}>
      <p className={styles.kpiValue}>{data.loanedItems}</p>
      <p className={styles.kpiLabel}>รายการที่ถูกยืม</p>
    </div>
  </div>
);

// --- เปลี่ยนเป็น Pie Chart ---
const StockByCategoryChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={100} // ขนาดของวงกลม
        fill="#8884d8"
        dataKey="value"
        nameKey="name"
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // แสดงชื่อและเปอร์เซ็นต์
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} /> {/* แสดงมูลค่าเมื่อชี้เมาส์ */}
      <Legend /> {/* แสดงคำอธิบายสี */}
    </PieChart>
  </ResponsiveContainer>
);

const TransactionTable = ({ data }) => (
  <div className={styles.tableContainer}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.th}>วันที่</th>
          <th className={styles.th}>ประเภท</th>
          <th className={styles.th}>ชื่อสินค้า</th>
          <th className={styles.th}>จำนวน</th>
          <th className={styles.th}>ผู้ดำเนินการ</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            <td className={styles.td}>{item.date}</td>
            <td className={styles.td}>
              <span className={`${styles.statusBadge} ${styles[item.type]}`}>{item.type}</span>
            </td>
            <td className={styles.td}>{item.item}</td>
            <td className={styles.td}>{item.amount}</td>
            <td className={styles.td}>{item.user}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const LoanedTable = ({ data }) => (
  <div className={styles.tableContainer}>
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.th}>รหัส</th>
          <th className={styles.th}>ชื่อครุภัณฑ์</th>
          <th className={styles.th}>วันที่ยืม</th>
          <th className={styles.th}>กำหนดคืน</th>
          <th className={styles.th}>สถานะ</th>
          <th className={styles.th}>ผู้ยืม</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={index}>
            <td className={styles.td}>{item.id}</td>
            <td className={styles.td}>{item.name}</td>
            <td className={styles.td}>{item.borrowedDate}</td>
            <td className={styles.td}>{item.dueDate}</td>
            <td className={styles.td}>
              <span className={`${styles.statusBadge} ${item.status === 'เลยกำหนด' ? styles.statusDanger : styles.statusSuccess}`}>{item.status}</span>
            </td>
            <td className={styles.td}>{item.borrower}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Dashboard = () => {
  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.dashboardTitle}>Dashboard </h1>
      <KPIHeader data={kpiData} />

      <div className={styles.sectionGrid}>
        <div className={styles.sectionCard}>
          <h2>ภาพรวมสต็อกตามหมวดหมู่</h2>
          <StockByCategoryChart data={stockByCategoryData} />
        </div>
        <div className={styles.sectionCard}>
          <h2>การเคลื่อนไหวล่าสุดในคลัง</h2>
          <TransactionTable data={transactionLogData} />
        </div>
      </div>

      <div className={styles.sectionGridFull}>
        <div className={styles.sectionCard}>
          <h2>สถานะครุภัณฑ์และอุปกรณ์</h2>
          <LoanedTable data={loanedEquipmentData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;