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

// --- ข้อมูลใหม่สำหรับกราฟ Bar Chart สรุปยอดรวม ---
const summaryActivityData = [
  { name: 'นำเข้า', value: 1500, color: '#28a745' }, // Green
  { name: 'เบิก', value: 750, color: '#dc3545' }, // Red (for outgoing items)
  { name: 'ยืม', value: 45, color: '#ffc107' }, // Amber (for temporary outgoing)
  { name: 'คืน', value: 30, color: '#007bff' }, // Blue (for incoming items)
  { name: 'นำออก', value: 10, color: '#6c757d' }, // Gray
];

// --- ข้อมูลใหม่สำหรับกราฟ Line Chart แนวโน้มรายวัน ---
const dailyActivityTrendData = [
  { date: '2025-07-30', import: 100, withdraw: 30, loan: 2, 'return': 5 },
  { date: '2025-07-31', import: 120, withdraw: 45, loan: 5, 'return': 3 },
  { date: '2025-08-01', import: 80, withdraw: 60, loan: 3, 'return': 7 },
  { date: '2025-08-02', import: 150, withdraw: 50, loan: 1, 'return': 4 },
  { date: '2025-08-03', import: 90, withdraw: 70, loan: 4, 'return': 6 },
  { date: '2025-08-04', import: 110, withdraw: 55, loan: 2, 'return': 8 },
  { date: '2025-08-05', import: 130, withdraw: 65, loan: 3, 'return': 5 },
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

const StockByCategoryChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        outerRadius={100}
        fill="#8884d8"
        dataKey="value"
        nameKey="name"
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => `฿${value.toLocaleString()}`} />
      <Legend />
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

// --- Component สำหรับ Bar Chart สรุปกิจกรรม ---
const ActivitySummaryBarChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart
      data={data}
      margin={{
        top: 5, right: 30, left: 20, bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
      <XAxis dataKey="name" tickLine={false} axisLine={false} />
      <YAxis />
      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(value) => `${value.toLocaleString()} รายการ`} />
      <Legend />
      <Bar dataKey="value" name="จำนวนรายการ" barSize={40} radius={[10, 10, 0, 0]}>
        {
          data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))
        }
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

// --- Component สำหรับ Line Chart แนวโน้มกิจกรรมรายวัน ---
const DailyActivityLineChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart
      data={data}
      margin={{
        top: 5, right: 30, left: 20, bottom: 5,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} formatter={(value) => `${value.toLocaleString()} รายการ`} />
      <Legend />
      <Line type="monotone" dataKey="withdraw" name="เบิก" stroke="#dc3545" activeDot={{ r: 8 }} strokeWidth={2} />
      <Line type="monotone" dataKey="loan" name="ยืม" stroke="#ffc107" activeDot={{ r: 8 }} strokeWidth={2} />
      <Line type="monotone" dataKey="return" name="คืน" stroke="#007bff" activeDot={{ r: 8 }} strokeWidth={2} />
      <Line type="monotone" dataKey="import" name="นำเข้า" stroke="#28a745" activeDot={{ r: 8 }} strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);


const Dashboard = () => {
  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.dashboardTitle}>Dashboard</h1>
      <KPIHeader data={kpiData} />

      <div className={styles.sectionGrid}>
        <div className={styles.sectionCard}>
          <h2>ภาพรวมสต็อกตามหมวดหมู่</h2>
          <StockByCategoryChart data={stockByCategoryData} />
        </div>
        <div className={styles.sectionCard}>
          <h2>สรุปกิจกรรมคลัง (เบิก-ยืม-คืน)</h2>
          <ActivitySummaryBarChart data={summaryActivityData} /> {/* เพิ่ม Bar Chart ที่นี่ */}
        </div>
      </div>

      <div className={styles.sectionGridFull}>
        <div className={styles.sectionCard}>
          <h2>แนวโน้มกิจกรรมคลังรายวัน</h2>
          <DailyActivityLineChart data={dailyActivityTrendData} /> {/* เพิ่ม Line Chart ที่นี่ */}
        </div>
      </div>

      <div className={styles.sectionGridFull}>
        <div className={styles.sectionCard}>
          <h2>การเคลื่อนไหวล่าสุดในคลัง</h2>
          <TransactionTable data={transactionLogData} />
        </div>
      </div>

      <div className={styles.sectionGridFull}>
        <div className={styles.sectionCard}>
          <h2>สถานะครุภัณฑ์และอุปกรณ์ที่ถูกยืม</h2>
          <LoanedTable data={loanedEquipmentData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;