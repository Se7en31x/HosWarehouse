'use client';

import { useEffect, useState, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { CartContext } from '../context/CartContext';
import { toast } from 'react-toastify';
import Image from 'next/image';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight, Trash2, PackageCheck } from 'lucide-react';
import dynamic from 'next/dynamic';

const Select = dynamic(() => import('react-select'), { ssr: false });

import { staffAxios } from '../../utils/axiosInstance';
import { connectSocket, disconnectSocket } from '../../utils/socket';

// Options
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

// Custom Select Styles (ปรับสีให้เหมือน InventoryCheck)
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: '0.5rem',
    minHeight: '2.5rem',
    borderColor: state.isFocused ? '#2563eb' : '#e5e7eb', // ใช้สีน้ำเงิน #2563eb จาก InventoryCheck
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
    backgroundColor: state.isFocused ? '#eff6ff' : '#fff', // ใช้ #eff6ff สำหรับ hover
    color: '#111827',
    padding: '8px 12px',
    textAlign: 'left',
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af' }),
  singleValue: (base) => ({ ...base, textAlign: 'left' }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

// Stock Status Logic
const getStockStatus = (item) => {
  const qty = Number(item?.total_on_hand_qty ?? 0);
  const stText = (item?.item_status || '').toLowerCase();

  if (stText === 'inactive' || stText === 'hold' || stText === 'พักใช้งาน') {
    return { text: 'พักใช้งาน', class: 'stHold' };
  }
  if (qty <= 0) return { text: 'หมดสต็อก', class: 'stOut' };
  return { text: 'พร้อมใช้งาน', class: 'stAvailable' };
};

// Item Image Component
function ItemImage({ item_img, alt }) {
  const defaultImg = "http://localhost:5000/public/defaults/landscape.png";

  // ✅ ตรวจว่าเป็น URL เต็ม (http/https) หรือแค่ชื่อไฟล์
  const initialSrc = item_img
    ? (item_img.startsWith("http") 
        ? item_img 
        : `http://localhost:5000/uploads/${item_img}`)
    : defaultImg;

  const [imgSrc, setImgSrc] = useState(initialSrc);

  return (
    <Image
      src={imgSrc}
      alt={alt || "ไม่มีชื่อ"}
      width={50}
      height={50}
      style={{ objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }}
      onError={() => setImgSrc(defaultImg)} // ถ้ารูปแตก ใช้ default
      loading="lazy"
      unoptimized
    />
  );
}

export default function InventoryCheckWithWithdraw() {
  const router = useRouter();
  const { addToCart, cartItems, clearCart } = useContext(CartContext);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [allItems, setAllItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionType, setActionType] = useState('withdraw');
  const [isActionTypeLoaded, setIsActionTypeLoaded] = useState(false);
  const [returnDate, setReturnDate] = useState('');
  const [minReturnDate, setMinReturnDate] = useState('');
  const [maxReturnDate, setMaxReturnDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [inputQuantity, setInputQuantity] = useState(1);

  const ITEMS_PER_PAGE = 12;

  const menuPortalTarget = useMemo(
    () => (typeof window !== 'undefined' ? document.body : null),
    []
  );

  const categoryThaiMap = {
    medicine: 'ยา',
    medsup: 'เวชภัณฑ์',
    equipment: 'ครุภัณฑ์',
    meddevice: 'อุปกรณ์ทางการแพทย์',
    general: 'ของใช้ทั่วไป',
  };

  const getItemCode = (item) => {
    if (!item) return '-';
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

  // Initialize Action Type and Date Constraints
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

  // Fetch Data and Subscribe to WebSocket
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const res = await staffAxios.get('/for-withdrawal');
        console.log("📥 API Response (for-withdrawal):", res.data); // ✅ debug data ที่ได้
        if (isMounted) {
          setAllItems(Array.isArray(res.data) ? res.data.filter(item => item && item.item_id) : []);
          setIsLoading(false); // ✅ อย่าลืม set loading false
        }
      } catch (err) {
        console.error('❌ โหลดข้อมูลเริ่มต้นไม่สำเร็จ:', err.response?.data || err.message);
        toast.error('ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้');
        if (isMounted) setIsLoading(false);
      }
    };


    fetchInitialData();

    const socket = connectSocket();

    socket.on('itemsUpdated', (data) => {
      console.log('📦 itemsUpdated ได้รับ:', data);
      if (isMounted) {
        setAllItems(Array.isArray(data) ? data.filter(item => item && item.item_id && !item.is_deleted) : []);
      }
    });

    socket.on('itemLotUpdated', (updatedLot) => {
      console.log('📦 itemLotUpdated ได้รับ:', updatedLot);
      if (!updatedLot || !updatedLot.item_id) return;
      setAllItems((prevItems) =>
        prevItems.map((item) =>
          item.item_id === updatedLot.item_id
            ? { ...item, total_on_hand_qty: updatedLot.new_total_qty ?? item.total_on_hand_qty }
            : item
        )
      );
    });

    socket.on('itemAdded', () => {
      if (isMounted) fetchInitialData();
    });
    socket.on('itemUpdated', () => {
      if (isMounted) fetchInitialData();
    });
    socket.on('itemDeleted', () => {
      if (isMounted) fetchInitialData();
    });

    return () => {
      isMounted = false;
      socket.off('itemsUpdated');
      socket.off('itemLotUpdated');
      socket.off('itemAdded');
      socket.off('itemUpdated');
      socket.off('itemDeleted');
      disconnectSocket();
    };
  }, []);

  // Reset Page on Filter Change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedCategory, selectedUnit]);

  // Filter and Sort Inventory
  const filteredInventory = useMemo(() => {
    const f = searchText.toLowerCase().trim();
    let items = allItems.filter((item) => {
      const itemThaiCategory =
        categoryThaiMap[item.item_category?.toLowerCase()] || item.item_category;
      const matchCategory = selectedCategory ? itemThaiCategory === selectedCategory : true;
      const matchUnit = selectedUnit ? item.item_unit === selectedUnit : true;
      const isBorrowableCheck = actionType === 'borrow' ? item.is_borrowable : true;
      const matchSearchText = searchText
        ? (item.item_name || '').toLowerCase().includes(f) ||
        (getItemCode(item) || '').toLowerCase().includes(f)
        : true;
      return matchCategory && matchUnit && matchSearchText && item.item_status === 'active' && isBorrowableCheck;
    });

    items.sort((a, b) => {
      const qtyA = Number(a?.total_on_hand_qty ?? 0);
      const qtyB = Number(b?.total_on_hand_qty ?? 0);

      if (qtyA === 0 && qtyB !== 0) return -1;
      if (qtyB === 0 && qtyA !== 0) return 1;
      if (qtyA !== qtyB) return qtyA - qtyB;
      return (a.item_name || '').localeCompare(b.item_name || '');
    });

    return items;
  }, [allItems, selectedCategory, selectedUnit, searchText, actionType]);

  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredInventory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInventory, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  // Handlers
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

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredInventory.length && setCurrentPage((c) => c + 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedCategory('');
    setSelectedUnit('');
    setCurrentPage(1);
  };

  const handleWithdraw = (item) => {
    setSelectedItem(item);
    setInputQuantity(1);
    setShowModal(true);
  };

  const handleBorrow = async (item) => {
    try {
      const response = await staffAxios.get(`/check-pending-borrow/${item.item_id}`);
      if (response.data.pending) {
        Swal.fire({
          title: 'ไม่สามารถยืมได้',
          text: 'คุณมีการยืมสินค้าชิ้นนี้ค้างอยู่ กรุณาคืนสินค้าก่อนทำรายการใหม่',
          icon: 'error',
          confirmButtonText: 'ตกลง',
        });
        return;
      }
      setSelectedItem(item);
      setInputQuantity(1);
      setShowModal(true);
    } catch (error) {
      console.error('❌ ตรวจสอบการยืมล้มเหลว:', error);
      Swal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถตรวจสอบสถานะการยืมได้',
        icon: 'error',
        confirmButtonText: 'ตกลง',
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
        item_img: selectedItem.item_img,
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReturnDate(actionType === 'borrow' ? tomorrow.toISOString().split('T')[0] : '');
  };

  const formatDateTime = (d) => {
    try {
      return d
        ? new Date(d).toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
        : '-';
    } catch {
      return '-';
    }
  };

  const startDisplay = filteredInventory.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredInventory.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              ตรวจสอบและเบิก-ยืม
            </h1>
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

        <div className={styles.toolbar}>
          {/* ฝั่งซ้าย: หมวดหมู่ + หน่วย */}
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>หมวดหมู่</label>
              <Select
                options={categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={selectedCategory ? categoryOptions.find((o) => o.value === selectedCategory) : null}
                onChange={(opt) => setSelectedCategory(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.label}>หน่วย</label>
              <Select
                options={unitOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหน่วย..."
                styles={customSelectStyles}
                value={selectedUnit ? unitOptions.find((o) => o.value === selectedUnit) : null}
                onChange={(opt) => setSelectedUnit(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
          </div>

          {/* ฝั่งขวา: ค้นหา + ปุ่มล้างตัวกรอง */}
          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <input
                className={styles.input}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ค้นหาด้วยรายการ หรือรหัส..."
              />
            </div>

            <button
              onClick={clearFilters}
              className={`${styles.ghostBtn} ${styles.clearButton}`}
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>


        {isLoading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>รหัส</div>
              <div className={styles.headerItem}>รูปภาพ</div>
              <div className={styles.headerItem}>รายการ</div>
              <div className={styles.headerItem}>หมวดหมู่</div>
              <div className={styles.headerItem}>คงเหลือ</div>
              <div className={styles.headerItem}>หน่วย</div>
              <div className={styles.headerItem}>สถานะ</div>
              <div className={styles.headerItem}>การดำเนินการ</div>
            </div>

            <div className={styles.inventory} style={{ '--rows-per-page': `${ITEMS_PER_PAGE}` }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <div key={item.item_id ?? `${getItemCode(item)}-${index}`} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </div>
                    <div className={styles.tableCell}>{getItemCode(item)}</div>
                    <div className={`${styles.tableCell} ${styles.imageCell}`}>
                      <ItemImage item_img={item.item_img} alt={item.item_name} />
                    </div>
                    <div className={styles.tableCell} title={item.item_name}>
                      {item.item_name}
                    </div>
                    <div className={styles.tableCell}>
                      {categoryThaiMap[item.item_category?.toLowerCase()] || item.item_category}
                    </div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.total_on_hand_qty}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{item.item_unit}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(() => {
                        const st = getStockStatus(item);
                        return (
                          <span className={`${styles.stBadge} ${styles[st.class]}`}>
                            {st.text}
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
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {Array.from({ length: paginatedItems.length > 0 ? fillersCount : 0 }).map((_, i) => (
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
                  <div className={styles.tableCell}>&nbsp;</div>
                </div>
              ))}
            </div>

            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredInventory.length} รายการ
              </div>
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    aria-label="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, idx) =>
                  p === '...' ? (
                    <li key={`ellipsis-${idx}`} className={styles.ellipsis}>
                      …
                    </li>
                  ) : (
                    <li key={`page-${p}`}>
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
                    onClick={goToNextPage}
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
                    <strong>หมวดหมู่:</strong> {categoryThaiMap[selectedItem.item_category?.toLowerCase()] || selectedItem.item_category}
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