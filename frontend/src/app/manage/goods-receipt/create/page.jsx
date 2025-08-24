"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";

// Mock API (แทนด้วย API จริงได้)
async function fetchPoDetails(poId) {
  if (poId === "1") {
    return {
      po_no: "PO-001",
      supplier_id: 101,
      supplier_name: "บริษัท A จำกัด",
      items: [
        { item_id: 1, item_name: "ยา A", ordered_qty: 100, price_per_unit: 10 },
        { item_id: 2, item_name: "อุปกรณ์ B", ordered_qty: 50, price_per_unit: 50 },
      ],
    };
  }
  return null;
}

export default function CreateGoodsReceiptPage() {
  const router = useRouter();
  const [poId, setPoId] = useState("");
  const [receivingItems, setReceivingItems] = useState([]);
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const userId = 1;

  const handleFetchPoDetails = async () => {
    const poDetails = await fetchPoDetails(poId);
    if (poDetails) {
      setSupplier(poDetails.supplier_name);
      setReceivingItems(
        poDetails.items.map((item) => ({
          ...item,
          quantity: item.ordered_qty,
          lotNo: "",
          expiryDate: "",
          notes: "",
          vendor_item_code: "",
        }))
      );
    } else {
      setSupplier("");
      setReceivingItems([]);
      alert("ไม่พบข้อมูล PO");
    }
  };

  const handleInputChange = (e, itemId, field) => {
    const value = e.target.value;
    setReceivingItems((prev) =>
      prev.map((item) =>
        item.item_id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        userId,
        poId,
        supplierId: "101",
        receivingNote: notes,
        receivingItems: receivingItems.map((item) => ({
          itemId: item.item_id,
          quantity: parseInt(item.quantity, 10),
          pricePerUnit: item.price_per_unit,
          lotNo: item.lotNo,
          expiryDate: item.expiryDate,
          notes: item.notes,
          vendorItemCode: item.vendor_item_code,
        })),
      };

      const res = await axiosInstance.post("/goods-receipts", payload);
      alert(`บันทึกรายการนำเข้าสำเร็จ! เลขที่: ${res.data.gr_no}`);
      router.push("/goods-receipt");
    } catch (err) {
      console.error("Submission error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>สร้างรายการนำเข้าใหม่</h1>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* 🔎 PO Search */}
        <div className={styles.formGroup}>
          <label>เลขที่ PO:</label>
          <div className={styles.poSearch}>
            <input
              type="text"
              value={poId}
              onChange={(e) => setPoId(e.target.value)}
              placeholder="กรอกเลขที่ PO"
            />
            <button type="button" onClick={handleFetchPoDetails}>
              ดึงข้อมูล
            </button>
          </div>
        </div>

        {/* 🏢 Supplier */}
        {supplier && (
          <div className={styles.summaryBox}>
            <p><strong>ซัพพลายเออร์:</strong> {supplier}</p>
          </div>
        )}

        {/* 📦 Items Table */}
        {receivingItems.length > 0 && (
          <div className={styles.tableSection}>
            <table>
              <thead>
                <tr>
                  <th>ชื่อสินค้า</th>
                  <th>จำนวนสั่ง</th>
                  <th>จำนวนรับ</th>
                  <th>ราคา/หน่วย</th>
                  <th>เลข Lot</th>
                  <th>วันหมดอายุ</th>
                </tr>
              </thead>
              <tbody>
                {receivingItems.map((item) => (
                  <tr key={item.item_id}>
                    <td>{item.item_name}</td>
                    <td>{item.ordered_qty}</td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleInputChange(e, item.item_id, "quantity")
                        }
                      />
                    </td>
                    <td>{item.price_per_unit}</td>
                    <td>
                      <input
                        type="text"
                        value={item.lotNo}
                        onChange={(e) =>
                          handleInputChange(e, item.item_id, "lotNo")
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) =>
                          handleInputChange(e, item.item_id, "expiryDate")
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 📝 Notes */}
        <div className={styles.formGroup}>
          <label>หมายเหตุ:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={styles.textarea}
          />
        </div>

        {/* ✅ Buttons */}
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryBtn}>
            บันทึกการนำเข้า
          </button>
          <button
            type="button"
            onClick={() => router.push("/manage/goods-receipt")}
            className={styles.secondaryBtn}
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}
