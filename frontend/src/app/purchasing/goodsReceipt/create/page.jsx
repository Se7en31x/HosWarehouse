"use client";

import { useState, useEffect } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
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

    // โหลด PO ที่รอรับของ
    useEffect(() => {
        const fetchPOs = async () => {
            try {
                const res = await axiosInstance.get("/po?status=pending");
                setPoList(res.data);
            } catch (err) {
                Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
            }
        };
        fetchPOs();
    }, []);

    // เลือก PO
    const handleSelectPO = async (id) => {
        if (!id) {
            setSelectedPO(null);
            setReceivedItems({});
            return;
        }
        try {
            const res = await axiosInstance.get(`/po/${id}`);
            setSelectedPO(res.data);
            console.log("✅ Loaded PO", res.data);

            const init = {};
            res.data.items.forEach((item) => {
                init[item.po_item_id] = { qty_received: 0, lot: "", mfg: "", expiry: "" };
            });
            setReceivedItems(init);
        } catch (err) {
            Swal.fire("ผิดพลาด", "โหลด PO ไม่สำเร็จ", "error");
        }
    };

    // อัปเดตค่าที่กรอก
    const handleItemChange = (id, field, value) => {
        setReceivedItems({
            ...receivedItems,
            [id]: { ...receivedItems[id], [field]: value },
        });
    };

    // ตรวจสอบก่อนบันทึก
    // ตรวจสอบก่อนบันทึก
    const validateBeforeSave = async () => {
        if (!selectedPO) {
            await Swal.fire("แจ้งเตือน", "กรุณาเลือก PO ก่อน", "warning");
            return false;
        }

        let hasQty = false;

        for (const item of selectedPO.items) {
            const val = receivedItems[item.po_item_id];
            const qty = parseInt(val?.qty_received) || 0;

            if (qty > 0) {
                hasQty = true;

                // ป้องกันรับเกิน
                if (qty > item.quantity) {
                    await Swal.fire(
                        "แจ้งเตือน",
                        `ห้ามรับเกินจำนวนสั่งซื้อ (${item.quantity} ${item.unit})`,
                        "warning"
                    );
                    return false;
                }

                // ✅ ถ้าไม่กรอก Lot → ถามก่อน
                if (!val.lot) {
                    const result = await Swal.fire({
                        title: `ยังไม่ได้กรอก Lot ของ ${item.item_name}`,
                        text: "คุณต้องการให้ระบบสร้าง Lot อัตโนมัติหรือไม่?",
                        icon: "question",
                        showCancelButton: true,
                        confirmButtonText: "ใช่, สร้างให้อัตโนมัติ",
                        cancelButtonText: "ยกเลิก",
                    });

                    if (result.isConfirmed) {
                        // ให้ระบบ generate lot เอง → ใส่ marker เช่น AUTO
                        receivedItems[item.po_item_id].lot = "AUTO";
                    } else {
                        return false; // ยกเลิก
                    }
                }

                if (!val.mfg) {
                    await Swal.fire("แจ้งเตือน", `กรุณากรอกวันผลิตของ ${item.item_name}`, "warning");
                    return false;
                }
                if (!val.expiry) {
                    await Swal.fire("แจ้งเตือน", `กรุณากรอกวันหมดอายุของ ${item.item_name}`, "warning");
                    return false;
                }
            }
        }

        if (!hasQty) {
            await Swal.fire("แจ้งเตือน", "กรุณากรอกจำนวนที่รับอย่างน้อย 1 รายการ", "warning");
            return false;
        }

        return true;
    };


    // บันทึก GR
    const handleSaveReceipt = async () => {
        if (!validateBeforeSave()) return;

        try {
            const payload = {
                po_id: selectedPO.po_id,
                delivery_no: receiptData.delivery_no,
                invoice_no: receiptData.invoice_no,
                receipt_date: receiptData.receipt_date,
                note: receiptData.note,
                items: selectedPO.items.map((item) => ({
                    po_item_id: item.po_item_id,
                    item_id: item.item_id,   // 👈 ส่งเพิ่มมา
                    qty_received: parseInt(receivedItems[item.po_item_id]?.qty_received) || 0,
                    lot_no: receivedItems[item.po_item_id]?.lot || "",
                    mfg_date: receivedItems[item.po_item_id]?.mfg || null,
                    expiry_date: receivedItems[item.po_item_id]?.expiry || null,
                    unit: item.unit || null,
                })),
            };

            const res = await axiosInstance.post("/gr", payload);
            Swal.fire("สำเร็จ", `บันทึกรับสินค้า GR เลขที่ ${res.data.gr_no}`, "success");
            router.push("/purchasing/goodsReceipt");
        } catch (err) {
            Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
        }
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>➕ บันทึกรับสินค้าใหม่</h1>

            {/* เลือก PO */}
            <div className={styles.selector}>
                <label>เลือก PO: </label>
                <select onChange={(e) => handleSelectPO(e.target.value)} value={selectedPO?.po_id || ""}>
                    <option value="">-- กรุณาเลือก --</option>
                    {poList.map((po) => (
                        <option key={po.po_id} value={po.po_id}>
                            {po.po_no} - {po.supplier_name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedPO && (
                <div className={styles.detail}>
                    <h2>รายละเอียด PO: {selectedPO.po_no}</h2>

                    {/* ฟอร์ม */}
                    <div className={styles.section}>
                        <input type="text" placeholder="เลขที่ใบส่งของ" value={receiptData.delivery_no}
                            onChange={(e) => setReceiptData({ ...receiptData, delivery_no: e.target.value })} />
                        <input type="text" placeholder="เลขที่ใบกำกับภาษี" value={receiptData.invoice_no}
                            onChange={(e) => setReceiptData({ ...receiptData, invoice_no: e.target.value })} />
                        <input type="date" value={receiptData.receipt_date}
                            onChange={(e) => setReceiptData({ ...receiptData, receipt_date: e.target.value })} />
                        <textarea placeholder="หมายเหตุ" value={receiptData.note}
                            onChange={(e) => setReceiptData({ ...receiptData, note: e.target.value })}></textarea>
                    </div>

                    {/* ตารางสินค้า */}
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
                                    <td>{item.item_name}</td>
                                    <td>{item.quantity} {item.unit}</td>
                                    <td>
                                        <input type="number" min="0" max={item.quantity}
                                            className={styles.inputItem}
                                            value={receivedItems[item.po_item_id]?.qty_received || ""}
                                            onChange={(e) => handleItemChange(item.po_item_id, "qty_received", e.target.value)} />
                                    </td>
                                    <td>
                                        <input type="text" placeholder="Lot No."
                                            value={receivedItems[item.po_item_id]?.lot || ""}
                                            onChange={(e) => handleItemChange(item.po_item_id, "lot", e.target.value)} />
                                    </td>
                                    <td>
                                        <input type="date"
                                            value={receivedItems[item.po_item_id]?.mfg || ""}
                                            onChange={(e) => handleItemChange(item.po_item_id, "mfg", e.target.value)} />
                                    </td>
                                    <td>
                                        <input type="date"
                                            value={receivedItems[item.po_item_id]?.expiry || ""}
                                            onChange={(e) => handleItemChange(item.po_item_id, "expiry", e.target.value)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className={styles.footer}>
                        <button className={styles.button} onClick={handleSaveReceipt}>✅ บันทึกรับสินค้า</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GoodsReceiptCreatePage;
