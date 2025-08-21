'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import { FaPlusCircle, FaTimes } from 'react-icons/fa';
import Swal from 'sweetalert2';

// Component สำหรับแสดง Badge สถานะ
const StatusBadge = ({ status }) => {
  let badgeStyle = styles.pending;
  if (status === 'approved') {
    badgeStyle = styles.approved;
  } else if (status === 'completed') {
    badgeStyle = styles.completed;
  } else if (status === 'canceled') {
    badgeStyle = styles.canceled;
  }
  return <span className={`${styles.badge} ${badgeStyle}`}>{status}</span>;
};

// Component Modal สำหรับสร้าง PO หรือ RFQ
const DocumentModal = ({ items, docType, onClose }) => {
  const [vendor, setVendor] = useState('');
  const [remark, setRemark] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [shippingTerms, setShippingTerms] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [itemDetails, setItemDetails] = useState({});

  const isPo = docType === 'po';
  const isRfq = docType === 'rfq';

  const fmt = (n) => {
    const num = parseFloat(n);
    if (typeof num !== 'number' || isNaN(num) || num === null) return '0.00';
    return num.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // โหลด suppliers มาใช้เฉพาะ PO
  useEffect(() => {
    if (!isPo) return;
    async function fetchSuppliers() {
      try {
        setSuppliersLoading(true);
        const res = await axiosInstance.get('/suppliers');
        setSuppliers(res.data);
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'โหลดข้อมูลผู้ขายไม่สำเร็จ' });
      } finally {
        setSuppliersLoading(false);
      }
    }
    fetchSuppliers();
  }, [isPo]);

  useEffect(() => {
    const initialDetails = items.reduce((acc, item) => {
      acc[item.item_id] = {
        qty: 1,
        price: isPo ? 0 : 0,
      };
      return acc;
    }, {});
    setItemDetails(initialDetails);
  }, [items, isPo]);

  const handleDetailChange = (itemId, field, value) => {
    setItemDetails((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: parseFloat(value) || 0 },
    }));
  };

  const handleCreateDocument = async () => {
    if (isPo && !vendor) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบ', text: 'กรุณาเลือกผู้ขาย' });
      return;
    }
    if (items.length === 0) {
      Swal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกรายการ', text: 'กรุณาเลือกสินค้าที่ต้องการ' });
      return;
    }

    setIsSubmitting(true);
    try {
      let payload, endpoint;

      if (isPo) {
        const totalAmount = items.reduce((sum, item) => {
          const { qty, price } = itemDetails[item.item_id] || {};
          return sum + (qty || 0) * (price || 0);
        }, 0);
        payload = {
          docData: { docType: 'po', supplierId: vendor, remark, paymentTerms, shippingTerms, totalAmount },
          items: items.map((i) => ({
            itemId: i.item_id,
            qty: itemDetails[i.item_id].qty,
            price: itemDetails[i.item_id].price,
            line_total: (itemDetails[i.item_id].qty * itemDetails[i.item_id].price).toFixed(2),
          })),
        };
        endpoint = '/po/new';
      }

      if (isRfq) {
        payload = {
          docData: { docType: 'rfq', remark },
          items: items.map((i) => ({
            itemId: i.item_id,
            qty: itemDetails[i.item_id].qty,
          })),
        };
        endpoint = '/rfq/new';
      }

      const res = await axiosInstance.post(endpoint, payload);
      Swal.fire({
        icon: 'success',
        title: `สร้าง ${docType.toUpperCase()} สำเร็จ`,
        text: `เลขที่: ${res.data.doc_no}`,
      }).then(() => onClose());
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <header className={styles.modalHeader}>
          <h2>{isPo ? 'สร้างใบสั่งซื้อ (PO)' : 'สร้างใบขอราคา (RFQ)'}</h2>
          <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
        </header>

        <section className={styles.modalBody}>
          {/* แสดงผู้ขาย/เงื่อนไขเฉพาะ PO */}
          {isPo && (
            <>
              <div className={styles.formGroup}>
                <label>ผู้ขาย</label>
                <select value={vendor} onChange={(e) => setVendor(e.target.value)} disabled={suppliersLoading}>
                  <option value="">{suppliersLoading ? 'กำลังโหลด...' : 'เลือกผู้ขาย'}</option>
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>เงื่อนไขการชำระเงิน</label>
                <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>เงื่อนไขการจัดส่ง</label>
                <input type="text" value={shippingTerms} onChange={(e) => setShippingTerms(e.target.value)} />
              </div>
            </>
          )}

          <h3>รายการสินค้า</h3>
          <table className={styles.itemTable}>
            <thead>
              <tr>
                <th>รหัสสินค้า</th>
                <th>ชื่อสินค้า</th>
                <th>จำนวน</th>
                {isPo && <><th>ราคา/หน่วย</th><th>รวม</th></>}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.item_id}>
                  <td>{i.item_code}</td>
                  <td>{i.item_name}</td>
                  <td>
                    <input type="number" min="1"
                      value={itemDetails[i.item_id]?.qty || 1}
                      onChange={(e) => handleDetailChange(i.item_id, 'qty', e.target.value)} />
                  </td>
                  {isPo && (
                    <>
                      <td>
                        <input type="number" min="0"
                          value={itemDetails[i.item_id]?.price || 0}
                          onChange={(e) => handleDetailChange(i.item_id, 'price', e.target.value)} />
                      </td>
                      <td>{fmt((itemDetails[i.item_id]?.qty || 0) * (itemDetails[i.item_id]?.price || 0))}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            {isPo && (
              <tfoot>
                <tr>
                  <td colSpan="4">ยอดรวมทั้งหมด:</td>
                  <td>
                    {fmt(items.reduce((sum, i) => {
                      const q = itemDetails[i.item_id]?.qty || 0;
                      const p = itemDetails[i.item_id]?.price || 0;
                      return sum + q * p;
                    }, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>

          <div className={styles.formGroup}>
            <label>หมายเหตุ</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows="2" />
          </div>
        </section>

        <footer className={styles.modalFooter}>
          <button onClick={onClose} className={styles.secondaryButton}>ยกเลิก</button>
          <button onClick={handleCreateDocument} className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? 'กำลังสร้าง...' : 'ยืนยัน'}
          </button>
        </footer>
      </div>
    </div>
  );
};

// ───────────────────────────────────────────────
// หน้า InventoryCheckPage
export default function InventoryCheckPage() {
  const [stockItems, setStockItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);

  useEffect(() => {
    async function fetchStockItems() {
      try {
        setIsLoading(true);
        const res = await axiosInstance.get('/stock-check');
        setStockItems(res.data);
      } catch (err) {
        setError('ไม่สามารถดึงข้อมูลสินค้าคงคลังได้');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStockItems();
  }, []);

  const handleCheckboxChange = (item) => {
    setSelectedItems((prev) => {
      if (prev.find((i) => i.item_id === item.item_id)) {
        return prev.filter((i) => i.item_id !== item.item_id);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleOpenModal = (type) => {
    if (selectedItems.length === 0) {
      Swal.fire({ icon: 'warning', title: 'ยังไม่ได้เลือกสินค้า', text: 'กรุณาเลือกรายการสินค้าที่ต้องการสร้างเอกสาร' });
      return;
    }
    setModalType(type);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setSelectedItems([]);
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>ตรวจสอบสต็อก</h1>
        <p className={styles.subtitle}>ดูรายการสินค้าที่มีสต็อกต่ำกว่าจุดสั่งซื้อซ้ำ</p>
      </header>

      <section className={styles.toolbar}>
        <div className={styles.searchBar}>
          <input className={styles.input} placeholder="ค้นหา: รหัส, ชื่อสินค้า..." />
        </div>
        <div className={styles.spacer} />
        {selectedItems.length > 0 && (
          <div className={styles.actionButtons}>
            <button onClick={() => handleOpenModal('po')} className={styles.primaryButton}>
              <FaPlusCircle className={styles.buttonIcon} /> สร้าง PO
            </button>
            <button onClick={() => handleOpenModal('rfq')} className={styles.secondaryButton}>
              <FaPlusCircle className={styles.buttonIcon} /> สร้าง RFQ
            </button>
          </div>
        )}
      </section>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap} role="region" aria-label="ตารางสินค้าคงคลัง">
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}></th>
                <th>รหัสสินค้า</th>
                <th>ชื่อสินค้า</th>
                <th>สต็อกคงเหลือ</th>
                <th>หน่วย</th>
                <th>จุดสั่งซื้อซ้ำ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className={styles.empty}>กำลังโหลดข้อมูล...</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className={styles.empty} style={{ color: 'red' }}>{error}</td>
                </tr>
              )}
              {!isLoading && !error && stockItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>ไม่พบรายการสินค้า</td>
                </tr>
              ) : (
                stockItems.map((item) => (
                  <tr key={item.item_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.some((i) => i.item_id === item.item_id)}
                        onChange={() => handleCheckboxChange(item)}
                      />
                    </td>
                    <td className={styles.mono}>{item.item_code}</td>
                    <td>{item.item_name}</td>
                    <td>{item.remain}</td>
                    <td>{item.item_unit}</td>
                    <td style={{ color: item.remain <= item.reorder_point ? 'red' : 'inherit' }}>
                      {item.reorder_point}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <DocumentModal items={selectedItems} docType={modalType} onClose={handleCloseModal} />
      )}
    </main>
  );
}
