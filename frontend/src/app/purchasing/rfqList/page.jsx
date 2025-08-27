"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import exportPDF from "@/app/components/pdf/PDFExporter";

const RFQListPage = () => {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRFQ, setSelectedRFQ] = useState(null);

  useEffect(() => {
    const fetchRFQs = async () => {
      try {
        const res = await axiosInstance.get("/rfq");
        setRfqs(res.data);
      } catch (err) {
        Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
      }
    };
    fetchRFQs();
  }, []);

  // ✅ ออกใบ PDF
  const handleExportPDF = async (rfq) => {
    const items = rfq.items || [];
    await exportPDF({
      filename: `ใบขอราคา_${rfq.rfq_no}.pdf`,
      title: "ใบขอราคา (Request for Quotation)",
      meta: {
        headerBlock: [
          ["เลขที่เอกสาร", rfq.rfq_no],
          ["วันที่ออก", new Date(rfq.created_at).toLocaleDateString("th-TH")],
        ],
        leftBlock: [
          ["ผู้จัดทำ", rfq.user_fname + " " + rfq.user_lname],
          ["หน่วยงาน", "งานคลังพัสดุ"],
        ],
        rightBlock: [
          ["อีเมล", "purchasing@hospital.com"],
          ["เบอร์โทร", "02-123-4567"],
        ],
        footerBlock: [
          ["เงื่อนไขการชำระเงิน", "ชำระภายใน 30 วัน"],
          ["การจัดส่ง", "จัดส่งฟรีภายใน 7 วันทำการ"],
        ],
        sections: {
          leftTitle: "ข้อมูลผู้จัดทำ",
          rightTitle: "ข้อมูลการติดต่อ",
          footerTitle: "เงื่อนไขใบขอราคา",
        },
        layout: { tableColWidths: [15, 70, 20, 20, 65] },
      },
      columns: ["ลำดับ", "ชื่อสินค้า", "จำนวน", "หน่วย", "คุณลักษณะ"],
      rows: items.map((item, idx) => [
        idx + 1,
        item.item_name || "-",
        item.qty || 0,
        item.unit || "-",
        item.spec || "-",
      ]),
      signatures: { roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"] },
      options: {
        brand: {
          name: "โรงพยาบาลตัวอย่าง",
          logoUrl: "/font/Sarabun/logo.png",
          bandColor: [0, 141, 218],
          headerBand: true,
        },
        watermark: { text: "RFQ", angle: 45 },
      },
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>รายการใบขอราคา (RFQ)</h1>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>RFQ No</th>
              <th>ผู้จัดทำ</th>
              <th>วันที่สร้าง</th>
              <th>สถานะ</th>
              <th>การกระทำ</th>
            </tr>
          </thead>
          <tbody>
            {rfqs.map((rfq) => (
              <tr key={rfq.rfq_id}>
                <td>{rfq.rfq_no}</td>
                <td>{rfq.user_fname} {rfq.user_lname}</td>
                <td>{new Date(rfq.created_at).toLocaleDateString("th-TH")}</td>
                <td>{rfq.status || "รอดำเนินการ"}</td>
                <td>
                  <button
                    className={styles.button}
                    onClick={() => setSelectedRFQ(rfq)}
                  >
                    ดูรายละเอียด
                  </button>
                  <button
                    className={styles.button}
                    onClick={() => handleExportPDF(rfq)}
                  >
                    ออกใบ PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedRFQ && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>รายละเอียด RFQ: {selectedRFQ.rfq_no}</h2>
            <p>ผู้จัดทำ: {selectedRFQ.user_fname} {selectedRFQ.user_lname}</p>
            <p>วันที่: {new Date(selectedRFQ.created_at).toLocaleDateString("th-TH")}</p>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ชื่อสินค้า</th>
                  <th>จำนวน</th>
                  <th>หน่วย</th>
                  <th>คุณลักษณะ</th>
                </tr>
              </thead>
              <tbody>
                {selectedRFQ.items?.map((item) => (
                  <tr key={item.rfq_item_id}>
                    <td>{item.item_name}</td>
                    <td>{item.qty}</td>
                    <td>{item.unit}</td>
                    <td>{item.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.modalFooter}>
              <button
                className={styles.button}
                onClick={() => handleExportPDF(selectedRFQ)}
              >
                ⬇️ ดาวน์โหลด PDF
              </button>
              <button
                className={styles.closeButton}
                onClick={() => setSelectedRFQ(null)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RFQListPage;
