"use client";

import { useState } from "react";
import styles from "./page.module.css"; // ✅ ใช้ styles.xxx

const initialRequests = [
  { id: "001", name: "ยาแก้ปวด", quantity: 100, unit: "ขวด", category: "ยา", date: "2025-08-25" },
  { id: "002", name: "ผ้าก๊อซ", quantity: 50, unit: "ม้วน", category: "เวชภัณฑ์", date: "2025-08-25" },
  { id: "003", name: "เครื่องวัดความดัน", quantity: 5, unit: "ชิ้น", category: "อุปกรณ์ทางการแพทย์", date: "2025-08-25" },
  { id: "004", name: "โต๊ะทำงาน", quantity: 2, unit: "ชุด", category: "ครุภัณฑ์", date: "2025-08-25" },
  { id: "005", name: "ปากกา", quantity: 200, unit: "ด้าม", category: "ของใช้ทั่วไป", date: "2025-08-25" },
];

const categories = ["ทั้งหมด", "ยา", "เวชภัณฑ์", "ครุภัณฑ์", "อุปกรณ์ทางการแพทย์", "ของใช้ทั่วไป"];

const PurchaseRequestPage = () => {
  const [requests, setRequests] = useState(initialRequests.map(item => ({ ...item, checked: false })));
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [showModal, setShowModal] = useState(false);
  const [specs, setSpecs] = useState({});

  const handleFilterChange = (e) => setFilterCategory(e.target.value);

  const handleCheckboxChange = (id) => {
    setRequests(requests.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleSelectAll = () => setRequests(requests.map(item => ({ ...item, checked: true })));

  const handleClearSelection = () => setRequests(requests.map(item => ({ ...item, checked: false })));

  const handleSpecChange = (id, value) => setSpecs({ ...specs, [id]: value });

  const handleGenerateQuotation = () => {
    const selectedItems = requests.filter(item => item.checked);
    if (selectedItems.length === 0) {
      alert("กรุณาเลือกอย่างน้อยหนึ่งรายการ");
      return;
    }
    setShowModal(true);
  };

  const handleSubmitQuotation = () => {
    console.log("ใบขอราคา:", { items: requests.filter(item => item.checked), specs });
    setShowModal(false);
    setRequests(requests.map(item => item.checked ? { ...item, checked: false } : item));
    setSpecs({});
  };

  const filteredRequests = filterCategory === "ทั้งหมด"
    ? requests
    : requests.filter(item => item.category === filterCategory);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ระบบการสั่งซื้อ - รายการขอซื้อจากคลังสินค้า</h1>

      <div className={styles.filter}>
        <label>ประเภท: </label>
        <select value={filterCategory} onChange={handleFilterChange}>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>เลือก</th>
              <th className={styles.th}>ID</th>
              <th className={styles.th}>ชื่อสินค้า</th>
              <th className={styles.th}>จำนวน</th>
              <th className={styles.th}>หน่วย</th>
              <th className={styles.th}>ประเภท</th>
              <th className={styles.th}>วันที่ขอ</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(item => (
              <tr key={item.id}>
                <td className={styles.td}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={item.checked}
                    onChange={() => handleCheckboxChange(item.id)}
                  />
                </td>
                <td className={styles.td}>{item.id}</td>
                <td className={styles.td}>{item.name}</td>
                <td className={styles.td}>{item.quantity}</td>
                <td className={styles.td}>{item.unit}</td>
                <td className={styles.td}>{item.category}</td>
                <td className={styles.td}>{item.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.buttonGroup}>
        <button className={styles.button} onClick={handleSelectAll}>เลือกทั้งหมด</button>
        <button className={styles.button} onClick={handleClearSelection}>ล้างการเลือก</button>
        <button
          className={`${styles.button} ${!requests.some(item => item.checked) ? styles.buttonDisabled : ""}`}
          onClick={handleGenerateQuotation}
          disabled={!requests.some(item => item.checked)}
        >
          ออกใบขอราคา
        </button>
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>ใบขอราคา - เลขที่เอกสาร: PR-2025-001</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>ID</th>
                  <th className={styles.th}>ชื่อสินค้า</th>
                  <th className={styles.th}>จำนวน</th>
                  <th className={styles.th}>หน่วย</th>
                  <th className={styles.th}>ประเภท</th>
                  <th className={styles.th}>สเปคสินค้า</th>
                </tr>
              </thead>
              <tbody>
                {requests.filter(item => item.checked).map(item => (
                  <tr key={item.id}>
                    <td className={styles.td}>{item.id}</td>
                    <td className={styles.td}>{item.name}</td>
                    <td className={styles.td}>{item.quantity}</td>
                    <td className={styles.td}>{item.unit}</td>
                    <td className={styles.td}>{item.category}</td>
                    <td className={styles.td}>
                      <textarea
                        className={styles.textarea}
                        value={specs[item.id] || ""}
                        onChange={(e) => handleSpecChange(item.id, e.target.value)}
                        placeholder="กรอกสเปค (เช่น ขนาด 500mg, ยี่ห้อ XYZ)"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.modalFooter}>
              <label>ผู้จัดทำ: <input type="text" defaultValue="ฝ่ายจัดซื้อ" /></label>
              <label>วันที่: <input type="date" defaultValue="2025-08-26" /></label>
              <label>หมายเหตุ: <textarea placeholder="หมายเหตุเพิ่มเติม" /></label>
              <div>
                <button className={styles.button} onClick={handleSubmitQuotation}>บันทึกและส่ง</button>
                <button className={styles.button} onClick={() => setShowModal(false)}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequestPage;
