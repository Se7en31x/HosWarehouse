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

  // ✅ ฟังก์ชันแปลงเวลา
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return "-";
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ✅ normalize category
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
            damage_type: type,
            note: note,
            source_type: "stock_check",
            source_ref_id: lot.lot_id,
            reported_by: 999,
          });

          Swal.fire("✅ สำเร็จ", "บันทึกของชำรุดแล้ว", "success");
          const res = await axiosInstance.get(`/inventoryCheck/${lot.item_id}`);
          setItem(res.data);
        } catch (err) {
          console.error(err);
          Swal.fire("❌ ผิดพลาด", "ไม่สามารถบันทึกของชำรุดได้", "error");
        }
      }
    });
  };

  // ✅ ฟังก์ชันใหม่: ปรับปรุงจำนวน
const handleAdjust = (lot) => {
    Swal.fire({
        title: `ปรับปรุงจำนวนคงเหลือ (Lot ${lot.lot_no || "-"})`,
        html:
            `<div class="swal2-html-container">` +
            `<p>จำนวนคงเหลือในระบบ: <strong style="color: #007bff; font-weight: 600;">${lot.remaining_qty ?? 0}</strong></p>` +
            `<p>จำนวนที่นำเข้า: <strong style="color: #28a745; font-weight: 600;">${lot.qty_imported ?? 0}</strong></p>` +
            `<label for="swal-input1" class="swal2-label">จำนวนคงเหลือที่นับได้จริง:</label>` +
            `<input id="swal-input1" class="swal2-input" type="number" min="0" value="${lot.remaining_qty ?? 0}">` +
            `<label for="swal-input2" class="swal2-label">เหตุผลการปรับปรุง (สำคัญ):</label>` +
            `<textarea id="swal-input2" class="swal2-textarea" placeholder="เช่น นับสต็อกประจำปีแล้วพบว่าจำนวนไม่ตรง"></textarea>` +
            `</div>`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: "ยืนยันการปรับปรุง",
        cancelButtonText: "ยกเลิก",
        preConfirm: () => {
            const actual_qty = Number(document.getElementById("swal-input1").value);
            const reason = document.getElementById("swal-input2").value.trim();

            if (isNaN(actual_qty) || actual_qty < 0) {
                Swal.showValidationMessage("กรุณากรอกจำนวนคงเหลือที่ถูกต้อง");
                return false;
            }

            // ✅ เพิ่มเงื่อนไขใหม่: จำนวนที่นับได้จริงต้องไม่เกินจำนวนนำเข้า
            if (actual_qty > lot.qty_imported) {
                Swal.showValidationMessage(`จำนวนที่นับได้จริง (${actual_qty}) ไม่ควรเกินจำนวนที่นำเข้า (${lot.qty_imported})`);
                return false;
            }

            if (!reason) {
                Swal.showValidationMessage("กรุณาระบุเหตุผลในการปรับปรุง");
                return false;
            }
            return { actual_qty, reason };
        },
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { actual_qty, reason } = result.value;
            const original_qty = lot.remaining_qty;
            const diff = actual_qty - original_qty;

            if (diff === 0) {
                Swal.fire("💡 ไม่มีการเปลี่ยนแปลง", "จำนวนเท่าเดิม ไม่ต้องปรับปรุง", "info");
                return;
            }

            try {
                // ส่งข้อมูลไปที่ Endpoint ใหม่สำหรับการปรับปรุง
                await axiosInstance.post(`/adjust`, {
                    lot_id: lot.lot_id,
                    item_id: lot.item_id,
                    actual_qty,
                    reason,
                });

                Swal.fire("✅ สำเร็จ", "ปรับปรุงจำนวนเรียบร้อยแล้ว", "success");
                const res = await axiosInstance.get(`/inventoryCheck/${lot.item_id}`);
                setItem(res.data);
            } catch (err) {
                console.error("❌ Error adjusting stock:", err);
                Swal.fire("❌ ผิดพลาด", "ไม่สามารถปรับปรุงจำนวนได้", "error");
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
        {/* ===== Overview Card ===== */}
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
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.replaceWith(
                      Object.assign(document.createElement("div"), {
                        className: styles.overviewImagePlaceholder,
                        innerText: "ไม่มีรูปภาพ",
                      })
                    );
                  }}
                />
              ) : (
                <div className={styles.overviewImagePlaceholder}>ไม่มีรูปภาพ</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Content Grid ===== */}
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
                  <th className={styles.center}>จำนวนที่นำเข้า</th>
                  <th className={styles.center}>คงเหลือ</th>
                  <th className={styles.center}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {lots.length > 0 ? (
                  lots.map((lot) => (
                    <tr key={lot.lot_id}>
                      <td>
                        <span style={{ fontFamily: 'ui-monospace', fontWeight: 600 }}>
                          {lot.lot_no ?? "-"}
                        </span>
                      </td>
                      <td>{formatDate(lot.mfg_date)}</td>
                      <td>{formatDate(lot.exp_date)}</td>
                      <td>{formatDate(lot.import_date)}</td>
                      <td className={styles.center}>
                        <span className={styles.qtyPill}>{lot.qty_imported ?? 0}</span>
                      </td>
                      <td className={styles.center}>
                        <span className={styles.qtyPill}>{lot.remaining_qty ?? 0}</span>
                      </td>
                      <td className={styles.center}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleAdjust(lot)}
                            className={`${styles.actionButton} ${styles.adjustButton}`}
                          >
                            ปรับปรุงจำนวน
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDamaged(lot)}
                            className={`${styles.actionButton} ${styles.damagedButton}`}
                          >
                            แจ้งชำรุด
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '28px 0' }}>
                      ไม่มีข้อมูล Lot
                    </td>
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