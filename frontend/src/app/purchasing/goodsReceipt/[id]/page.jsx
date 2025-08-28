"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import Swal from "sweetalert2";
import styles from "./page.module.css";

// Component สำหรับแสดง Badge สถานะ
const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  if (status?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (status?.toLowerCase() === "partial") badgeStyle = styles.partial;
  else if (status?.toLowerCase() === "cancelled") badgeStyle = styles.canceled;
  return (
    <span className={`${styles.badge} ${badgeStyle}`}>
      {(() => {
        switch (status?.toLowerCase()) {
          case "completed":
            return "เสร็จสิ้น";
          case "partial":
            return "รอรับเพิ่ม";
          case "pending":
            return "รอดำเนินการ";
          case "cancelled":
            return "ยกเลิก";
          default:
            return status ? status.charAt(0).toUpperCase() + status.slice(1) : "ไม่ทราบสถานะ";
        }
      })()}
    </span>
  );
};

const GoodsReceiptDetailPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [grData, setGrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extraReceive, setExtraReceive] = useState({});

  // Fetch GR data
  const fetchGR = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/gr/${id}`);
      setGrData(res.data);

      // Initialize extra receive state for incomplete items
      const initExtra = {};
      res.data.items.forEach((it) => {
        if (it.qty_received < it.qty_ordered) {
          initExtra[it.gr_item_id] = 0;
        }
      });
      setExtraReceive(initExtra);
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || err.message,
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchGR();
  }, [id]);

  // Handle extra receive input
  const handleExtraChange = (grItemId, value) => {
    setExtraReceive({
      ...extraReceive,
      [grItemId]: parseInt(value) || 0,
    });
  };

  // Save extra received items
  const handleSaveExtra = async () => {
    try {
      const itemsToUpdate = [];

      for (const [grItemId, qty] of Object.entries(extraReceive)) {
        if (qty > 0) {
          const item = grData.items.find((it) => it.gr_item_id == grItemId);
          const remain = item.qty_ordered - item.qty_received;

          if (qty > remain) {
            Swal.fire({
              title: "แจ้งเตือน",
              text: `รายการ ${item.item_name} รับเกินจำนวนที่เหลือ (${remain})`,
              icon: "warning",
              confirmButtonText: "ตกลง",
              customClass: { confirmButton: styles.swalButton },
            });
            return;
          }

          itemsToUpdate.push({
            gr_item_id: parseInt(grItemId),
            qty_received: qty,
          });
        }
      }

      if (itemsToUpdate.length === 0) {
        Swal.fire({
          title: "แจ้งเตือน",
          text: "กรุณากรอกจำนวนที่รับเพิ่มอย่างน้อย 1 รายการ",
          icon: "warning",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }

      await axiosInstance.post(`/gr/${id}/receive-more`, { items: itemsToUpdate });

      Swal.fire({
        title: "สำเร็จ",
        text: "บันทึกการรับเพิ่มเรียบร้อย",
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      }).then(() => {
        fetchGR(); // Reload data
      });
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || err.message,
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  if (loading) return <div className={styles.empty}>กำลังโหลด...</div>;
  if (!grData) return <div className={styles.empty}>ไม่พบข้อมูล GR</div>;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>รายละเอียดการรับสินค้า (GR)</h1>
        <p className={styles.subtitle}>เลขที่ GR: {grData.gr_no}</p>
      </header>

      <section className={styles.detailCard}>
        <div className={styles.detail}>
          <p><strong>เลขที่ GR:</strong> <span className={styles.mono}>{grData.gr_no}</span></p>
          <p><strong>เลขที่ PO:</strong> <span className={styles.mono}>{grData.po_no}</span></p>
          <p><strong>วันที่รับ:</strong> {new Date(grData.gr_date).toLocaleDateString("th-TH")}</p>
          <p><strong>ซัพพลายเออร์:</strong> {grData.supplier_name || "-"}</p>
          <p><strong>สถานะ:</strong> <StatusBadge status={grData.status} /></p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>รายการสินค้า</h2>
        <div className={styles.tableCard}>
          <div className={styles.tableWrap} role="region" aria-label="ตารางรายการสินค้า">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>สินค้า</th>
                  <th>จำนวนสั่งซื้อ</th>
                  <th>จำนวนที่รับแล้ว</th>
                  <th>Lot</th>
                  <th>วันผลิต</th>
                  <th>วันหมดอายุ</th>
                  <th>สถานะ</th>
                  <th>รับเพิ่ม</th>
                </tr>
              </thead>
              <tbody>
                {grData.items.map((item) => {
                  const remain = item.qty_ordered - item.qty_received;
                  return (
                    <tr key={item.gr_item_id}>
                      <td>{item.item_name || "-"}</td>
                      <td>{item.qty_ordered} {item.item_unit || "-"}</td>
                      <td>{item.qty_received}</td>
                      <td>{item.lot_no || "-"}</td>
                      <td>
                        {item.mfg_date
                          ? new Date(item.mfg_date).toLocaleDateString("th-TH")
                          : "-"}
                      </td>
                      <td>
                        {item.exp_date
                          ? new Date(item.exp_date).toLocaleDateString("th-TH")
                          : "-"}
                      </td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        {remain > 0 ? (
                          <div className={styles.receiveInput}>
                            <input
                              type="number"
                              min="0"
                              max={remain}
                              value={extraReceive[item.gr_item_id] || ""}
                              onChange={(e) => handleExtraChange(item.gr_item_id, e.target.value)}
                              className={styles.input}
                              placeholder="0"
                            />
                            <small className={styles.remainText}>
                              เหลือรับได้อีก {remain}
                            </small>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        {Object.values(extraReceive).some((v) => v > 0) && (
          <button className={styles.primaryButton} onClick={handleSaveExtra}>
            <FaSave className={styles.buttonIcon} /> บันทึกการรับเพิ่ม
          </button>
        )}
        <button
          className={styles.secondaryButton}
          onClick={() => router.push("/purchasing/goodsReceipt")}
        >
          <FaArrowLeft className={styles.buttonIcon} /> กลับ
        </button>
      </footer>
    </main>
  );
};

export default GoodsReceiptDetailPage;
