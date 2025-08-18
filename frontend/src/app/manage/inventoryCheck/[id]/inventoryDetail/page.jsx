'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import styles from "./page.module.css";
import axiosInstance from "../../../../utils/axiosInstance";

// ✅ Components
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

  // ✅ normalize category (กันกรณี API ส่ง id หรือสะกดไม่ตรง)
  const normalizeCategory = (raw) => {
    if (!raw) return null;

    const map = {
      1: "general",
      2: "medicine",
      3: "medsup",
      4: "equipment",
      5: "meddevice",
      general: "general",
      medicine: "medicine",
      medsup: "medsup",
      equipment: "equipment",
      meddevice: "meddevice",
      General: "general",
      Medicine: "medicine",
      Medsup: "medsup",
      Equipment: "equipment",
      Meddevice: "meddevice",
    };

    return map[raw] || null;
  };

  // โหลดข้อมูล Item + lots
  useEffect(() => {
    setLoading(true);
    setError(null);

    axiosInstance
      .get(`/inventoryCheck/${id}`)
      .then((res) => {
        console.log("📌 API data:", res.data); // debug ดูค่าที่ได้
        setItem(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching item:", err);
        setError("ไม่สามารถโหลดข้อมูลพัสดุได้ กรุณาลองใหม่อีกครั้ง");
        setLoading(false);
      });
  }, [id]);

  // Render form รายละเอียดแต่ละ category
  const renderCategoryDetail = () => {
    if (!item) return null;

    const category = normalizeCategory(item.item_category);

    switch (category) {
      case "medicine":
        return <MedicineDetail form={item} />;
      case "medsup":
        return <MedsupDetail form={item} />;
      case "equipment":
        return <EquipmentDetail form={item} />;
      case "meddevice":
        return <MeddeviceDetail form={item} />;
      case "general":
        return <GeneralDetail form={item} />;
      default:
        return null;
    }
  };

  // ฟังก์ชันแจ้งชำรุด
  const handleDamaged = (lot) => {
    Swal.fire({
      title: `แจ้งของชำรุด (Lot ${lot.lot_no})`,
      html:
        `<label for="swal-input1" class="swal2-label">จำนวนที่ชำรุด:</label>` +
        `<input id="swal-input1" class="swal2-input" type="number" min="1" max="${lot.remaining_qty}" value="1">` +
        `<label for="swal-input2" class="swal2-label">ประเภท:</label>` +
        `<select id="swal-input2" class="swal2-select">
        <option value="damaged">ชำรุด</option>
        <option value="lost">สูญหาย</option>
     </select>` +
        `<label for="swal-input3" class="swal2-label">หมายเหตุ:</label>` +
        `<textarea id="swal-input3" class="swal2-textarea" placeholder="ระบุหมายเหตุ (ถ้ามี)"></textarea>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => {
        const qty = document.getElementById("swal-input1").value;
        const type = document.getElementById("swal-input2").value;
        const note = document.getElementById("swal-input3").value;

        if (!qty || qty <= 0 || qty > lot.remaining_qty) {
          Swal.showValidationMessage("กรุณากรอกจำนวนที่ถูกต้อง");
          return false;
        }

        return { qty, type, note };
      },
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { qty, type, note } = result.value;
        try {
          await axiosInstance.post(`/damaged`, {
            lot_id: lot.lot_id,
            item_id: lot.item_id,
            qty: parseInt(qty, 10),
            damaged_type: type,
            note: note,
            reported_by: 999, // ถ้าคุณมีระบบ Authentication ให้ใช้ user id จริงๆ
          });

          Swal.fire("✅ สำเร็จ", "บันทึกของชำรุดแล้ว", "success");

          // Reload รายการ lot ใหม่
          const res = await axiosInstance.get(`/inventoryCheck/${lot.item_id}`);
          setItem(res.data);
        } catch (err) {
          console.error(err);
          Swal.fire("❌ ผิดพลาด", "ไม่สามารถบันทึกของชำรุดได้", "error");
        }
      }
    });
  };

  if (loading) return <p className={styles.loading}>⏳ กำลังโหลดข้อมูลพัสดุ...</p>;

  if (error) return <p className={styles.error}>❗ {error}</p>;

  if (!item) return <p className={styles.noData}>ไม่พบข้อมูลพัสดุ</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📦 รายละเอียดรายการ</h1>

      {/* ✅ แสดงประเภทพัสดุ */}
      <div className={styles.categoryBox}>
        <strong>ประเภท:</strong>{" "}
        {(() => {
          const mapTH = {
            general: "พัสดุทั่วไป",
            medicine: "ยา",
            medsup: "เวชภัณฑ์สิ้นเปลือง",
            equipment: "ครุภัณฑ์",
            meddevice: "เครื่องมือแพทย์",
          };
          const category = normalizeCategory(item.item_category);
          return mapTH[category] || item.item_category || "ไม่ทราบประเภท";
        })()}
      </div>

      <BasicDetail form={item} />

      {renderCategoryDetail()}

      {/* ✅ Section แสดงข้อมูล Lot */}
      <div className={styles.lotSection}>
        <h2 className={styles.subTitle}>📑 ข้อมูล Lot</h2>
        <table className={styles.lotTable}>
          <thead>
            <tr>
              <th>Lot No</th>
              <th>ผลิต</th>
              <th>หมดอายุ</th>
              <th>นำเข้า</th>
              <th>คงเหลือ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {item.lots && item.lots.length > 0 ? (
              item.lots.map((lot) => (
                <tr key={lot.lot_id}>
                  <td>{lot.lot_no}</td>
                  <td>{lot.mfg_date}</td>
                  <td>{lot.exp_date}</td>
                  <td>{lot.import_date}</td>
                  <td>{lot.remaining_qty}</td>
                  <td>{lot.status}</td>
                  <td>
                    <button
                      className={styles.damagedButton}
                      onClick={() => handleDamaged(lot)}
                    >
                      แจ้งชำรุด
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">ไม่มีข้อมูล Lot</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ปุ่มกลับ */}
      <div className={styles.buttonContainer}>
        <button className={styles.backButton} onClick={() => router.back()}>
          ⬅️ กลับ
        </button>
      </div>
    </div>
  );
}
