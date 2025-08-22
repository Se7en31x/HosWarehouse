import Link from 'next/link';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';

// ฟังก์ชันสำหรับเรียก API ดึงรายละเอียดรายการนำเข้าด้วย Axios
async function getGoodsReceiptDetails(id) {
  try {
    const res = await axiosInstance.get(`/goods-receipts/${id}`, {
      headers: { 'Cache-Control': 'no-store' } // ป้องกันการ cache
    });
    return res.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error('Failed to fetch goods receipt details:', error);
    return null;
  }
}

export default async function GoodsReceiptDetailPage({ params }) {
  const { id } = params;
  const grDetail = await getGoodsReceiptDetails(id);

  if (!grDetail) {
    return <div className={styles.container}>ไม่พบข้อมูลรายการนำเข้า</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>รายละเอียดรายการนำเข้า #{grDetail.gr_no}</h1>
        <Link href="/manage/goods-receipt" className={styles.backButton}>
          &larr; กลับไปหน้ารายการ
        </Link>
      </header>

      <div className={styles.detailSection}>
        <p><strong>วันที่นำเข้า:</strong> {grDetail.import_date}</p>
        <p><strong>ซัพพลายเออร์:</strong> {grDetail.supplier_name}</p>
        <p><strong>ผู้รับสินค้า:</strong> {grDetail.user_name}</p>
        <p><strong>หมายเหตุ:</strong> {grDetail.import_note}</p>
      </div>

      <h2 className={styles.subtitle}>รายการสินค้า</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ชื่อสินค้า</th>
            <th>จำนวนที่รับ</th>
            <th>เลข Lot</th>
            <th>วันหมดอายุ</th>
            <th>ราคา/หน่วย</th>
          </tr>
        </thead>
        <tbody>
          {grDetail.items.map((item, index) => (
            <tr key={index}>
              <td>{item.item_name}</td>
              <td>{item.quantity}</td>
              <td>{item.lot_no}</td>
              <td>{item.exp_date}</td>
              <td>{item.import_price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}