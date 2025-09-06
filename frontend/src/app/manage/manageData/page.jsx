'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import { manageAxios } from '@/app/utils/axiosInstance';
import Swal from 'sweetalert2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Trash2, ChevronLeft, ChevronRight, Plus, PackageCheck } from 'lucide-react';
import { connectSocket, disconnectSocket } from '../../utils/socket';

const Select = dynamic(() => import('react-select'), { ssr: false });

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    minHeight: '2.5rem',
    borderColor: state.isFocused ? '#2563eb' : '#e5e7eb',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2563eb' },
    width: '250px',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    marginTop: 6,
    boxShadow: 'none',
    border: '1px solid #e5e7eb',
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f1f5ff' : '#fff',
    color: '#111827',
    padding: '8px 12px',
    textAlign: 'left',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af' }),
  singleValue: (base) => ({ ...base, textAlign: 'left' }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
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
  { value: 'กล่อง', label: 'กล่อง' },
  { value: 'ห่อ', label: 'ห่อ' },
];

const getStockStatus = (item) => {
  const qty = Number(item?.total_on_hand_qty ?? 0);
  const reorder = Number(item?.reorder_point ?? item?.min_qty ?? item?.reorder_level ?? 0);
  const safety = Number(item?.safety_stock ?? item?.safety_qty ?? 0);
  const stText = (item?.item_status || '').toLowerCase();

  if (stText === 'inactive' || stText === 'hold' || stText === 'พักใช้งาน') {
    return { text: 'พักใช้งาน', class: 'stHold' };
  }
  if (qty <= 0) return { text: 'หมดสต็อก', class: 'stOut' };
  if (reorder > 0 && qty <= reorder) return { text: 'ใกล้หมด', class: 'stLow' };
  if (safety > 0 && qty <= safety) return { text: 'ควรเติม', class: 'stLow' };
  return { text: 'พร้อมใช้งาน', class: 'stAvailable' };
};

const categoryLabels = {
  medicine: 'ยา',
  medsup: 'เวชภัณฑ์',
  equipment: 'ครุภัณฑ์',
  meddevice: 'อุปกรณ์ทางการแพทย์',
  general: 'ของใช้ทั่วไป',
};

const getItemCode = (item) => {
  switch (item.item_category?.toLowerCase()) {
    case 'medicine': return item.med_code || '-';
    case 'medsup': return item.medsup_code || '-';
    case 'equipment': return item.equip_code || '-';
    case 'meddevice': return item.meddevice_code || '-';
    case 'general': return item.gen_code || '-';
    default: return '-';
  }
};

export default function ManageDataPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 12; // ⬅️ ล็อค 12 แถวเสมอ

  const statusOptions = useMemo(() => {
    const set = new Set(
      items.map((i) => (i?.item_status ?? '').toString().trim()).filter(Boolean)
    );
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, 'th'))
      .map((s) => ({ value: s, label: s }));
  }, [items]);

  const filteredItems = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return items
      .filter((item) => {
        const matchesFilter =
          !f ||
          item.item_name?.toLowerCase().includes(f) ||
          getItemCode(item)?.toLowerCase().includes(f);
        const matchesCategory =
          !category ||
          categoryLabels[item.item_category?.toLowerCase()] === category;
        const matchesUnit =
          !unit || (item.item_unit ?? '').toLowerCase() === unit.toLowerCase();
        const matchesStatus =
          !status || (item.item_status ?? '').toLowerCase() === status.toLowerCase();
        return matchesFilter && matchesCategory && matchesUnit && matchesStatus;
      })
      .sort((a, b) => {
        const qtyA = Number(a?.total_on_hand_qty ?? 0);
        const qtyB = Number(b?.total_on_hand_qty ?? 0);
        if (qtyA === 0 && qtyB !== 0) return -1;
        if (qtyB === 0 && qtyA !== 0) return 1;
        if (qtyA !== qtyB) return qtyA - qtyB;
        return (a.item_name || '').localeCompare(b.item_name || '');
      });
  }, [items, filter, category, unit, status]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  // จำนวนแถวว่างเติมท้ายให้ครบหน้า
  const fillersCount = Math.max(0, itemsPerPage - (currentItems?.length || 0));

  // รีเซ็ตหน้าเมื่อฟิลเตอร์เปลี่ยน
  useEffect(() => { setCurrentPage(1); }, [filter, category, unit, status]);
  // คลัมป์หน้าปัจจุบันเมื่อจำนวนหน้าลดลง
  useEffect(() => { setCurrentPage((p) => Math.min(Math.max(1, p), totalPages)); }, [totalPages]);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
    else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '...', totalPages);
    else if (currentPage >= totalPages - 3)
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
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
        const res = await manageAxios.delete(`/deleteItem/${id}`);
        if (res.data.success) {
          Swal.fire('ลบแล้ว!', 'รายการถูกลบเรียบร้อยแล้ว', 'success');
        } else {
          Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
      } catch {
        Swal.fire('ผิดพลาด', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const res = await manageAxios.get('/manageData');
        if (isMounted) {
          setItems(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ ไม่สามารถโหลดข้อมูลได้:', err);
        if (isMounted) {
          Swal.fire('ผิดพลาด', 'ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้', 'error');
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    const socket = connectSocket();
    const handleUpdate = () => {
      if (isMounted) {
        console.log('📦 ได้รับการอัปเดตจาก Socket.IO, กำลังดึงข้อมูลใหม่...');
        fetchInitialData();
      }
    };

    socket.on('itemAdded', handleUpdate);
    socket.on('itemUpdated', handleUpdate);
    socket.on('itemLotUpdated', handleUpdate);
    socket.on('itemDeleted', handleUpdate);

    return () => {
      isMounted = false;
      socket.off('itemAdded', handleUpdate);
      socket.off('itemUpdated', handleUpdate);
      socket.off('itemLotUpdated', handleUpdate);
      socket.off('itemDeleted', handleUpdate);
      disconnectSocket();
    };
  }, []);

  const menuPortalTarget = useMemo(
    () => (typeof window !== 'undefined' ? document.body : null),
    []
  );

  // ช่วงรายการที่แสดง (info bar)
  const start = (currentPage - 1) * itemsPerPage;
  const startDisplay = filteredItems.length ? start + 1 : 0;
  const endDisplay = Math.min(start + itemsPerPage, filteredItems.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
               การจัดการข้อมูล
            </h1>
          </div>
        </div>
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
                placeholder="เลือกหมวดหมู่..."
                value={categoryOptions.find((o) => o.value === category) || null}
                onChange={(opt) => setCategory(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
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
                placeholder="เลือกหน่วย..."
                value={unitOptions.find((o) => o.value === unit) || null}
                onChange={(opt) => setUnit(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
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
                placeholder="เลือกสถานะ..."
                value={status ? { value: status, label: status } : null}
                onChange={(opt) => setStatus(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
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
                placeholder="ค้นหาด้วยชื่อ หรือรหัส..."
              />
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
            <Link
              href="/manage/manageData/addItem"
              className={`${styles.ghostBtn} ${styles.addButton}`}
              aria-label="เพิ่มข้อมูลใหม่"
            >
              <Plus size={18} /> <span>เพิ่มข้อมูลใหม่</span>
            </Link>
          </div>
        </div>
        {isLoading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>ลำดับ</div>
              <div className={styles.headerItem}>รหัส</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>รูปภาพ</div>
              <div className={styles.headerItem}>รายการ</div>
              <div className={styles.headerItem}>หมวดหมู่</div>
              <div className={styles.headerItem}>คงเหลือ</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>สถานะ</div>
              <div className={`${styles.headerItem} ${styles.centerCell}`}>การดำเนินการ</div>
            </div>

            <div
              className={styles.inventory}
              style={{ '--rows-per-page': `${itemsPerPage}` }}
            >
              {currentItems.length === 0 ? (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              ) : (
                <>
                  {currentItems.map((item, index) => (
                    <div
                      className={`${styles.tableGrid} ${styles.tableRow}`}
                      key={item.item_id}
                    >
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </div>
                      <div className={styles.tableCell}>{getItemCode(item)}</div>
                      <div className={`${styles.tableCell} ${styles.imageCell}`}>
                        <img
                          src={
                            item.item_img
                              ? String(item.item_img).startsWith('http')
                                ? item.item_img
                                : `http://localhost:5000/uploads/${item.item_img}`
                              : 'http://localhost:5000/public/defaults/landscape.png'
                          }
                          alt={item.item_name || 'ไม่มีคำอธิบายภาพ'}
                        />
                      </div>
                      <div className={styles.tableCell} title={item.item_name}>
                        {item.item_name}
                      </div>
                      <div className={styles.tableCell}>
                        {categoryLabels[item.item_category?.toLowerCase()] || item.item_category}
                      </div>
                      <div className={styles.tableCell}>
                        {item.total_on_hand_qty}
                      </div>
                      <div className={styles.tableCell}>{item.item_unit}</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <span className={`${styles.stBadge} ${styles[getStockStatus(item).class]}`}>
                          {getStockStatus(item).text}
                        </span>
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        <Link
                          href={`/manage/manageData/${item.item_id}/editItem`}
                          className={`${styles.actionButton} ${styles.editButton}`}
                          title="แก้ไข"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </Link>
                        <button
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => handleDelete(item.item_id)}
                          title="ลบ"
                        >
                          <FontAwesomeIcon icon={faTrashCan} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* เติมแถวว่างให้ครบหน้า */}
                  {Array.from({ length: fillersCount }).map((_, i) => (
                    <div
                      key={`filler-${i}`}
                      className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                      aria-hidden="true"
                    >
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.imageCell}`}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={styles.tableCell}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Info bar + Pagination */}
            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredItems.length} รายการ
              </div>
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
                    <li key={idx} className={styles.ellipsis}>…</li>
                  ) : (
                    <li key={idx}>
                      <button
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                        onClick={() => setCurrentPage(p)}
                        aria-current={p === currentPage ? 'page' : undefined}
                      >
                        {p}
                      </button>
                    </li>
                  )
                )}
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="หน้าถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
