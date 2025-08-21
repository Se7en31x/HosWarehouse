'use client'

import { useRouter } from 'next/navigation'
import styles from './page.module.css'

export default function HomePage() {
  const router = useRouter()

  const handleNavigate = (role) => {
    router.push(`/${role}`)
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Hospital Inventory System</h1>
        <p className={styles.description}>กรุณาเลือกประเภทการเข้าใช้งาน</p>

        <div className={styles.buttonGroup}>
          <button
            onClick={() => handleNavigate('manage')}
            className={`${styles.button} ${styles.manager}`}
          >
            เจ้าหน้าที่คลังพัสดุ
          </button>
          <button
            onClick={() => handleNavigate('staff')}
            className={`${styles.button} ${styles.user}`}
          >
            หมอ / พยาบาล
          </button>
          <button
            onClick={() => handleNavigate('purchasing')}
            className={`${styles.button} ${styles.purchasing}`}
          >
            จัดซื้อ
          </button>
        </div>
      </div>
    </main>
  )
}
