"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSave, FaArrowLeft } from "react-icons/fa";
import { PackageCheck } from "lucide-react";
import Swal from "sweetalert2";
import styles from "./page.module.css";

/* ───────── Badge ───────── */
const StatusBadge = ({ status }) => {
  const t = String(status || "").toLowerCase();
  let badgeStyle = styles.pending;
  if (t === "completed") badgeStyle = styles.completed;
  else if (t === "partial") badgeStyle = styles.partial;
  else if (t === "cancelled" || t === "canceled") badgeStyle = styles.canceled;

  const label =
    t === "completed" ? "เสร็จสิ้น" :
    t === "partial"   ? "รอรับเพิ่ม" :
    t === "pending"   ? "รอดำเนินการ" :
    t === "cancelled" || t === "canceled" ? "ยกเลิก" :
    status ? status.charAt(0).toUpperCase() + status.slice(1) : "ไม่ทราบสถานะ";

  return <span className={`${styles.stBadge} ${badgeStyle}`}>{label}</span>;
};

/* ───────── Utils ───────── */
const formatThaiDate = (d) => {
  try {
    return d
      ? new Date(d).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
      : "-";
  } catch {
    return "-";
  }
};

export default function GoodsReceiptDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [grData, setGrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extraReceive, setExtraReceive] = useState({});

  const fetchGR = async () => {
    try {
      setLoading(true);
      const res = await purchasingAxios.get(`/gr/${id}`);
      const data = res.data || null;
      setGrData(data);

      // เตรียมช่อง "รับเพิ่ม" เฉพาะรายการที่ยังเหลือ
      const initExtra = {};
      if (Array.isArray(data?.items)) {
        data.items.forEach((it) => {
          const remain = Number(it.qty_ordered ?? 0) - Number(it.qty_received ?? 0);
          if (remain > 0) initExtra[it.gr_item_id] = 0;
        });
      }
      setExtraReceive(initExtra);
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err?.response?.data?.message || err?.message || "ไม่สามารถโหลดข้อมูลได้",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleExtraChange = (grItemId, value) => {
    const v = Number(value);
    setExtraReceive((prev) => ({ ...prev, [grItemId]: Number.isFinite(v) ? v : 0 }));
  };

  const handleSaveExtra = async () => {
    try {
      if (!grData?.items?.length) return;

      const itemsToUpdate = [];
      for (const [grItemId, qty] of Object.entries(extraReceive)) {
        const q = Number(qty);
        if (q > 0) {
          const item = grData.items.find((it) => String(it.gr_item_id) === String(grItemId));
          if (!item) continue;
          const ordered = Number(item.qty_ordered ?? 0);
          const received = Number(item.qty_received ?? 0);
          const remain = ordered - received;

          if (q > remain) {
            await Swal.fire({
              title: "แจ้งเตือน",
              text: `รายการ ${item.item_name} รับเกินจำนวนที่เหลือ (${remain})`,
              icon: "warning",
              confirmButtonText: "ตกลง",
              customClass: { confirmButton: styles.swalButton },
            });
            return;
          }

          itemsToUpdate.push({
            gr_item_id: Number(grItemId),
            qty_received: q,
          });
        }
      }

      if (itemsToUpdate.length === 0) {
        await Swal.fire({
          title: "แจ้งเตือน",
          text: "กรุณากรอกจำนวนที่รับเพิ่มอย่างน้อย 1 รายการ",
          icon: "warning",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
        return;
      }

      await purchasingAxios.post(`/gr/${id}/receive-more`, { items: itemsToUpdate });

      Swal.fire({
        title: "สำเร็จ",
        text: "บันทึกการรับเพิ่มเรียบร้อย",
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      }).then(() => fetchGR());
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err?.response?.data?.message || err?.message || "ไม่สามารถบันทึกได้",
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  const sortedItems = useMemo(() => {
    if (!Array.isArray(grData?.items)) return [];
    // เรียงชื่อไทยสวยๆ
    const collator = new Intl.Collator("th-TH");
    return [...grData.items].sort((a, b) => collator.compare(a?.item_name || "", b?.item_name || ""));
  }, [grData]);

  if (loading) {
    return (
      <div className={styles.mainHome}>
        <div className={styles.infoContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} role="status" aria-live="polite" aria-label="กำลังโหลด" />
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
          <div className={styles.footer}>
            <button
              className={`${styles.ghostBtn} ${styles.actionButton}`}
              onClick={() => router.push("/purchasing/goodsReceipt")}
            >
              <FaArrowLeft size={18} /> กลับ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
             รายละเอียดการรับสินค้า
            </h1>
            {/* <p className={styles.subtitle}>เลขที่ GR: <span className={styles.mono}>{grData.gr_no}</span></p> */}
          </div>
        </div>

        {/* Meta */}
        <section className={styles.detail}>
          <h2 className={styles.sectionTitle}>รายละเอียด GR: {grData.gr_no}</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="gr-no-label">เลขที่ GR:</span>
              <span className={styles.mono} aria-describedby="gr-no-label">{grData.gr_no}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="po-no-label">เลขที่ PO:</span>
              <span className={styles.mono} aria-describedby="po-no-label">{grData.po_no || "-"}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel} id="date-label">วันที่รับ:</span>
              <span aria-describedby="date-label">{formatThaiDate(grData.gr_date)}</span>
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

        {/* Table */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>📦 รายการสินค้า</h2>

          <div className={styles.tableSection}>
            {/* Header */}
            <div
              className={`${styles.tableGrid} ${styles.tableHeader}`}
              role="row"
              aria-label="ส่วนหัวตารางรายการสินค้า"
            >
              <div className={styles.headerItem}>สินค้า</div>
              <div className={styles.headerItem}>จำนวนสั่งซื้อ</div>
              <div className={styles.headerItem}>จำนวนที่รับแล้ว</div>
              <div className={styles.headerItem}>Lot</div>
              <div className={styles.headerItem}>วันผลิต</div>
              <div className={styles.headerItem}>วันหมดอายุ</div>
              <div className={styles.headerItem}>สถานะ</div>
              <div className={styles.headerItem}>รับเพิ่ม</div>
            </div>

            {/* Body */}
            <div className={styles.inventory} role="rowgroup" aria-label="ตารางรายการสินค้า">
              {sortedItems.length > 0 ? (
                sortedItems.map((item) => {
                  const ordered  = Number(item.qty_ordered ?? 0);
                  const received = Number(item.qty_received ?? 0);
                  const remain   = ordered - received;

                  return (
                    <div key={item.gr_item_id} className={`${styles.tableGrid} ${styles.tableRow}`} role="row">
                      <div className={`${styles.tableCell} ${styles.textWrap}`} title={item.item_name || "-"}>
                        {item.item_name || "-"}
                      </div>

                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {ordered} {item.item_unit || "-"}
                      </div>

                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {received}
                      </div>

                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {item.lot_no || "-"}
                      </div>

                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {formatThaiDate(item.mfg_date)}
                      </div>

                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {formatThaiDate(item.exp_date)}
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
                              value={extraReceive[item.gr_item_id] ?? ""}
                              onChange={(e) => handleExtraChange(item.gr_item_id, e.target.value)}
                              className={styles.input}
                              placeholder="0"
                              aria-label={`รับเพิ่มสำหรับ ${item.item_name}`}
                            />
                            <small className={styles.remainText}>เหลือรับได้อีก {remain}</small>
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

        {/* Footer */}
        <footer className={styles.footer}>
          {Object.values(extraReceive).some((v) => Number(v) > 0) && (
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
}
