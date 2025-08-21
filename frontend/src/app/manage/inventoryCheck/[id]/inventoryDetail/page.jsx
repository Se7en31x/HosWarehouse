'use client';

import { useEffect, useState, useMemo } from "react";
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
    if (raw === null || raw === undefined) return null;
    const key = String(raw).toLowerCase().trim();

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
      // เผื่อ API ส่งตัวพิมพ์ใหญ่
      General: "general",
      Medicine: "medicine",
      Medsup: "medsup",
      Equipment: "equipment",
      Meddevice: "meddevice",
    };
    return map[key] || map[raw] || null;
  };

  // โหลดข้อมูล Item + lots
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    axiosInstance
      .get(`/inventoryCheck/${id}`)
      .then((res) => {
        if (!alive) return;
        setItem(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching item:", err);
        if (!alive) return;
        setError("ไม่สามารถโหลดข้อมูลพัสดุได้ กรุณาลองใหม่อีกครั้ง");
        setLoading(false);
      });

    return () => { alive = false; };
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

  // จัดสี badge สถานะ lot
  const statusBadgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (["active", "available", "ready", "ปกติ"].includes(s)) return styles.badgeSuccess;
    if (["warning", "low", "near_expiry", "near-expiry", "ใกล้หมดอายุ"].includes(s)) return styles.badgeWarning;
    if (["expired", "unavailable", "out", "หมดอายุ"].includes(s)) return styles.badgeDanger;
    return styles.badgeMuted;
  };

  // ฟังก์ชันแจ้งชำรุด
  const handleDamaged = (lot) => {
    Swal.fire({
      title: `แจ้งของชำรุด (Lot ${lot.lot_no || "-"})`,
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
        const qty = Number(document.getElementById("swal-input1").value);
        const type = document.getElementById("swal-input2").value;
        const note = document.getElementById("swal-input3").value;

        if (!qty || qty <= 0 || qty > Number(lot.remaining_qty)) {
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
            qty: Number(qty),
            damaged_type: type,
            note: note,
            reported_by: 999, // TODO: แทนด้วย user id จริงเมื่อมี Auth
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

  const categoryTHMap = {
    general: "พัสดุทั่วไป",
    medicine: "ยา",
    medsup: "เวชภัณฑ์สิ้นเปลือง",
    equipment: "ครุภัณฑ์",
    meddevice: "เครื่องมือแพทย์",
  };
  const categoryKey = normalizeCategory(item.item_category);
  const categoryTH = categoryTHMap[categoryKey] || item.item_category || "ไม่ทราบประเภท";

  const lots = Array.isArray(item?.lots) ? item.lots : [];

  return (
    <div className={styles.appBg}>
      <div className={styles.containerWide}>
        {/* ===== Overview Card (หัวกระดาน + รูปขวา) ===== */}
        <div className={styles.overviewCard}>
          <div className={styles.overviewHeader}>
            <div className={styles.overviewMeta}>
              <span className={styles.categoryChip}>{categoryTH}</span>
              <h2 className={styles.itemTitle}>{item.item_name || 'ไม่มีชื่อ'}</h2>
              {item.item_code && (
                <span className={styles.codeMono}>{item.item_code}</span>
              )}
            </div>

            <div className={styles.overviewImageBox}>
              {item?.item_img ? (
                <img
                  src={`http://localhost:5000/uploads/${item.item_img}`}
                  alt="รูปภาพพัสดุ"
                  className={styles.overviewImage}
                  onError={(e) => { e.currentTarget.src = "http://localhost:5000/public/defaults/landscape.png"; }}
                />
              ) : (
                <div className={styles.overviewImagePlaceholder}>ไม่มีรูปภาพ</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Content Grid: Basic + Category ===== */}
        <div className={styles.contentGrid2}>
          <section className={styles.blockCard}>
            <BasicDetail form={item} />
          </section>
          <section className={styles.blockCard}>
            {renderCategoryDetail()}
          </section>
        </div>

        {/* ===== LOT Section ===== */}
        <section className={styles.lotCard}>
          <div className={styles.lotHeaderBar}>
            <h3 className={styles.lotTitle}>ข้อมูล Lot</h3>
          </div>

          <div className={styles.tableWrapNice}>
            <table className={`${styles.lotTable} ${styles.tableZebra}`}>
              <thead>
                <tr>
                  <th>Lot No</th>
                  <th>ผลิต</th>
                  <th>หมดอายุ</th>
                  <th>นำเข้า</th>
                  <th className={styles.center}>คงเหลือ</th>
                  <th className={styles.center}>สถานะ</th>
                  <th className={styles.center}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {item.lots && item.lots.length > 0 ? (
                  item.lots.map((lot) => (
                    <tr key={lot.lot_id}>
                      <td><span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', fontWeight: 600 }}>
                        {lot.lot_no ?? "-"}</span>
                      </td>
                      <td>{lot.mfg_date ?? "-"}</td>
                      <td>{lot.exp_date ?? "-"}</td>
                      <td>{lot.import_date ?? "-"}</td>
                      <td className={styles.center}>
                        <span className={styles.qtyPill}>{lot.remaining_qty ?? 0}</span>
                      </td>
                      <td className={styles.center}>
                        <span className={`${styles.badge} ${statusBadgeClass(lot.status)}`}>
                          {lot.status || "-"}
                        </span>
                      </td>
                      <td className={styles.center}>
                        <button
                          type="button"
                          onClick={() => handleDamaged(lot)}
                          className={styles.damagedButton2}
                        >
                          แจ้งชำรุด
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '28px 0' }}>ไม่มีข้อมูล Lot</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* กลับ */}
        <div className={styles.backRow}>
          <button className={styles.backBtn} onClick={() => router.back()} aria-label="ย้อนกลับ">
            ⬅️ กลับ
          </button>
        </div>
      </div>
    </div>
  );
}