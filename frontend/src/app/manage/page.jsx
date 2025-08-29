"use client";
import { useEffect, useState } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import ReactECharts from "echarts-for-react";
import {
  Package,
  ClipboardList,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import styles from "./page.module.css";

export default function Dashboard() {
  const [summary, setSummary] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resSummary = await axiosInstance.get("/dashboard/summary");
        setSummary(resSummary.data);

        const resMonthly = await axiosInstance.get("/dashboard/monthly");
        setMonthlyData(resMonthly.data);

        const resCategory = await axiosInstance.get("/dashboard/category");
        setCategoryData(resCategory.data);

        const resMovements = await axiosInstance.get("/dashboard/movements");
        setMovements(resMovements.data);
      } catch (err) {
        console.error("โหลดข้อมูล Dashboard ล้มเหลว:", err);
      }
    };

    fetchData();
  }, []);

  // 🔹 Bar Chart (เบิก/ยืม)
  const barOptions = {
    title: { text: "จำนวนการเบิก-ยืม รายเดือน", left: "center" },
    tooltip: { trigger: "axis" },
    legend: { data: ["เบิก", "ยืม"], bottom: 0 },
    grid: { top: 50, left: "3%", right: "3%", bottom: 50, containLabel: true },
    xAxis: { type: "category", data: monthlyData.map((d) => d.month) },
    yAxis: { type: "value" },
    series: [
      {
        name: "เบิก",
        type: "bar",
        data: monthlyData.map((d) => d.withdraw),
        barWidth: 20,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#93c5fd" },
            ],
          },
        },
      },
      {
        name: "ยืม",
        type: "bar",
        data: monthlyData.map((d) => d.borrow),
        barWidth: 20,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#22c55e" },
              { offset: 1, color: "#bbf7d0" },
            ],
          },
        },
      },
    ],
  };

  // 🔹 Pie Chart (หมวดหมู่)
  const pieOptions = {
    tooltip: { trigger: "item", formatter: "{b}<br/>จำนวน: {c} ({d}%)" },
    legend: { bottom: 0, orient: "horizontal" },
    series: [
      {
        type: "pie",
        radius: ["45%", "65%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 10,
          label: {
            show: true,
            fontSize: 14,
            fontWeight: "bold",
            formatter: "{b}\n{c} ({d}%)",
          },
        },
        data: categoryData.map((d, i) => ({
          name: d.name,
          value: d.value,
          itemStyle: {
            color: ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"][
              i % 5
            ],
          },
        })),
      },
    ],
  };

  return (
    <div className={styles.container}>
      {/* 🔹 Top Summary */}
      <div className={styles.topCards}>
        <div className={`${styles.card} ${styles.cardBlue}`}>
          <Package className={styles.icon} />
          <h3>พัสดุทั้งหมด</h3>
          <p>{summary.total_items ?? "-"}</p>
        </div>
        <div className={`${styles.card} ${styles.cardPurple}`}>
          <ClipboardList className={styles.icon} />
          <h3>คำขอเบิก</h3>
          <p>{summary.total_requests ?? "-"}</p>
        </div>
        <div className={`${styles.card} ${styles.cardGreen}`}>
          <RefreshCcw className={styles.icon} />
          <h3>ยืม-คืน</h3>
          <p>{summary.total_borrow ?? "-"}</p>
        </div>
        <div className={`${styles.card} ${styles.cardOrange}`}>
          <AlertTriangle className={styles.icon} />
          <h3>ใกล้หมด / หมดอายุ</h3>
          <p>{summary.expiring ?? "-"}</p>
        </div>
      </div>

      {/* 🔹 Graph Section */}
      <div className={styles.graphSection}>
        <div className={styles.section}>
          <ReactECharts option={barOptions} style={{ height: "350px" }} />
        </div>
        <div className={styles.section}>
          <ReactECharts option={pieOptions} style={{ height: "350px" }} />
        </div>
      </div>

      {/* 🔹 Movements Table */}
      <div className={styles.section}>
        <h2>การเคลื่อนไหวคลังล่าสุด</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ชื่อพัสดุ</th>
              <th>วันที่</th>
              <th>จำนวน</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m, i) => (
              <tr key={i}>
                <td>{m.item_name}</td>
                <td>{new Date(m.move_date).toLocaleString("th-TH")}</td>
                <td>{m.move_qty}</td>
                <td>{m.move_type}</td>
                <td>{m.move_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
