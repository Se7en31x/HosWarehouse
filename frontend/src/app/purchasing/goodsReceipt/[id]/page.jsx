"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import { PackageCheck } from "lucide-react";
import Swal from "sweetalert2";
import styles from "./page.module.css";

const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  if (status?.toLowerCase() === "completed") badgeStyle = styles.completed;
  else if (status?.toLowerCase() === "partial") badgeStyle = styles.partial;
  else if (status?.toLowerCase() === "cancelled") badgeStyle = styles.canceled;
  return (
    <span className={`${styles.stBadge} ${badgeStyle}`}>
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

  const fetchGR = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/gr/${id}`);
      setGrData(res.data);

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

  const handleExtraChange = (grItemId, value) => {
    setExtraReceive({
      ...extraReceive,
      [grItemId]: parseInt(value) || 0,
    });
  };

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
        fetchGR();
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

  const sortedItems = useMemo(() => {
    if (!grData?.items) return [];
    return [...grData.items].sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [grData]);

  if (loading) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}>กำลังโหลด...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!grData) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.noDataMessage}>ไม่พบข้อมูล GR</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <PackageCheck size={28} /> รายละเอียดการรับสินค้า
            </h1>
            <p className={styles.subtitle}>เลขที่ GR: {grData.gr_no}</p>
          </div>
          <button
            className={`${styles.ghostBtn} ${styles.actionButton}`}
            onClick={() => router.push("/purchasing/goodsReceipt")}
            aria-label="กลับไปยังรายการรับสินค้า"
          >
            <FaArrowLeft size={18} /> กลับ
          </button>
        </div>

        <section className={styles.detail}>
          <h2 className={styles.sectionTitle}>รายละเอียด GR: {grData.gr_no}</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="gr-no-label">เลขที่ GR:</span>
              <span className={styles.mono} aria-describedby="gr-no-label">{grData.gr_no}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="po-no-label">เลขที่ PO:</span>
              <span className={styles.mono} aria-describedby="po-no-label">{grData.po_no}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="date-label">วันที่รับ:</span>
              <span aria-describedby="date-label">
                {new Date(grData.gr_date).toLocaleDateString("th-TH")}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="supplier-label">ซัพพลายเออร์:</span>
              <span className={styles.textWrap} aria-describedby="supplier-label">
                {grData.supplier_name || "-"}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="status-label">สถานะ:</span>
              <StatusBadge status={grData.status} aria-describedby="status-label" />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📦 รายการสินค้า</h2>
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`} role="region" aria-label="ตารางรายการสินค้า">
              <div className={styles.headerItem}>สินค้า</div>
              <div className={styles.headerItem}>จำนวนสั่งซื้อ</div>
              <div className={styles.headerItem}>จำนวนที่รับแล้ว</div>
              <div className={styles.headerItem}>Lot</div>
              <div className={styles.headerItem}>วันผลิต</div>
              <div className={styles.headerItem}>วันหมดอายุ</div>
              <div className={styles.headerItem}>สถานะ</div>
              <div className={styles.headerItem}>รับเพิ่ม</div>
            </div>
            <div className={styles.inventory}>
              {sortedItems.length > 0 ? (
                sortedItems.map((item) => {
                  const remain = item.qty_ordered - item.qty_received;
                  return (
                    <div
                      key={item.gr_item_id}
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                    >
                      <div className={`${styles.tableCell} ${styles.textWrap}`}>
                        {item.item_name || "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.qty_ordered} {item.item_unit || "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.qty_received}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.lot_no || "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.mfg_date
                          ? new Date(item.mfg_date).toLocaleDateString("th-TH")
                          : "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.exp_date
                          ? new Date(item.exp_date).toLocaleDateString("th-TH")
                          : "-"}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <StatusBadge status={item.status} />
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
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
                              aria-label={`รับเพิ่มสำหรับ ${item.item_name}`}
                            />
                            <small className={styles.remainText}>
                              เหลือรับได้อีก {remain}
                            </small>
                          </div>
                        ) : (
                          "-"
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.noDataMessage}>ไม่มีรายการสินค้า</div>
              )}
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          {Object.values(extraReceive).some((v) => v > 0) && (
            <button
              className={`${styles.primaryButton} ${styles.actionButton}`}
              onClick={handleSaveExtra}
              aria-label="บันทึกการรับเพิ่ม"
            >
              <FaSave size={18} /> บันทึกการรับเพิ่ม
            </button>
          )}
          <button
            className={`${styles.ghostBtn} ${styles.actionButton}`}
            onClick={() => router.push("/purchasing/goodsReceipt")}
            aria-label="กลับไปยังรายการรับสินค้า"
          >
            <FaArrowLeft size={18} /> กลับ
          </button>
        </footer>
      </div>
    </div>
  );
};

export default GoodsReceiptDetailPage;