import Link from 'next/link';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';

// ฟังก์ชันสำหรับเรียก API ดึงรายการนำเข้าสินค้าด้วย Axios
async function getGoodsReceipts() {
  try {
    const res = await axiosInstance.get('/goods-receipts', {
      headers: { 'Cache-Control': 'no-store' } // ป้องกันการ cache
    });
    return res.data;
  } catch (error) {
    console.error('Failed to fetch goods receipts:', error);
    return [];
  }
}

export default async function GoodsReceiptListPage() {
  const goodsReceipts = await getGoodsReceipts();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>รายการนำเข้าสินค้า</h1>
        <Link href="/manage/goods-receipt/create" className={styles.createButton}>
          สร้างรายการใหม่
        </Link>
      </header>

      <div className={styles.controls}>
        <input
          type="text"
          placeholder="ค้นหา..."
          className={styles.searchInput}
        />
        <select className={styles.filterSelect}>
          <option>สถานะทั้งหมด</option>
          <option>Completed</option>
          <option>Draft</option>
        </select>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>เลขที่ GR</th>
            <th>วันที่นำเข้า</th>
            <th>ซัพพลายเออร์</th>
            <th>สถานะ</th>
            <th>ผู้รับสินค้า</th>
            <th>ดูรายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          {goodsReceipts.map((gr) => (
            <tr key={gr.import_id}>
              <td>{gr.gr_no}</td>
              <td>{gr.import_date}</td>
              <td>{gr.supplier_name}</td>
              <td>{gr.import_status}</td>
              <td>{gr.user_name}</td>
              <td>
                <Link href={`/manage/goods-receipt/${gr.import_id}`} className={styles.link}>
                  ดูรายละเอียด
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}