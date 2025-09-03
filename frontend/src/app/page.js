'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './page.module.css'

export default function HomePage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState(null)
  const [tokenInput, setTokenInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleNavigate = (role) => {
    // ✅ ฝ่ายจัดซื้อเข้าได้เลยโดยไม่ต้องใช้ token
    if (role === 'purchasing') {
      setIsLoading(true)
      setTimeout(() => {
        router.push(`/${role}`)
      }, 500)
      return
    }

    // ส่วนอื่นๆ ยังต้องใช้ token ตามเดิม
    const token = localStorage.getItem(`authToken_${role}`)
    if (!token) {
      setSelectedRole(role)
      return
    }
    setIsLoading(true)
    setTimeout(() => {
      router.push(`/${role}`)
    }, 500)
  }

  const handleSaveToken = () => {
    if (!tokenInput.trim()) {
      showNotification('กรุณากรอก Token ก่อน', 'error')
      return
    }

    setIsLoading(true)
    localStorage.setItem(`authToken_${selectedRole}`, tokenInput)

    setTimeout(() => {
      showNotification(`✅ บันทึก Token สำหรับ ${getRoleDisplayName(selectedRole)} เรียบร้อยแล้ว`)
      setTokenInput('')
      setSelectedRole(null)
      setIsLoading(false)
      router.push(`/${selectedRole}`)
    }, 1000)
  }

  const getRoleDisplayName = (role) => {
    const roleNames = {
      manage: 'เจ้าหน้าที่คลังพัสดุ',
      staff: 'หมอ/พยาบาล',
      purchasing: 'จัดซื้อ'
    }
    return roleNames[role] || role
  }

  const showNotification = (message, type = 'success') => {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = styles.notification
    notification.textContent = message

    if (type === 'error') {
      notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)'
    }

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, 3000)
  }

  const handleCancelToken = () => {
    setSelectedRole(null)
    setTokenInput('')
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Hospital Inventory System</h1>
        <p className={styles.description}>กรุณาเลือกประเภทการเข้าใช้งาน</p>

        <div className={styles.buttonGroup}>
          <button
            onClick={() => handleNavigate('manage')}
            className={`${styles.button} ${styles.manager} ${isLoading ? styles.loading : ''}`}
            disabled={isLoading}
          >
            เจ้าหน้าที่คลังพัสดุ
          </button>
          <button
            onClick={() => handleNavigate('staff')}
            className={`${styles.button} ${styles.user} ${isLoading ? styles.loading : ''}`}
            disabled={isLoading}
          >
            หมอ / พยาบาล
          </button>
          <button
            onClick={() => handleNavigate('purchasing')}
            className={`${styles.button} ${styles.purchasing} ${isLoading ? styles.loading : ''}`}
            disabled={isLoading}
          >
            จัดซื้อ
          </button>
        </div>

        {/* ถ้าเลือก role แต่ยังไม่มี token → โชว์ฟอร์ม */}
        {selectedRole && (
          <div className={styles.tokenForm}>
            <h3>🔐 ใส่ Token สำหรับ {getRoleDisplayName(selectedRole)}</h3>
            <textarea
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              rows={4}
              className={styles.tokenTextarea}
              placeholder="กรุณาวาง Authorization Token ของคุณที่นี่..."
              disabled={isLoading}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSaveToken}
                className={`${styles.saveButton} ${isLoading ? styles.loading : ''}`}
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                {isLoading ? 'กำลังบันทึก...' : 'Save Token & เข้าสู่ระบบ'}
              </button>
              <button
                onClick={handleCancelToken}
                className={`${styles.button} ${styles.cancelButton}`}
                disabled={isLoading}
                style={{
                  flex: 'none',
                  padding: '1rem 1.5rem'
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}