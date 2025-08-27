'use client';

import { useEffect, useState, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { CartContext } from '../context/CartContext';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import('react-select'), { ssr: false });

import axiosInstance from '@/app/utils/axiosInstance';
import { connectSocket, disconnectSocket } from '@/app/utils/socket';

// ► Options
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

// ► Custom styles for react-select
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    minHeight: '2.5rem',
    borderColor: state.isFocused ? '#2563eb' : '#e5e7eb',
    boxShadow: 'none',
    '&:hover': { borderColor: '#2563eb' },
  }),
  menu: base => ({
    ...base,
    borderRadius: '0.5rem',
    marginTop: 6,
    border: '1px solid #e5e7eb',
    zIndex: 9000,
  }),
  menuPortal: base => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#f1f5ff' : '#fff',
    color: '#111827',
    padding: '8px 12px',
  }),
};


// ► แปลสถานะและจำนวนแบบง่าย
const translateStatus = (item) => {
  const quantity = Number(item.total_on_hand_qty ?? 0);

  // ถ้าจำนวนคงเหลือ (quantity) น้อยกว่าหรือเท่ากับ 0
  if (quantity <= 0) {
    return { text: 'หมดสต็อก', class: 'stOut' };
  }

  // ถ้ามีจำนวนคงเหลือ ก็ให้ถือว่า "พร้อมใช้งาน"
  return { text: 'พร้อมใช้งาน', class: 'stAvailable' };
};

export default function InventoryWithdraw() {
  const menuPortalTarget = useMemo(() => (typeof window !== 'undefined' ? document.body : null), []);
  const router = useRouter();
  const { addToCart, cartItems, clearCart } = useContext(CartContext);

  // ── State ───────────────────────────────
  const [actionType, setActionType] = useState('withdraw');
  const [isActionTypeLoaded, setIsActionTypeLoaded] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [minReturnDate, setMinReturnDate] = useState('');
  const [maxReturnDate, setMaxReturnDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inputQuantity, setInputQuantity] = useState(1);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('');
  const [storage, setStorage] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Effects ─────────────────────────────
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('actionType') : null;
    if (saved === 'withdraw' || saved === 'borrow') setActionType(saved);
    const today = new Date();
    setMinReturnDate(today.toISOString().split('T')[0]);
    const max = new Date();
    max.setMonth(max.getMonth() + 3);
    setMaxReturnDate(max.toISOString().split('T')[0]);
    setIsActionTypeLoaded(true);
  }, []);

  useEffect(() => {
    if (isActionTypeLoaded && typeof window !== 'undefined') {
      localStorage.setItem('actionType', actionType);
    }
  }, [actionType, isActionTypeLoaded]);

  useEffect(() => {
    if (actionType === 'borrow') {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      setReturnDate(t.toISOString().split('T')[0]);
    } else {
      setReturnDate('');
    }
  }, [actionType]);

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const res = await axiosInstance.get('/for-withdrawal');
        if (isMounted) {
          setAllItems(Array.isArray(res.data) ? res.data.filter(item => item && item.item_id) : []);
        }
      } catch (err) {
        console.error('❌ โหลด REST ไม่สำเร็จ:', err);
        toast.error('ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitialData();

    const socket = connectSocket();

    socket.on('itemsDataForWithdrawal', (data) => {
      console.log('📦 itemsDataForWithdrawal ได้รับ:', data);
      if (isMounted) {
        setAllItems(Array.isArray(data) ? data.filter(item => item && item.item_id) : []);
      }
    });

    socket.on('itemUpdated', (updatedItem) => {
      console.log('📦 itemUpdated ได้รับ:', updatedItem);
      if (!updatedItem || !updatedItem.item_id) return;
      setAllItems((prevItems) => {
        const index = prevItems.findIndex((i) => i.item_id === updatedItem.item_id);
        const updatedData = {
          ...updatedItem,
          total_on_hand_qty: updatedItem.current_stock ?? updatedItem.total_on_hand_qty ?? 0,
          item_img: updatedItem.item_img || updatedItem.item_img_url || null,
          is_borrowable: updatedItem.is_borrowable ?? false,
          item_status: updatedItem.item_status || 'active'
        };
        if (index !== -1) {
          const newItems = [...prevItems];
          newItems[index] = { ...newItems[index], ...updatedData };
          return newItems;
        } else {
          return [...prevItems, updatedData];
        }
      });
    });

    return () => {
      isMounted = false;
      socket.off('itemsDataForWithdrawal');
      socket.off('itemUpdated');
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, category, unit, storage]);

  // ── Helpers ─────────────────────────────
  function ItemImage({ item_img, alt }) {
    const defaultImg = 'http://localhost:5000/public/defaults/landscape.png';
    const [img, setImg] = useState(item_img ? `http://localhost:5000/uploads/${item_img}` : defaultImg);
    return (
      <Image
        src={img}
        alt={alt || 'ไม่มีชื่อ'}
        width={45}
        height={45}
        style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
        onError={() => setImg(defaultImg)}
        loading="lazy"
        unoptimized
      />
    );
  }

  const translateCategory = (cat) => {
    switch (cat) {
      case 'medicine': return 'ยา';
      case 'medsup': return 'เวชภัณฑ์';
      case 'equipment': return 'ครุภัณฑ์';
      case 'meddevice': return 'อุปกรณ์ทางการแพทย์';
      case 'general': return 'ของใช้ทั่วไป';
      default: return cat || 'ไม่ระบุ';
    }
  };

  const getItemCode = (item) => {
    if (!item) return '-';
    switch (item.item_category) {
      case 'medicine': return item.med_code || '-';
      case 'medsup': return item.medsup_code || '-';
      case 'equipment': return item.equip_code || '-';
      case 'meddevice': return item.meddevice_code || '-';
      case 'general': return item.gen_code || '-';
      default: return '-';
    }
  };

  const filteredItems = useMemo(() => {
    const f = filter.toLowerCase().trim();
    const norm = (v) => (v != null ? String(v).toLowerCase().includes(f) : false);

    return allItems.filter((item) => {
      if (!item || !item.item_id || item.is_deleted) return false;
      if (item.item_status !== 'active') return false;

      const isBorrowableCheck = actionType === 'borrow' ? item.is_borrowable : true;
      if (!isBorrowableCheck) return false;

      const mc = category ? translateCategory(item.item_category) === category : true;
      const mu = unit ? item.item_unit === unit : true;
      const ms = storage ? item.item_location === storage : true;
      const mt = filter
        ? norm(item.item_name) ||
        norm(item.item_id) ||
        norm(item.item_number) ||
        norm(getItemCode(item)) ||
        norm(translateCategory(item.item_category)) ||
        norm(item.item_unit) ||
        norm(translateStatus(item.item_status, item.total_on_hand_qty)) ||
        norm(item.item_location)
        : true;
      return mc && mu && ms && mt;
    });
  }, [allItems, category, unit, storage, filter, actionType]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  // ── Handlers ─────────────────────────────
  const handleChangeActionType = (t) => {
    if (t === actionType) return;
    if (cartItems.length > 0) {
      Swal.fire({
        title: 'รายการในตะกร้าจะหาย',
        text: 'คุณต้องการเปลี่ยนประเภทหรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่',
        cancelButtonText: 'ไม่',
      }).then((r) => {
        if (r.isConfirmed) {
          clearCart();
          setActionType(t);
          toast.info('ล้างตะกร้าแล้ว');
        }
      });
    } else {
      setActionType(t);
    }
  };

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((c) => c - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((c) => c + 1);
  };

  const clearFilters = () => {
    setFilter('');
    setCategory('');
    setUnit('');
    setStorage('');
    setCurrentPage(1);
  };

  const handleWithdraw = (item) => {
    setSelectedItem(item);
    setInputQuantity(1);
    setShowModal(true);
  };

  // const handleBorrow = (item) => {
  //   setSelectedItem(item);
  //   setInputQuantity(1);
  //   setShowModal(true);
  // };

  const handleBorrow = async (item) => {
    try {
      // ✅ เรียก API ไป backend เพื่อตรวจสอบว่ายืมค้างหรือไม่
      const response = await axiosInstance.get(`/check-pending-borrow/${item.item_id}`);

      if (response.data.pending) {
        // 🚫 มีการยืมค้าง → แจ้งเตือนผู้ใช้
        Swal.fire({
          title: "ไม่สามารถยืมได้",
          text: "คุณมีการยืมค้างอยู่ กรุณาคืนสินค้าก่อนทำรายการใหม่",
          icon: "error",
          confirmButtonText: "ตกลง",
        });
        return; // หยุดการทำงาน
      }

      // ✅ ไม่มีการยืมค้าง → เปิด modal กรอกจำนวน
      setSelectedItem(item);
      setInputQuantity(1);
      setShowModal(true);

    } catch (error) {
      console.error("❌ ตรวจสอบการยืมล้มเหลว:", error);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถตรวจสอบสถานะการยืมได้",
        icon: "error",
        confirmButtonText: "ตกลง",
      });
    }
  };


  const handleConfirm = async () => {
    if (!inputQuantity || inputQuantity <= 0) {
      toast.error('กรุณากรอกจำนวนให้ถูกต้อง');
      return;
    }
    if (!selectedItem) {
      toast.error('ไม่พบสินค้า');
      return;
    }
    if (inputQuantity > (selectedItem.total_on_hand_qty ?? 0)) {
      toast.error('จำนวนไม่เพียงพอ');
      return;
    }
    if (actionType === 'borrow' && !returnDate) {
      toast.error('กรุณาเลือกวันที่คืน');
      return;
    }

    try {
      addToCart({
        id: selectedItem.item_id,
        item_img: selectedItem.item_img ? `http://localhost:5000/uploads/${selectedItem.item_img}` : '/defaults/landscape.png',
        number: selectedItem.item_number || '-',
        code: getItemCode(selectedItem),
        name: selectedItem.item_name || 'ไม่ระบุ',
        quantity: inputQuantity,
        unit: selectedItem.item_unit || '-',
        type: selectedItem.item_category || '-',
        location: selectedItem.item_location || '-',
        action: actionType,
        returnDate: actionType === 'borrow' ? returnDate : null,
        item_qty: selectedItem.total_on_hand_qty ?? 0,
        is_borrowable: selectedItem.is_borrowable ?? false,
      });
      toast.success('เพิ่มเข้าตะกร้าแล้ว');
      closeModal();
    } catch (error) {
      console.error('❌ เพิ่มเข้าตะกร้าล้มเหลว:', error);
      toast.error('ไม่สามารถเพิ่มสินค้าเข้าตะกร้าได้');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setInputQuantity(1);
    setReturnDate(actionType === 'borrow' ? new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] : '');
  };

  // ===== Pagination =====
  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        // ต้น ๆ
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // ท้าย ๆ
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // กลาง
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };


  // ── Render ─────────────────────────────────
  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>เบิก-ยืม</h1>
            <div className={styles.typeSwitch} role="group" aria-label="เลือกประเภท">
              <button
                type="button"
                className={`${styles.switch2} ${actionType === 'borrow' ? styles.isBorrow : styles.isWithdraw}`}
                onClick={() => handleChangeActionType(actionType === 'withdraw' ? 'borrow' : 'withdraw')}
                aria-pressed={actionType === 'borrow'}
                aria-label={actionType === 'withdraw' ? 'สลับเป็นยืม' : 'สลับเป็นเบิก'}
              >
                <span className={styles.switch2LabelLeft}>เบิก</span>
                <span className={styles.switch2LabelRight}>ยืม</span>
                <span className={styles.switch2Thumb} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>หมวดหมู่</label>
              <Select
                inputId="category"
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={categoryOptions.find((o) => o.value === category) || null}
                onChange={(opt) => setCategory(opt?.value || '')}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>หน่วย</label>
              <Select
                inputId="unit"
                options={unitOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหน่วย..."
                styles={customSelectStyles}
                value={unitOptions.find((o) => o.value === unit) || null}
                onChange={(opt) => setUnit(opt?.value || '')}
                menuPlacement="auto"
                menuPosition="fixed"
                menuPortalTarget={menuPortalTarget}
              />
            </div>
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label htmlFor="filter" className={styles.label}>ค้นหา</label>
              <input
                id="filter"
                className={styles.input}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="ชื่อ,รหัส,..."
              />
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={clearFilters}
              aria-label="ล้างตัวกรอง"
              title="ล้างตัวกรอง"
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <p>กำลังโหลดข้อมูลสินค้า...</p>
          </div>
        ) : (
          <div className={styles.tableFrame}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>รหัส</div>
              <div className={styles.headerItem}>รูปภาพ</div>
              <div className={styles.headerItem}>ชื่อ</div>
              <div className={styles.headerItem}>หมวดหมู่</div>
              <div className={styles.headerItem}>จำนวน</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>สถานะ</div>
              <div className={styles.headerItem}>การดำเนินการ</div>
            </div>
            <div className={styles.inventory} style={{ '--rows-per-page': itemsPerPage }}>
              {currentItems.length > 0 ? (
                currentItems.map((item, i) => (
                  item && (
                    <div key={item.item_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {i + 1 + (currentPage - 1) * itemsPerPage}
                      </div>
                      <div className={styles.tableCell}>{getItemCode(item)}</div>
                      <div className={`${styles.tableCell} ${styles.imageCell}`}>
                        <ItemImage item_img={item.item_img} alt={item.item_name} />
                      </div>
                      <div className={styles.tableCell}>{item.item_name || 'ไม่ระบุ'}</div>
                      <div className={styles.tableCell}>{translateCategory(item.item_category)}</div>
                      <div className={styles.tableCell}>{item.total_on_hand_qty ?? 0}</div>
                      <div className={styles.tableCell}>{item.item_unit || '-'}</div>
                      <div className={styles.tableCell}>
                        {(() => {
                          const status = translateStatus(item);
                          return (
                            <span className={`${styles.stBadge} ${styles[status.class]}`}>
                              {status.text}
                            </span>
                          );
                        })()}
                      </div>
                      <div className={`${styles.tableCell} ${styles.centerCell}`}>
                        {actionType === 'withdraw' ? (
                          <button
                            className={`${styles.actionButton} ${styles.withdrawButton}`}
                            onClick={() => handleWithdraw(item)}
                            disabled={item.total_on_hand_qty == null || item.total_on_hand_qty <= 0}
                            title={item.total_on_hand_qty == null || item.total_on_hand_qty <= 0 ? 'สต็อกหมด' : 'เบิก'}
                          >
                            เบิก
                          </button>
                        ) : (
                          <button
                            className={`${styles.actionButton} ${styles.borrowButton}`}
                            onClick={() => handleBorrow(item)}
                            disabled={!item.is_borrowable || item.total_on_hand_qty == null || item.total_on_hand_qty <= 0}
                            title={
                              item.total_on_hand_qty == null || item.total_on_hand_qty <= 0
                                ? 'สต็อกหมด'
                                : !item.is_borrowable
                                  ? 'ไม่สามารถยืมได้'
                                  : 'ยืม'
                            }
                          >
                            ยืม
                          </button>
                        )}
                      </div>
                    </div>
                  )
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูลตามเงื่อนไข</div>
              )}
            </div>
            <ul className={styles.paginationControls}>
              <li>
                <button
                  className={styles.pageButton}
                  onClick={handlePrev}
                  disabled={currentPage === 1}
                  aria-label="หน้าก่อนหน้า"
                >
                  <ChevronLeft size={16} />
                </button>
              </li>
              {getPageNumbers().map((p, idx) => (
                p === '...' ? (
                  <li key={idx} className={styles.ellipsis}>
                    …
                  </li>
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
              ))}
              <li>
                <button
                  className={styles.pageButton}
                  onClick={handleNext}
                  disabled={currentPage >= totalPages}
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight size={16} />
                </button>
              </li>
            </ul>
          </div>
        )}

        {/* Modal */}
        {showModal && selectedItem && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal} role="dialog" aria-labelledby="modalTitle" aria-modal="true">
              <h2 id="modalTitle" className={styles.modalTitle}>
                ทำรายการ {actionType === 'withdraw' ? 'เบิก' : 'ยืม'}
              </h2>
              <div className={styles.modalContentRow}>
                <ItemImage item_img={selectedItem.item_img} alt={selectedItem.item_name} />
                <div className={styles.modalDetails}>
                  <div>
                    <strong>ชื่อ:</strong> {selectedItem.item_name || 'ไม่ระบุ'}
                  </div>
                  <div>
                    <strong>รหัส:</strong> {getItemCode(selectedItem)}
                  </div>
                  <div>
                    <strong>หมวดหมู่:</strong> {translateCategory(selectedItem.item_category)}
                  </div>
                  <div>
                    <strong>คงเหลือ:</strong> {selectedItem.total_on_hand_qty ?? 0} {selectedItem.item_unit || '-'}
                  </div>
                </div>
              </div>
              <div className={styles.modalForm}>
                <label htmlFor="quantity" className={styles.label}>
                  จำนวนที่ต้องการ
                </label>
                <input
                  id="quantity"
                  type="number"
                  className={styles.input}
                  value={inputQuantity}
                  min={1}
                  max={selectedItem.total_on_hand_qty ?? 0}
                  onChange={(e) => setInputQuantity(Number(e.target.value) || 1)}
                  aria-describedby="quantity-error"
                />
                {actionType === 'borrow' && (
                  <>
                    <label htmlFor="returnDate" className={styles.label}>
                      วันที่คืน
                    </label>
                    <input
                      id="returnDate"
                      type="date"
                      className={styles.input}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      min={minReturnDate}
                      max={maxReturnDate}
                      aria-describedby="returnDate-error"
                    />
                  </>
                )}
              </div>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.actionButton} ${styles.successBtn}`}
                  onClick={handleConfirm}
                  aria-label="บันทึกรายการ"
                >
                  บันทึก
                </button>
                <button
                  className={`${styles.actionButton} ${styles.dangerBtnOutline}`}
                  onClick={closeModal}
                  aria-label="ยกเลิกรายการ"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}