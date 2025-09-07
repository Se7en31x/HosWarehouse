"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { FaSave, FaTimes } from "react-icons/fa";
import { PackageCheck } from "lucide-react";
import Swal from "sweetalert2";
import styles from "./page.module.css";

const GoodsReceiptCreatePage = () => {
  const router = useRouter();
  const [poList, setPoList] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receiptData, setReceiptData] = useState({
    delivery_no: "",
    invoice_no: "",
    receipt_date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [receivedItems, setReceivedItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        setLoading(true);
        const res = await purchasingAxios.get("/po?status=รอดำเนินการ");
        setPoList(res.data);
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
    fetchPOs();
  }, []);

  const handleSelectPO = async (id) => {
    if (!id) {
      setSelectedPO(null);
      setReceivedItems({});
      setReceiptData({
        delivery_no: "",
        invoice_no: "",
        receipt_date: new Date().toISOString().split("T")[0],
        note: "",
      });
      return;
    }
    try {
      const res = await purchasingAxios.get(`/po/${id}`);
      setSelectedPO(res.data);
      const init = {};
      res.data.items.forEach((item) => {
        init[item.po_item_id] = { qty_received: 0, lot: "", mfg: "", expiry: "" };
      });
      setReceivedItems(init);
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: "โหลด PO ไม่สำเร็จ",
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    }
  };

  const handleItemChange = (id, field, value) => {
    setReceivedItems({
      ...receivedItems,
      [id]: { ...receivedItems[id], [field]: value },
    });
  };

  const handleReceiptChange = (field, value) => {
    setReceiptData({ ...receiptData, [field]: value });
  };

  const validateBeforeSave = async () => {
    if (!selectedPO) {
      await Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือก PO ก่อน",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return false;
    }

    let hasQty = false;

    for (const item of selectedPO.items) {
      const val = receivedItems[item.po_item_id];
      const qty = parseInt(val?.qty_received) || 0;

      if (qty > 0) {
        hasQty = true;

        if (qty > item.quantity) {
          await Swal.fire({
            title: "แจ้งเตือน",
            text: `ห้ามรับเกินจำนวนสั่งซื้อ (${item.quantity} ${item.unit}) สำหรับ ${item.item_name}`,
            icon: "warning",
            confirmButtonText: "ตกลง",
            customClass: { confirmButton: styles.swalButton },
          });
          return false;
        }

        if (["medicine", "medsup"].includes(item.item_category)) {
          if (!val.mfg) {
            await Swal.fire({
              title: "ข้อมูลไม่ครบถ้วน",
              text: `กรุณากรอกวันผลิตของ ${item.item_name}`,
              icon: "warning",
              confirmButtonText: "ตกลง",
              customClass: { confirmButton: styles.swalButton },
            });
            return false;
          }
          if (!val.expiry) {
            await Swal.fire({
              title: "ข้อมูลไม่ครบถ้วน",
              text: `กรุณากรอกวันหมดอายุของ ${item.item_name}`,
              icon: "warning",
              confirmButtonText: "ตกลง",
              customClass: { confirmButton: styles.swalButton },
            });
            return false;
          }
        }
      }
    }

    if (!hasQty) {
      await Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณากรอกจำนวนที่รับอย่างน้อย 1 รายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return false;
    }

    return true;
  };

  const handleSaveReceipt = async () => {
    if (saving) return;
    if (!(await validateBeforeSave())) return;

    setSaving(true);

    try {
      const payload = {
        po_id: selectedPO.po_id,
        delivery_no: receiptData.delivery_no,
        invoice_no: receiptData.invoice_no,
        receipt_date: receiptData.receipt_date,
        note: receiptData.note,
        items: selectedPO.items
          .filter((item) => (parseInt(receivedItems[item.po_item_id]?.qty_received) || 0) > 0)
          .map((item) => ({
            po_item_id: item.po_item_id,
            item_id: item.item_id,
            qty_received: parseInt(receivedItems[item.po_item_id]?.qty_received) || 0,
            lot_no: receivedItems[item.po_item_id]?.lot || "",
            mfg_date: receivedItems[item.po_item_id]?.mfg || null,
            expiry_date: receivedItems[item.po_item_id]?.expiry || null,
            unit: item.unit || null,
          })),
      };

      const res = await purchasingAxios.post("/gr", payload);
      Swal.fire({
        title: "สำเร็จ",
        text: `บันทึกรับสินค้า GR เลขที่ ${res.data.gr_no}`,
        icon: "success",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      }).then(() => {
        router.push("/purchasing/goodsReceipt");
      });
    } catch (err) {
      Swal.fire({
        title: "ผิดพลาด",
        text: err.response?.data?.message || err.message,
        icon: "error",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/purchasing/goodsReceipt");
  };

  const sortedItems = useMemo(() => {
    if (!selectedPO?.items) return [];
    return [...selectedPO.items].sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [selectedPO]);

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

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              <PackageCheck size={28} /> บันทึกรับสินค้าใหม่
            </h1>
            <p className={styles.subtitle}>สร้างรายการรับสินค้าจากใบสั่งซื้อ (PO)</p>
          </div>
          <button
            className={`${styles.ghostBtn} ${styles.actionButton}`}
            onClick={handleCancel}
            aria-label="ยกเลิกและกลับไปยังรายการรับสินค้า"
          >
            <FaTimes size={18} /> ยกเลิก
          </button>
        </div>

        <section className={styles.formSection}>
          <div className={styles.selector}>
            <div className={styles.formGroup}>
              <label className={styles.label} id="po-select-label">เลือก PO:</label>
              <select
                value={selectedPO?.po_id || ""}
                onChange={(e) => handleSelectPO(e.target.value)}
                className={styles.input}
                aria-label="เลือกใบสั่งซื้อ"
                aria-describedby="po-select-label"
              >
                <option value="">-- กรุณาเลือก --</option>
                {poList.map((po) => (
                  <option key={po.po_id} value={po.po_id}>
                    {po.po_no} - {po.supplier_name}
                  </option>
                ))}
              </select>
            </div>
            {selectedPO && (
              <button
                className={`${styles.dangerButton} ${styles.actionButton}`}
                onClick={() => handleSelectPO("")}
                aria-label="ปิดฟอร์มใบสั่งซื้อ"
              >
                <FaTimes size={18} /> ปิดฟอร์ม
              </button>
            )}
          </div>

          {selectedPO && (
            <div className={styles.detail}>
              <h2 className={styles.sectionTitle}>
                รายละเอียด PO: <span className={styles.mono}>{selectedPO.po_no}</span>
              </h2>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} id="delivery-no-label">เลขที่ใบส่งของ</label>
                  <input
                    type="text"
                    placeholder="ระบุเลขที่ใบส่งของ"
                    value={receiptData.delivery_no}
                    onChange={(e) => handleReceiptChange("delivery_no", e.target.value)}
                    className={styles.input}
                    aria-describedby="delivery-no-label"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} id="invoice-no-label">เลขที่ใบกำกับภาษี</label>
                  <input
                    type="text"
                    placeholder="ระบุเลขที่ใบกำกับภาษี"
                    value={receiptData.invoice_no}
                    onChange={(e) => handleReceiptChange("invoice_no", e.target.value)}
                    className={styles.input}
                    aria-describedby="invoice-no-label"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} id="receipt-date-label">วันที่รับ</label>
                  <input
                    type="date"
                    value={receiptData.receipt_date}
                    onChange={(e) => handleReceiptChange("receipt_date", e.target.value)}
                    className={styles.input}
                    aria-describedby="receipt-date-label"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label} id="note-label">หมายเหตุ</label>
                  <textarea
                    placeholder="ระบุหมายเหตุเพิ่มเติม..."
                    value={receiptData.note}
                    onChange={(e) => handleReceiptChange("note", e.target.value)}
                    className={styles.textarea}
                    aria-describedby="note-label"
                  />
                </div>
              </div>

              <div className={styles.tableSection}>
                <h3 className={styles.sectionTitle}>📦 รายการสินค้า</h3>
                <div
                  className={`${styles.tableGrid} ${styles.tableHeader}`}
                  role="region"
                  aria-label="ตารางรายการสินค้า"
                >
                  <div className={styles.headerItem}>สินค้า</div>
                  <div className={styles.headerItem}>จำนวนสั่งซื้อ</div>
                  <div className={styles.headerItem}>จำนวนที่รับจริง</div>
                  <div className={styles.headerItem}>Lot</div>
                  <div className={styles.headerItem}>วันผลิต</div>
                  <div className={styles.headerItem}>วันหมดอายุ</div>
                </div>
                <div className={styles.inventory}>
                  {sortedItems.length > 0 ? (
                    sortedItems.map((item) => (
                      <div
                        key={item.po_item_id}
                        className={`${styles.tableGrid} ${styles.tableRow}`}
                      >
                        <div className={`${styles.tableCell} ${styles.textWrap}`} title={item.item_name || "-"}>
                          {item.item_name || "-"}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          {item.quantity} {item.unit || "-"}
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={receivedItems[item.po_item_id]?.qty_received || ""}
                            onChange={(e) =>
                              handleItemChange(item.po_item_id, "qty_received", e.target.value)
                            }
                            className={styles.inputItem}
                            placeholder="0"
                            aria-label={`จำนวนที่รับจริงสำหรับ ${item.item_name}`}
                          />
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          <input
                            type="text"
                            placeholder="Lot No."
                            value={receivedItems[item.po_item_id]?.lot || ""}
                            onChange={(e) => handleItemChange(item.po_item_id, "lot", e.target.value)}
                            className={styles.input}
                            aria-label={`Lot No. สำหรับ ${item.item_name}`}
                          />
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          <input
                            type="date"
                            value={receivedItems[item.po_item_id]?.mfg || ""}
                            onChange={(e) => handleItemChange(item.po_item_id, "mfg", e.target.value)}
                            className={styles.input}
                            aria-label={`วันผลิตสำหรับ ${item.item_name}`}
                          />
                        </div>
                        <div className={`${styles.tableCell} ${styles.centerCell}`}>
                          <input
                            type="date"
                            value={receivedItems[item.po_item_id]?.expiry || ""}
                            onChange={(e) =>
                              handleItemChange(item.po_item_id, "expiry", e.target.value)
                            }
                            className={styles.input}
                            aria-label={`วันหมดอายุสำหรับ ${item.item_name}`}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noDataMessage}>ไม่มีรายการสินค้า</div>
                  )}
                </div>
              </div>

              <div className={styles.footer}>
                <button
                  className={`${styles.primaryButton} ${styles.actionButton}`}
                  onClick={handleSaveReceipt}
                  disabled={saving}
                  aria-label="บันทึกรับสินค้า"
                >
                  <FaSave size={18} /> {saving ? "กำลังบันทึก..." : "บันทึกรับสินค้า"}
                </button>
                <button
                  className={`${styles.dangerButton} ${styles.actionButton}`}
                  onClick={handleCancel}
                  aria-label="ยกเลิกและกลับไปยังรายการรับสินค้า"
                >
                  <FaTimes size={18} /> ยกเลิก
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default GoodsReceiptCreatePage;