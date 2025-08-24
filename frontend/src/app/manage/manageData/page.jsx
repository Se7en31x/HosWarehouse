'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import axiosInstance from '../../utils/axiosInstance';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const Select = dynamic(() => import('react-select'), { ssr: false });

// ✅ สไตล์ react-select ให้ตรงทุกหน้า
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    minHeight: '2.5rem',
    borderColor: state.isFocused ? '#2563eb' : '#e5e7eb',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2563eb' },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    marginTop: 6,
    border: '1px solid #e5e7eb',
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f1f5ff' : '#fff',
    color: '#111827',
    padding: '8px 12px',
  }),
};

const categoryOptions = [
  { value: 'ยา', label: 'ยา' },
  { value: 'เวชภัณฑ์', label: 'เวชภัณฑ์' },
  { value: 'ครุภัณฑ์', label: 'ครุภัณฑ์' },
  { value: 'อุปกรณ์ทางการแพทย์', label: 'อุปกรณ์ทางการแพทย์' },
  { value: 'ของใช้ทั่วไป', label: 'ของใช้ทั่วไป' },
];
const unitOptions = [
  { value: 'ขวด', label: 'ขวด' },
  { value: 'แผง', label: 'แผง' },
  { value: 'ชุด', label: 'ชุด' },
  { value: 'ชิ้น', label: 'ชิ้น' },
];

/* ── Map item_status → badge class (มี fallback) ───────────────── */
const statusBadgeClass = (raw) => {
  if (!raw) return 'st-generic';
  const s = String(raw).trim().toLowerCase();

  // ไทย ↔ อังกฤษ (ครอบคลุมเคสยอดฮิตฝั่งคลัง)
  if (['พร้อมใช้', 'active', 'available', 'in stock', 'instock'].includes(s)) return 'st-ok';
  if (['ไม่พร้อมใช้', 'inactive', 'disabled', 'unavailable'].includes(s)) return 'st-inactive';
  if (['กำลังซ่อม', 'ซ่อมบำรุง', 'maintenance', 'repairing'].includes(s)) return 'st-maintenance';
  if (['ชำรุด', 'เสีย', 'damaged', 'broken'].includes(s)) return 'st-broken';

  if (['หมดสต็อก', 'out of stock', 'out_of_stock', 'oos'].includes(s)) return 'st-out';
  if (['ใกล้หมด', 'low', 'low stock', 'low_stock'].includes(s)) return 'st-low';

  if (['หมดอายุ', 'expired', 'expire'].includes(s)) return 'st-expired';
  if (['ใกล้หมดอายุ', 'near expiry', 'near_expiry'].includes(s)) return 'st-near-exp';

  if (['สงวนไว้', 'reserved', 'on hold', 'hold'].includes(s)) return 'st-reserved';
  if (['ระงับจำหน่าย', 'เลิกผลิต', 'discontinued'].includes(s)) return 'st-disc';

  if (['รอตรวจรับ', 'กำลังรับเข้า', 'incoming', 'pending_incoming'].includes(s)) return 'st-incoming';
  if (['รอคืน', 'pending_return', 'awaiting return'].includes(s)) return 'st-return';

  // fallback: สร้างคลาสปลอดภัยจากข้อความสถานะ (เผื่ออยากสไตล์เฉพาะในอนาคต)
  const slug = 'st-' + s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  return slug || 'st-generic';
};


/* ── แปลข้อความสถานะแบบง่าย (3 สถานะหลัก) ─────────── */
const translateStatusText = (status, quantity) => {
  const s = String(status || '').trim().toLowerCase();

  // 1. สถานะ 'สินค้าหมด'
  if (quantity <= 0) {
    return 'สินค้าหมด';
  }

  // 2. สถานะ 'ไม่ใช้งาน'
  if (s === 'inactive' || s === 'discontinued') {
    return 'ไม่ใช้งาน';
  }

  // 3. สถานะ 'พร้อมใช้งาน' (สถานะอื่นๆ ที่มีของ)
  return 'พร้อมใช้งาน';
};


export default function ManageDataPage() {
  const [items, setItems] = useState([]);

  // ฟิลเตอร์
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('');

  // เพจจิเนชัน
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // label หมวดหมู่
  const categoryLabels = {
    medicine: 'ยา',
    medsup: 'เวชภัณฑ์',
    equipment: 'ครุภัณฑ์',
    meddevice: 'อุปกรณ์ทางการแพทย์',
    general: 'ของใช้ทั่วไป',
  };

  const getItemCode = (item) => {
    switch (item.item_category?.toLowerCase()) {
      case 'medicine':
        return item.med_code || '-';
      case 'medsup':
        return item.medsup_code || '-';
      case 'equipment':
        return item.equip_code || '-';
      case 'meddevice':
        return item.meddevice_code || '-';
      case 'general':
        return item.gen_code || '-';
      default:
        return '-';
    }
  };

  // ไทย -> อังกฤษ เพื่อกรองหมวดหมู่
  const categoryValues = {
    ยา: 'medicine',
    เวชภัณฑ์: 'medsup',
    ครุภัณฑ์: 'equipment',
    อุปกรณ์ทางการแพทย์: 'meddevice',
    ของใช้ทั่วไป: 'general',
  };

  // ✅ ทำ options สถานะแบบไดนามิกจากข้อมูลจริง
  const statusOptions = useMemo(() => {
    const set = new Set(
      items.map((i) => (i?.item_status ?? '').toString().trim()).filter(Boolean)
    );
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map((s) => ({ value: s, label: s }));
  }, [items]);

  // กรองข้อมูล
  const filteredItems = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return items.filter((item) => {
      const matchesFilter =
        !f ||
        item.item_name?.toLowerCase().includes(f) ||
        getItemCode(item)?.toLowerCase().includes(f);

      const matchesCategory =
        !category ||
        categoryValues[category]?.toLowerCase() ===
        item.item_category?.toLowerCase();

      const matchesUnit =
        !unit || (item.item_unit ?? '').toLowerCase() === unit.toLowerCase();

      const matchesStatus =
        !status ||
        (item.item_status ?? '').toLowerCase() === status.toLowerCase();

      return matchesFilter && matchesCategory && matchesUnit && matchesStatus;
    });
  }, [items, filter, category, unit, status]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, category, unit, status]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3)
      pages.push(
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages
      );
    else
      pages.push(
        1,
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        totalPages
      );
    return pages;
  };

  const clearFilters = () => {
    setFilter('');
    setCategory('');
    setUnit('');
    setStatus('');
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'ลบรายการนี้?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (result.isConfirmed) {
      try {
        const res = await axiosInstance.delete(`/deleteItem/${id}`);
        if (res.data.success) {
          setItems((prev) => prev.filter((item) => item.item_id !== id));
          Swal.fire('ลบแล้ว!', 'รายการถูกลบเรียบร้อยแล้ว', 'success');
        } else {
          Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
      } catch {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
      }
    }
  };

  function formatThaiDateTime(dateString) {
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear() + 543).slice(-2);
    const h = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} , ${h}:${mm}`;
  }

  useEffect(() => {
    axiosInstance
      .get('/manageData')
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  }, []);

  // สำหรับ react-select portal
  const menuPortalTarget =
    typeof window !== 'undefined' ? document.body : undefined;

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>การจัดการข้อมูล</h1>
          </div>
        </div>

        {/* Toolbar — ใช้ react-select เหมือนทุกหน้า */}
        <div className={styles.toolbar}>
          <div className={`${styles.filterGrid} ${styles.filterGrid3}`}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="category">
                หมวดหมู่
              </label>
              <Select
                inputId="category"
                styles={customSelectStyles}
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                value={
                  categoryOptions.find((o) => o.value === category) || null
                }
                onChange={(opt) => setCategory(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
                menuPosition="fixed"
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="unit">
                หน่วย
              </label>
              <Select
                inputId="unit"
                styles={customSelectStyles}
                options={unitOptions}
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                value={unitOptions.find((o) => o.value === unit) || null}
                onChange={(opt) => setUnit(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
                menuPosition="fixed"
              />
            </div>

            {/* สถานะ — กระทัดรัด */}
            <div className={`${styles.filterGroup} ${styles.statusGroup}`}>
              <label className={styles.label} htmlFor="status">
                สถานะ
              </label>
              <Select
                inputId="status"
                styles={customSelectStyles}
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="ทั้งหมด"
                value={
                  status
                    ? { value: status, label: status }
                    : null
                }
                onChange={(opt) => setStatus(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
                menuPosition="fixed"
              />
            </div>
          </div>

          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label} htmlFor="filter">
                ค้นหา
              </label>
              <input
                id="filter"
                className={styles.input}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="ชื่อ, รหัส…"
              />
            </div>

            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>

            <Link
              href="/manage/addItem"
              className={styles.addButton}
              aria-label="เพิ่มข้อมูลใหม่"
            >
              <Plus size={18} /> <span>เพิ่มข้อมูลใหม่</span>
            </Link>
          </div>
        </div>

        {/* ตาราง */}
        <div className={styles.tableFrame}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>
              ลำดับ
            </div>
            <div className={styles.headerItem}>รหัสสินค้า</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>
              รูปภาพ
            </div>
            <div className={styles.headerItem}>ชื่อ</div>
            <div className={styles.headerItem}>หมวดหมู่</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={styles.headerItem}>หน่วย</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={`${styles.headerItem} ${styles.centerCell}`}>
              การจัดการ
            </div>
          </div>

          <div
            className={styles.inventory}
            style={{ '--rows-per-page': itemsPerPage }}
          >
            {currentItems.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
            ) : (
              currentItems.map((item, index) => (
                <div
                  className={`${styles.tableGrid} ${styles.tableRow}`}
                  key={item.item_id}
                >
                  <div
                    className={`${styles.tableCell} ${styles.centerCell}`}
                  >
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </div>
                  <div className={styles.tableCell}>{getItemCode(item)}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <img
                      src={
                        item.item_img
                          ? `http://localhost:5000/uploads/${item.item_img}`
                          : 'http://localhost:5000/public/defaults/landscape.png'
                      }
                      alt={item.item_name}
                      className={styles.imageCell}
                    />
                  </div>
                  <div className={styles.tableCell}>{item.item_name}</div>
                  <div className={styles.tableCell}>
                    {categoryLabels[item.item_category] ||
                      item.item_category}
                  </div>
                  <div className={styles.tableCell}>
                    {item.total_on_hand_qty}
                  </div>
                  <div className={styles.tableCell}>{item.item_unit}</div>
                  <div className={styles.tableCell}>
                    <span
                      className={`${styles.badge} ${(Number(item.total_on_hand_qty) || 0) <= 0
                          ? styles['st-out'] // ✅ บังคับสีสินค้าหมด
                          : (styles[statusBadgeClass(item.item_status)] || styles['st-generic'])
                        }`}
                      title={item.item_status || 'ไม่ทราบสถานะ'}
                    >
                      {translateStatusText(item.item_status, item.total_on_hand_qty)}
                    </span>
                  </div>
                  <div
                    className={`${styles.tableCell} ${styles.centerCell}`}
                  >
                    <Link
                      href={`/manage/manageData/${item.item_id}/editItem`}
                      className={`${styles.actionButton} ${styles.editButton}`}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </Link>
                    <button
                      className={`${styles.actionButton} ${styles.deleteButton}`}
                      onClick={() => handleDelete(item.item_id)}
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <ul className={styles.paginationControls}>
            <li>
              <button
                className={styles.pageButton}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="หน้าก่อนหน้า"
              >
                <ChevronLeft size={16} />
              </button>
            </li>
            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <li key={idx} className={styles.ellipsis}>
                  …
                </li>
              ) : (
                <li key={idx}>
                  <button
                    className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''
                      }`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                </li>
              )
            )}
            <li>
              <button
                className={styles.pageButton}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages}
                aria-label="หน้าถัดไป"
              >
                <ChevronRight size={16} />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}