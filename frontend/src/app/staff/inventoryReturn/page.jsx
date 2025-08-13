'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import Select from 'react-select';

// ► ตั้งค่าให้ใช้ข้อมูลจำลอง (ปิด socket ชั่วคราว)
const USE_MOCK = true;

// ► ตัวเลือกสถานะสำหรับ dropdown (react-select)
const statusOptions = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'borrowing', label: 'กำลังยืม' },
  { value: 'overdue', label: 'เกินกำหนด' },
  { value: 'returned', label: 'คืนแล้ว' },
];

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.4rem',
    minHeight: '2.5rem',
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px #3b82f6' : 'none',
    '&:hover': { borderColor: '#3b82f6' },
  }),
  menu: (base) => ({ ...base, borderRadius: '0.4rem', marginTop: 4 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f3f4f6' : '#fff',
    color: '#374151',
    padding: '8px 12px',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af' }),
  clearIndicator: (base) => ({ ...base, padding: 4 }),
  dropdownIndicator: (base) => ({ ...base, padding: 4 }),
};

// ====== ฟังก์ชันช่วยสร้าง Mock Data ======
const mockRecords = () => ([
  {
    record_id: 1,
    request_code: 'REQ-0001',
    item_id: 'EQP-001',
    item_name: 'เครื่องวัดความดัน',
    item_img: '', // ทดสอบ fallback
    borrower_name: 'สมชาย ใจดี',
    borrow_qty: 2,
    remaining_qty: 1,
    item_unit: 'เครื่อง',
    item_category: 'equipment',
    due_date: '2025-08-10', // เกินกำหนด (สมมติวันนี้ 2025-08-13)
    status: 'borrowing',
  },
  {
    record_id: 2,
    request_code: 'REQ-0002',
    item_id: 'MSP-002',
    item_name: 'หน้ากากอนามัย',
    item_img: 'mask.jpg',
    borrower_name: 'สมหญิง สายใจ',
    borrow_qty: 100,
    remaining_qty: 0,
    item_unit: 'ชิ้น',
    item_category: 'medsup',
    due_date: '2025-08-05',
    status: 'returned',
  },
  {
    record_id: 3,
    request_code: 'REQ-0003',
    item_id: 'GEN-001',
    item_name: 'น้ำยาล้างมือ',
    item_img: 'handwash.jpg',
    borrower_name: 'อดุลย์ คำสุข',
    borrow_qty: 5,
    remaining_qty: 3,
    item_unit: 'ขวด',
    item_category: 'general',
    due_date: '2025-08-15', // ยังไม่เกินกำหนด
    status: 'borrowing',
  },
  {
    record_id: 4,
    request_code: 'REQ-0004',
    item_id: 'MDV-003',
    item_name: 'ปรอทวัดไข้',
    item_img: '',
    borrower_name: 'นงนุช ใจงาม',
    borrow_qty: 10,
    remaining_qty: 10,
    item_unit: 'แท่ง',
    item_category: 'meddevice',
    due_date: '2025-08-01', // เกินกำหนด
    status: 'borrowing',
  },
  {
    record_id: 5,
    request_code: 'REQ-0005',
    item_id: 'MED-010',
    item_name: 'พาราเซตามอล 500mg',
    item_img: 'para.jpg',
    borrower_name: 'กิตติ ทองแท้',
    borrow_qty: 20,
    remaining_qty: 5,
    item_unit: 'เม็ด',
    item_category: 'medicine',
    due_date: '2025-08-20', // กำลังยืม
    status: 'borrowing',
  },
  {
    record_id: 6,
    request_code: 'REQ-0006',
    item_id: 'EQP-022',
    item_name: 'เครื่องปั่นเหวี่ยง',
    item_img: '',
    borrower_name: 'วนิษา สุขใจ',
    borrow_qty: 1,
    remaining_qty: 0,
    item_unit: 'เครื่อง',
    item_category: 'equipment',
    due_date: '2025-08-08',
    status: 'returned',
  },
  {
    record_id: 7,
    request_code: 'REQ-0007',
    item_id: 'GEN-009',
    item_name: 'ถุงมือยาง',
    item_img: 'glove.jpg',
    borrower_name: 'ดลฤดี ชื่นจิต',
    borrow_qty: 50,
    remaining_qty: 12,
    item_unit: 'คู่',
    item_category: 'general',
    due_date: '2025-08-09', // เกินกำหนด
    status: 'borrowing',
  },
  {
    record_id: 8,
    request_code: 'REQ-0008',
    item_id: 'MDV-111',
    item_name: 'เครื่องวัดออกซิเจนปลายนิ้ว',
    item_img: '',
    borrower_name: 'ชยุตม์ แก้วคำ',
    borrow_qty: 3,
    remaining_qty: 1,
    item_unit: 'เครื่อง',
    item_category: 'meddevice',
    due_date: '2025-08-18', // กำลังยืม
    status: 'borrowing',
  },
]);

export default function InventoryReturn() {
  const router = useRouter();
  const socketRef = useRef(null);

  // --- State ---
  const [records, setRecords] = useState([]); // รายการยืมที่ดึงมาจาก server หรือ mock
  const [filter, setFilter] = useState(''); // ค้นหา text
  const [status, setStatus] = useState(''); // กรองสถานะ
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal คืนของ
  const [showModal, setShowModal] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null); // บรรทัดที่เลือก
  const [returnQty, setReturnQty] = useState(1);
  const [condition, setCondition] = useState('ปกติ'); // ปกติ | ชำรุด
  const [note, setNote] = useState('');

  // --- Effects ---
  useEffect(() => {
    if (USE_MOCK) {
      // ใช้ข้อมูลจำลองแทน socket
      setRecords(mockRecords());
      return;
    }

    // websocket (ใช้จริง)
    socketRef.current = io('http://localhost:5000');
    socketRef.current.on('connect', () => {
      socketRef.current.emit('requestBorrowRecords');
    });

    socketRef.current.on('borrowRecords', (rows) => {
      const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
      setRecords(list);
    });

    socketRef.current.on('returnSuccess', (payload) => {
      toast.success('บันทึกการคืนสำเร็จ');
      setRecords((prev) =>
        prev.map((r) => {
          if (r.record_id === payload.recordId) {
            const remaining = Math.max(0, (r.remaining_qty ?? 0) - payload.quantity);
            return {
              ...r,
              remaining_qty: remaining,
              status: remaining === 0 ? 'returned' : (isOverdue(r.due_date) ? 'overdue' : 'borrowing'),
              last_update: new Date().toISOString(),
            };
          }
          return r;
        }),
      );
      closeModal();
    });

    socketRef.current.on('returnError', (msg) => {
      toast.error(msg || 'บันทึกการคืนไม่สำเร็จ');
    });

    return () => socketRef.current?.disconnect();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [filter, status]);

  // --- Helpers ---
  const ItemImage = ({ src, alt }) => {
    const fallback = 'http://localhost:5000/public/defaults/landscape.png';
    const [img, setImg] = useState(src || fallback);
    return (
      <Image
        src={img}
        alt={alt}
        width={70}
        height={70}
        style={{ objectFit: 'cover' }}
        onError={() => setImg(fallback)}
        loading="lazy"
        unoptimized
      />
    );
  };

  const translateCategory = (cat) => {
    switch (cat) {
      case 'medicine': return 'ยา';
      case 'medsup': return 'เวชภัณฑ์';
      case 'equipment': return 'ครุภัณฑ์';
      case 'meddevice': return 'อุปกรณ์ทางการแพทย์';
      case 'general': return 'ของใช้ทั่วไป';
      default: return cat || '-';
    }
  };

  const formatDate = (d) => {
    try { return d ? new Date(d).toLocaleDateString() : '-'; } catch { return '-'; }
  };

  const daysDiff = (due) => {
    if (!due) return 0;
    const dueDate = new Date(due);
    const today = new Date();
    [dueDate, today].forEach((x) => x.setHours(0, 0, 0, 0));
    const ms = today - dueDate;
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };

  const isOverdue = (due) => daysDiff(due) > 0;

  const badgeForStatus = (rec) => {
    const st = rec.status || '';
    const overdueFlag = isOverdue(rec.due_date) && (rec.remaining_qty ?? 0) > 0;
    const label = overdueFlag ? 'เกินกำหนด' : (st === 'returned' ? 'คืนแล้ว' : 'กำลังยืม');
    const cls = overdueFlag
      ? styles.statusPendingDeduction
      : st === 'returned'
        ? styles.statusCompleted
        : styles.statusPartial;
    return <span className={`${styles.statusBadge} ${cls}`}>{label}</span>;
  };

  // --- Filtering ---
  const filtered = useMemo(() => {
    const f = filter.toLowerCase();
    const match = (v) => (v != null ? String(v).toLowerCase().includes(f) : false);
    return records.filter((r) => {
      const byStatus = status
        ? (status === 'overdue'
            ? isOverdue(r.due_date) && (r.remaining_qty ?? 0) > 0
            : (r.status === status))
        : true;
      const byText = filter
        ? match(r.request_code) ||
          match(r.borrower_name) ||
          match(r.item_name) ||
          match(r.item_id) ||
          match(translateCategory(r.item_category))
        : true;
      return byStatus && byText;
    });
  }, [records, status, filter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // --- Handlers ---
  const openReturnModal = (rec) => {
    const remaining = Number(rec.remaining_qty ?? rec.borrow_qty ?? 0);
    setSelectedRec(rec);
    setReturnQty(Math.max(1, Math.min(remaining, 1)));
    setCondition('ปกติ');
    setNote('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedRec(null);
    setReturnQty(1);
    setCondition('ปกติ');
    setNote('');
  };

  const confirmReturn = () => {
    if (!selectedRec) { toast.error('ไม่พบรายการ'); return; }
    const remaining = Number(selectedRec.remaining_qty ?? 0);
    if (!returnQty || returnQty <= 0) { toast.error('กรุณาระบุจำนวนที่ถูกต้อง'); return; }
    if (returnQty > remaining) { toast.error('จำนวนเกินจำนวนที่ยังไม่คืน'); return; }

    if (USE_MOCK) {
      // อัปเดตสถานะในฝั่ง UI เลย (จำลองผลลัพธ์จาก backend)
      const payload = {
        recordId: selectedRec.record_id,
        itemId: selectedRec.item_id,
        quantity: returnQty,
        note,
        condition,
      };
      setRecords((prev) =>
        prev.map((r) => {
          if (r.record_id === payload.recordId) {
            const newRemain = Math.max(0, (r.remaining_qty ?? 0) - payload.quantity);
            return {
              ...r,
              remaining_qty: newRemain,
              status: newRemain === 0 ? 'returned' : (isOverdue(r.due_date) ? 'overdue' : 'borrowing'),
              last_update: new Date().toISOString(),
            };
          }
          return r;
        }),
      );
      toast.success('บันทึกการคืนสำเร็จ (mock)');
      closeModal();
      return;
    }

    // โหมดใช้งานจริง → ส่งผ่าน socket
    const payload = {
      recordId: selectedRec.record_id,
      itemId: selectedRec.item_id,
      quantity: returnQty,
      note,
      condition,
    };

    try {
      socketRef.current?.emit('returnRequest', payload);
    } catch (e) {
      toast.error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
    }
  };

  const clearFilters = () => {
    setFilter('');
    setStatus('');
    setCurrentPage(1);
  };

  // --- Render ---
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.cardHeader}>
          <h1>คืนอุปกรณ์/วัสดุ</h1>
        </div>

        {/* Modal */}
        {showModal && selectedRec && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <h2 className={styles.modalTitle}>ยืนยันการคืน</h2>
              <div className={styles.modalContentRow}>
                <ItemImage
                  src={selectedRec.item_img ? `http://localhost:5000/uploads/${selectedRec.item_img}` : undefined}
                  alt={selectedRec.item_name}
                />
                <div className={styles.modalDetails}>
                  <div><strong>ชื่อ:</strong> {selectedRec.item_name}</div>
                  <div><strong>ผู้ยืม:</strong> {selectedRec.borrower_name || '-'}</div>
                  <div><strong>จำนวนคงค้างคืน:</strong> {selectedRec.remaining_qty} {selectedRec.item_unit}</div>
                  <div>
                    <strong>ครบกำหนด:</strong> {formatDate(selectedRec.due_date)}
                    {isOverdue(selectedRec.due_date) ? ` (เลยมา ${daysDiff(selectedRec.due_date)} วัน)` : ''}
                  </div>
                </div>
              </div>

              <div className={styles.modalForm}>
                <label htmlFor="qty">จำนวนที่จะคืน</label>
                <input
                  id="qty"
                  type="number"
                  className={styles.modalInput}
                  value={returnQty}
                  min={1}
                  max={Number(selectedRec.remaining_qty ?? 0)}
                  onChange={(e) => setReturnQty(Number(e.target.value))}
                />

                <label htmlFor="condition">สภาพ</label>
                <select
                  id="condition"
                  className={styles.modalInput}
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <option value="ปกติ">ปกติ</option>
                  <option value="ชำรุด">ชำรุด</option>
                </select>

                <label htmlFor="note">หมายเหตุ</label>
                <textarea
                  id="note"
                  className={styles.modalInput}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น กล่องบุบ, อุปกรณ์รอยขีดข่วน ฯลฯ"
                  rows={3}
                />
              </div>

              <div className={styles.modalActions}>
                <button className={styles.modalConfirm} onClick={confirmReturn}>บันทึก</button>
                <button className={styles.modalCancel} onClick={closeModal}>ยกเลิก</button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filterControls}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>สถานะ:</label>
              <Select
                inputId="status"
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานะ..."
                styles={customSelectStyles}
                value={statusOptions.find((o) => o.value === status) || null}
                onChange={(opt) => setStatus(opt?.value || '')}
              />
            </div>
          </div>
          <div className={styles.searchControls}>
            <div className={styles.searchGroup}>
              <label className={styles.filterLabel} htmlFor="filter">ค้นหา:</label>
              <input
                id="filter"
                className={styles.searchInput}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="รหัสคำขอ / ผู้ยืม / ชื่อวัสดุ"
              />
            </div>
            <button
              className={styles.clearButton}
              onClick={clearFilters}
              aria-label="ล้างตัวกรอง"
              title="ล้างตัวกรอง"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>

        {/* Table Header */}
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div className={styles.headerItem}>ลำดับ</div>
          <div className={styles.headerItem}>รหัสคำขอ</div>
          <div className={styles.headerItem}>รูปภาพ</div>
          <div className={styles.headerItem}>ชื่อวัสดุ</div>
          <div className={styles.headerItem}>ผู้ยืม</div>
          <div className={styles.headerItem}>ยืม</div>
          <div className={styles.headerItem}>ยังไม่คืน</div>
          <div className={styles.headerItem}>หน่วย</div>
          <div className={styles.headerItem}>ครบกำหนด</div>
          <div className={styles.headerItem}>สถานะ</div>
          <div className={styles.headerItem}>จัดการ</div>
        </div>

        {/* Table Rows */}
        <div className={styles.inventory}>
          {currentItems.length > 0 ? (
            currentItems.map((r, i) => (
              <div key={r.record_id || `${r.request_code}-${i}`} className={`${styles.tableGrid} ${styles.tableRow}`}>
                <div className={styles.tableCell}>{i + 1 + (currentPage - 1) * itemsPerPage}</div>
                <div className={styles.tableCell}>{r.request_code || '-'}</div>
                <div className={`${styles.tableCell} ${styles.imageCell}`}>
                  <ItemImage
                    src={r.item_img ? `http://localhost:5000/uploads/${r.item_img}` : undefined}
                    alt={r.item_name}
                  />
                </div>
                <div className={styles.tableCell}>{r.item_name || '-'}</div>
                <div className={styles.tableCell}>{r.borrower_name || '-'}</div>
                <div className={styles.tableCell}>{r.borrow_qty ?? '-'}</div>
                <div className={styles.tableCell}>{r.remaining_qty ?? '-'}</div>
                <div className={styles.tableCell}>{r.item_unit || '-'}</div>
                <div className={styles.tableCell}>
                  {formatDate(r.due_date)}{' '}
                  {(r.remaining_qty ?? 0) > 0 && isOverdue(r.due_date) ? (
                    <small style={{ color: '#dc2626' }}>(+{daysDiff(r.due_date)} วัน)</small>
                  ) : null}
                </div>
                <div className={styles.tableCell}>{badgeForStatus(r)}</div>
                <div className={`${styles.tableCell} ${styles.centerCell}`}>
                  <button
                    className={styles.actionButton}
                    disabled={(r.remaining_qty ?? 0) <= 0}
                    onClick={() => openReturnModal(r)}
                  >
                    คืน
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', width: '100%' }}>
              ไม่พบข้อมูลตามเงื่อนไข
            </div>
          )}
        </div>

        {/* Pagination */}
        <ul className={styles.paginationControls}>
          <li>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
          </li>

          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <li key={idx} className={styles.ellipsis}>…</li>
            ) : (
              <li key={idx}>
                <button
                  className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              </li>
            ),
          )}

          <li>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
