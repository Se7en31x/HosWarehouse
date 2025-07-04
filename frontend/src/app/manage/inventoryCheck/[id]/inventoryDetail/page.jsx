"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import styles from "./page.module.css";
import axiosInstance from "../../../../utils/axiosInstance";

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

  useEffect(() => {
    setLoading(true);
    setError(null);

    axiosInstance
      .get(`/inventoryCheck/${id}`)
      .then((res) => {
        setItem(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error fetching item:", err);
        setError("ไม่สามารถโหลดข้อมูลพัสดุได้ กรุณาลองใหม่อีกครั้ง");
        setLoading(false);
      });
  }, [id]);

  const renderCategoryDetail = () => {
    if (!item) return null;

    switch (item.item_category) {
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

  if (loading) return <p className={styles.loading}>⏳ กำลังโหลดข้อมูลพัสดุ...</p>;

  if (error) return <p className={styles.error}>❗ {error}</p>;

  if (!item) return <p className={styles.noData}>ไม่พบข้อมูลพัสดุ</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📦 รายละเอียดรายการ</h1>

      <BasicDetail form={item} />

      {renderCategoryDetail()}

      <div className={styles.buttonContainer}>
        <button className={styles.backButton} onClick={() => router.back()}>
          ⬅️ กลับ
        </button>
      </div>
    </div>
  );
}
