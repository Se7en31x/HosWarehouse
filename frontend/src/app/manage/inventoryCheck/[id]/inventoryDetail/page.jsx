'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import axiosInstance from "../../../../utils/axiosInstance";

// Components
import BasicDetail from "../../../components/inventoryDetail/BasicDetail";
import MedicineDetail from "../../../components/inventoryDetail/MedicineDetail";
import MedsupDetail from "../../../components/inventoryDetail/MedsupDetail";
import EquipmentDetail from "../../../components/inventoryDetail/EquipmentDetail";
import MeddeviceDetail from "../../../components/inventoryDetail/MeddeviceDetail";
import GeneralDetail from "../../../components/inventoryDetail/GeneralDetail";

export default function InventoryDetail() {
  const { id } = useParams();
  const router = useRouter();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== Utilities =====
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d)
      ? "-"
      : d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  };

  const normalizeCategory = (raw) => {
    const key = String(raw ?? "").toLowerCase().trim();
    const map = {
      "1": "general",
      "2": "medicine",
      "3": "medsup",
      "4": "equipment",
      "5": "meddevice",
      general: "general",
      medicine: "medicine",
      medsup: "medsup",
      equipment: "equipment",
      meddevice: "meddevice",
    };
    return map[key] || null;
  };

  // ===== Data Fetch =====
  useEffect(() => {
    let alive = true;
    setLoading(true);
    axiosInstance
      .get(`/inventoryCheck/${id}`)
      .then((res) => alive && setItem(res.data))
      .catch(() => alive && setError("ไม่สามารถโหลดข้อมูลพัสดุได้ กรุณาลองใหม่อีกครั้ง"))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [id]);

  // ===== Render Category Form =====
  const renderCategoryDetail = () => {
    if (!item) return null;
    const category = normalizeCategory(item.item_category);
    switch (category) {
      case "medicine": return <MedicineDetail form={item} />;
      case "medsup": return <MedsupDetail form={item} />;
      case "equipment": return <EquipmentDetail form={item} />;
      case "meddevice": return <MeddeviceDetail form={item} />;
      case "general": return <GeneralDetail form={item} />;
      default: return null;
    }
  };

  // ===== Action Handlers =====
  const handleDamaged = async (lot) => {
    Swal.fire({
      title: `แจ้งของชำรุด (Lot ${lot.lot_no || "-"})`,
      input: "number",
      inputLabel: "จำนวนที่ชำรุด",
      inputAttributes: { min: 1, max: lot.remaining_qty },
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    }).then(async (result) => {
      if (result.isConfirmed && result.value > 0) {
        try {
          await axiosInstance.post(`/damaged`, {
            lot_id: lot.lot_id,
            item_id: lot.item_id,
            qty: Number(result.value),
            damage_type: "damaged",
            source_type: "stock_check",
            source_ref_id: lot.lot_id,
          });
          Swal.fire("สำเร็จ", "บันทึกของชำรุดแล้ว", "success");
          const res = await axiosInstance.get(`/inventoryCheck/${lot.item_id}`);
          setItem(res.data);
        } catch {
          Swal.fire("ผิดพลาด", "ไม่สามารถบันทึกได้", "error");
        }
      }
    });
  };

  const handleAdjust = (lot) => {
    Swal.fire({
      title: `ปรับปรุงจำนวน (Lot ${lot.lot_no})`,
      html: `
        <p>คงเหลือปัจจุบัน: <b>${lot.remaining_qty}</b></p>
        <input id="newQty" class="swal2-input" type="number" value="${lot.remaining_qty}">
      `,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => Number(document.getElementById("newQty").value),
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axiosInstance.post(`/adjust`, {
            lot_id: lot.lot_id,
            item_id: lot.item_id,
            actual_qty: result.value,
          });
          Swal.fire("สำเร็จ", "ปรับปรุงจำนวนแล้ว", "success");
          const res = await axiosInstance.get(`/inventoryCheck/${lot.item_id}`);
          setItem(res.data);
        } catch {
          Swal.fire("ผิดพลาด", "ไม่สามารถปรับปรุงได้", "error");
        }
      }
    });
  };

  // ===== Rendering =====
  if (loading) return <p className={styles.stateText}>⏳ กำลังโหลด...</p>;
  if (error) return <p className={styles.stateText}>{error}</p>;
  if (!item) return <p className={styles.stateText}>ไม่พบข้อมูล</p>;

  const categoryMap = {
    general: "พัสดุทั่วไป",
    medicine: "ยา",
    medsup: "เวชภัณฑ์สิ้นเปลือง",
    equipment: "ครุภัณฑ์",
    meddevice: "เครื่องมือแพทย์",
  };

  return (
    <div className={styles.page}>
      {/* ===== Header ===== */}
      <div className={styles.headerCard}>
        <div>
          <h2 className={styles.itemName}>{item.item_name}</h2>
          <p className={styles.meta}>
            {categoryMap[normalizeCategory(item.item_category)] || "ไม่ระบุ"} | {item.item_code}
          </p>
        </div>
      </div>

      {/* ===== Details ===== */}
      <div className={styles.grid}>
        <div className={styles.card}>{<BasicDetail form={item} />}</div>
        <div className={styles.card}>{renderCategoryDetail()}</div>
      </div>

      {/* ===== Lots ===== */}
      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>ข้อมูล LOT</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Lot</th>
                <th>ผลิต</th>
                <th>หมดอายุ</th>
                <th>นำเข้า</th>
                <th>นำเข้า</th>
                <th>คงเหลือ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {item?.lots?.length > 0 ? (
                item.lots.map((lot) => (
                  <tr key={lot.lot_id}>
                    <td>{lot.lot_no}</td>
                    <td>{formatDate(lot.mfg_date)}</td>
                    <td>{formatDate(lot.exp_date)}</td>
                    <td>{formatDate(lot.import_date)}</td>
                    <td>{lot.qty_imported}</td>
                    <td>{lot.remaining_qty}</td>
                    <td>
                      <button onClick={() => handleAdjust(lot)} className={styles.btnBlue}>ปรับ</button>
                      <button onClick={() => handleDamaged(lot)} className={styles.btnRed}>ชำรุด</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={7} className={styles.noLot}>ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
}
