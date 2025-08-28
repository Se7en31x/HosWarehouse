// src/app/purchasing/goodsReceipt/create/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSave, FaTimes } from "react-icons/fa";
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

  // Load pending POs
  useEffect(() => {
    const fetchPOs = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/po?status=รอดำเนินการ");
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

  // Select PO
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
      const res = await axiosInstance.get(`/po/${id}`);
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

  // Update received item fields
  const handleItemChange = (id, field, value) => {
    setReceivedItems({
      ...receivedItems,
      [id]: { ...receivedItems[id], [field]: value },
    });
  };

  // Update receipt data
  const handleReceiptChange = (field, value) => {
    setReceiptData({ ...receiptData, [field]: value });
  };

  // Validate before saving
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

      // ✅ ตรวจสอบเฉพาะ "ยา" และ "เวชภัณฑ์"
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


  // Save GR
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
          .filter(item => (parseInt(receivedItems[item.po_item_id]?.qty_received) || 0) > 0)
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

      const res = await axiosInstance.post("/gr", payload);
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

  // Cancel form
  const handleCancel = () => {
    router.push("/purchasing/goodsReceipt");
  };

  if (loading) return <div className={styles.empty}>กำลังโหลด...</div>;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>บันทึกรับสินค้าใหม่</h1>
        <p className={styles.subtitle}>สร้างรายการรับสินค้าจากใบสั่งซื้อ (PO)</p>
      </header>

      <section className={styles.formSection}>
        <div className={styles.selector}>
          <label>เลือก PO:</label>
          <select
            value={selectedPO?.po_id || ""}
            onChange={(e) => handleSelectPO(e.target.value)}
          >
            <option value="">-- กรุณาเลือก --</option>
            {poList.map((po) => (
              <option key={po.po_id} value={po.po_id}>
                {po.po_no} - {po.supplier_name}
              </option>
            ))}
          </select>
          {selectedPO && (
            <button className={styles.dangerButton} onClick={() => handleSelectPO("")}>
              <FaTimes className={styles.buttonIcon} /> ปิดฟอร์ม
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
                <label>เลขที่ใบส่งของ</label>
                <input
                  type="text"
                  placeholder="ระบุเลขที่ใบส่งของ"
                  value={receiptData.delivery_no}
                  onChange={(e) => handleReceiptChange("delivery_no", e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>เลขที่ใบกำกับภาษี</label>
                <input
                  type="text"
                  placeholder="ระบุเลขที่ใบกำกับภาษี"
                  value={receiptData.invoice_no}
                  onChange={(e) => handleReceiptChange("invoice_no", e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>วันที่รับ</label>
                <input
                  type="date"
                  value={receiptData.receipt_date}
                  onChange={(e) => handleReceiptChange("receipt_date", e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label>หมายเหตุ</label>
                <textarea
                  placeholder="ระบุหมายเหตุเพิ่มเติม..."
                  value={receiptData.note}
                  onChange={(e) => handleReceiptChange("note", e.target.value)}
                  className={styles.textarea}
                />
              </div>
            </div>

            <div className={styles.tableCard}>
              <div className={styles.tableWrap} role="region" aria-label="ตารางรายการสินค้า">
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>สินค้า</th>
                      <th>จำนวนสั่งซื้อ</th>
                      <th>จำนวนที่รับจริง</th>
                      <th>Lot</th>
                      <th>วันผลิต</th>
                      <th>วันหมดอายุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPO.items.map((item) => (
                      <tr key={item.po_item_id}>
                        <td>{item.item_name || "-"}</td>
                        <td>
                          {item.quantity} {item.unit || "-"}
                        </td>
                        <td>
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
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Lot No."
                            value={receivedItems[item.po_item_id]?.lot || ""}
                            onChange={(e) => handleItemChange(item.po_item_id, "lot", e.target.value)}
                            className={styles.input}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={receivedItems[item.po_item_id]?.mfg || ""}
                            onChange={(e) => handleItemChange(item.po_item_id, "mfg", e.target.value)}
                            className={styles.input}
                          />
                        </td>
                        <td>
                          <input
                            type="date"
                            value={receivedItems[item.po_item_id]?.expiry || ""}
                            onChange={(e) =>
                              handleItemChange(item.po_item_id, "expiry", e.target.value)
                            }
                            className={styles.input}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.footer}>
              <button
                className={styles.primaryButton}
                onClick={handleSaveReceipt}
                disabled={saving}
              >
                <FaSave className={styles.buttonIcon} />{" "}
                {saving ? "กำลังบันทึก..." : "บันทึกรับสินค้า"}
              </button>
              <button className={styles.dangerButton} onClick={handleCancel}>
                <FaTimes className={styles.buttonIcon} /> ยกเลิก
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default GoodsReceiptCreatePage;