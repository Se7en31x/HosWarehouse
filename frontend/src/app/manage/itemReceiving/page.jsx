'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus,
  Save,
  RotateCcw,
  Package,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
  Info,
  User,
  Hash,
  Box,
  Repeat,
  Tag,
  Calendar,
  FileText,
  Notebook,
} from 'lucide-react';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { manageAxios } from '@/app/utils/axiosInstance';
import dynamic from 'next/dynamic';
import { connectSocket, disconnectSocket } from '@/app/utils/socket';

const MySwal = withReactContent(Swal);
const Select = dynamic(() => import('react-select'), { ssr: false });

// ---- Configuration ----
const PAGE_CONFIG = {
  title: 'รับเข้าสินค้า',
  icon: Package,
  apiEndpoint: '/receiving',
  barcodeEndpoint: '/receiving/barcode?barcode=',
  socketEvents: ['itemLotUpdated'],
  itemsPerPage: 12, // ⬅️ ล็อค 12 แถวต่อหน้า
  columns: [
    { key: 'name', label: 'รายการ' },
    { key: 'category', label: 'หมวดหมู่' },
    { key: 'unit', label: 'หน่วย', center: true },
    { key: 'min', label: 'ขั้นต่ำ', center: true },
    { key: 'max', label: 'สูงสุด', center: true },
    { key: 'stock', label: 'คงเหลือ', center: true },
    { key: 'action', label: 'การดำเนินการ', center: true },
  ],
  categoryOptions: [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'medicine', label: 'ยา' },
    { value: 'medsup', label: 'เวชภัณฑ์' },
    { value: 'equipment', label: 'ครุภัณฑ์' },
    { value: 'meddevice', label: 'อุปกรณ์การแพทย์' },
    { value: 'general', label: 'ทั่วไป' },
  ],
  formFields: [
    {
      key: 'sourceName',
      label: 'ผู้ส่งมอบ / ผู้บริจาค',
      type: 'text',
      placeholder: 'เช่น บริษัท ABC',
      icon: User,
    },
    {
      key: 'purchaseQuantity',
      label: 'จำนวนที่รับเข้า (หน่วยสั่งซื้อ)',
      type: 'number',
      placeholder: '0',
      min: 0,
      step: 0.01,
      icon: Hash,
      helperText: 'ระบุจำนวนในหน่วยสั่งซื้อ เช่น 10 กล่อง',
    },
    {
      key: 'purchaseUnit',
      label: 'หน่วยสั่งซื้อ',
      type: 'text',
      disabled: true,
      icon: Box,
    },
    {
      key: 'conversionRate',
      label: 'อัตราส่วนแปลง',
      type: 'number',
      placeholder: '0',
      min: 0,
      step: 0.01,
      icon: Repeat,
      helperText: 'เช่น 1 กล่อง = 100 ชิ้น',
    },
    {
      key: 'itemQuantity',
      label: 'จำนวนในหน่วยเบิกใช้',
      type: 'text',
      disabled: true,
      icon: Package,
    },
    {
      key: 'lotNo',
      label: 'Lot No.',
      type: 'text',
      placeholder: 'เช่น LOT123 หรือเว้นว่าง',
      icon: Tag,
    },
    {
      key: 'expiryDate',
      label: 'วันหมดอายุ',
      type: 'date',
      icon: Calendar,
      helperText: 'ต้องเป็นวันที่ในอนาคตสำหรับยาและเวชภัณฑ์',
    },
    {
      key: 'mfgDate',
      label: 'วันผลิต',
      type: 'date',
      icon: Calendar,
    },
    {
      key: 'documentNo',
      label: 'เลขที่เอกสาร',
      type: 'text',
      placeholder: 'เช่น INV-001',
      icon: FileText,
    },
    {
      key: 'notes',
      label: 'บันทึก / อ้างอิง',
      type: 'textarea',
      placeholder: 'ระบุบันทึกเพิ่มเติม (ถ้ามี)',
      maxLength: 500,
      icon: Notebook,
    },
  ],
};

// ---- Utility Functions ----
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const mapCategoryToThai = (category) => {
  switch (category?.toLowerCase()) {
    case 'medicine': return 'ยา';
    case 'medsup': return 'เวชภัณฑ์';
    case 'equipment': return 'ครุภัณฑ์';
    case 'meddevice': return 'อุปกรณ์การแพทย์';
    case 'general': return 'ทั่วไป';
    default: return category || '-';
  }
};

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

// ---- Main Component ----
export default function ItemReceivingPage() {
  const [allItems, setAllItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    sourceName: '',
    purchaseQuantity: '',
    purchaseUnit: '', // ⬅️ ให้สอดคล้องกับ formFields
    conversionRate: '',
    itemQuantity: '',
    lotNo: '',
    expiryDate: '',
    mfgDate: '',
    documentNo: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const qtyInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const menuPortalTarget = useMemo(() => (typeof window !== 'undefined' ? document.body : null), []);

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await manageAxios.get(PAGE_CONFIG.apiEndpoint);
      if (Array.isArray(res.data)) {
        setAllItems(res.data.filter(Boolean));
      }
    } catch (err) {
      setError('โหลดข้อมูลไม่สำเร็จ');
      MySwal.fire({ title: 'ผิดพลาด', text: 'โหลดข้อมูลไม่สำเร็จ', icon: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Socket and initial fetch
  useEffect(() => {
    let isMounted = true;
    fetchItems();

    const socket = connectSocket();
    const handleUpdate = (updatedLot) => {
      if (!updatedLot || !updatedLot.item_id || !isMounted) return;
      setAllItems((prevItems) =>
        prevItems.map((item) =>
          item.item_id === updatedLot.item_id
            ? { ...item, current_stock: updatedLot.new_total_qty ?? item.current_stock }
            : item
        )
      );
    };

    PAGE_CONFIG.socketEvents.forEach((event) => socket.on(event, handleUpdate));

    return () => {
      isMounted = false;
      PAGE_CONFIG.socketEvents.forEach((event) => socket.off(event, handleUpdate));
      disconnectSocket();
    };
  }, [fetchItems]);

  // Calculate item quantity
  const debouncedCalculateQuantity = useCallback(
    debounce((pq, cr) => {
      const purchaseQty = parseFloat(pq);
      const convRate = parseFloat(cr);
      if (!isNaN(purchaseQty) && !isNaN(convRate) && purchaseQty > 0 && convRate > 0) {
        setFormData((prev) => ({ ...prev, itemQuantity: Math.floor(purchaseQty * convRate) }));
      } else {
        setFormData((prev) => ({ ...prev, itemQuantity: '' }));
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedCalculateQuantity(formData.purchaseQuantity, formData.conversionRate);
  }, [formData.purchaseQuantity, formData.conversionRate, debouncedCalculateQuantity]);

  // Handle item selection
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setFormData({
      sourceName: '',
      purchaseQuantity: '',
      purchaseUnit: item.item_purchase_unit || '', // ⬅️ ปรับให้ตรง key
      conversionRate: item.item_conversion_rate || '',
      itemQuantity: '',
      lotNo: '',
      expiryDate: '',
      mfgDate: '',
      documentNo: '',
      notes: '',
    });
    setFormErrors({});
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  // Handle barcode search
  const handleSearchEnter = async (e) => {
    const isEnter = e.key === 'Enter' || e.key === 'Tab' || e.code === 'NumpadEnter' || e.keyCode === 13;
    if (isEnter && searchTerm.trim() !== '') {
      try {
        const res = await manageAxios.get(`${PAGE_CONFIG.barcodeEndpoint}${searchTerm.trim()}`);
        if (res.data) {
          handleSelectItem(res.data);
          MySwal.fire({
            title: 'พบสินค้า',
            text: res.data.item_name,
            icon: 'success',
            timer: 1000,
            showConfirmButton: false,
          });
          setSearchTerm('');
        }
      } catch (err) {
        MySwal.fire({
          title: 'ไม่พบสินค้า',
          text: 'ไม่พบสินค้าจากบาร์โค้ดที่ระบุ',
          icon: 'warning',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!selectedItem) errors.selectedItem = 'กรุณาเลือกสินค้า';
    if (!formData.purchaseQuantity || parseFloat(formData.purchaseQuantity) <= 0 || isNaN(parseFloat(formData.purchaseQuantity)))
      errors.purchaseQuantity = 'กรุณาใส่จำนวน (หน่วยสั่งซื้อ)';
    if (!formData.conversionRate || parseFloat(formData.conversionRate) <= 0 || isNaN(parseFloat(formData.conversionRate)))
      errors.conversionRate = 'กรุณาใส่อัตราส่วนที่ถูกต้อง';
    if (['ยา', 'เวชภัณฑ์'].includes(mapCategoryToThai(selectedItem?.item_category))) {
      if (!formData.expiryDate) errors.expiryDate = 'กรุณาใส่วันหมดอายุ';
      else {
        const today = new Date();
        const expDate = new Date(formData.expiryDate);
        if (expDate < today) errors.expiryDate = 'วันหมดอายุต้องไม่เป็นอดีต';
      }
    }
    return errors;
  };

  // Save item
  const handleAddItem = async () => {
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      MySwal.fire({
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        icon: 'warning',
      });
      return;
    }

    const result = await MySwal.fire({
      title: 'ยืนยันการบันทึก',
      text: `บันทึกรายการรับเข้า ${selectedItem.item_name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    const newItem = {
      item_id: selectedItem.item_id,
      name: selectedItem.item_name,
      purchaseQuantity: parseFloat(formData.purchaseQuantity),
      purchaseUnit: formData.purchaseUnit, // ⬅️ ใช้ key ที่ถูกต้อง
      conversionRate: parseFloat(formData.conversionRate),
      quantity: parseFloat(formData.itemQuantity) || 0,
      unit: selectedItem?.item_unit,
      expiryDate: formData.expiryDate || null,
      notes: formData.notes?.trim() || null,
      lotNo: formData.lotNo?.trim() || null,
      mfgDate: formData.mfgDate || null,
      documentNo: formData.documentNo?.trim() || null,
    };

    try {
      const payload = {
        user_id: 1,
        import_type: 'general',
        source_name: formData.sourceName?.trim() || null,  // ⬅️ อ้างอิงจาก formData
        receiving_note: formData.notes?.trim() || null,    // ⬅️ อ้างอิงจาก formData
        receivingItems: [newItem],
      };

      await manageAxios.post(PAGE_CONFIG.apiEndpoint, payload);
      MySwal.fire({ title: 'บันทึกสำเร็จ', icon: 'success' });
      handleClearForm();
    } catch (err) {
      console.error('❌ Save error:', err);
      MySwal.fire({
        title: 'บันทึกไม่สำเร็จ',
        text: err.response?.data?.message || 'เกิดข้อผิดพลาด',
        icon: 'error',
      });
    }
  };

  // Clear form
  const handleClearForm = () => {
    setSelectedItem(null);
    setFormData({
      sourceName: '',
      purchaseQuantity: '',
      purchaseUnit: '',
      conversionRate: '',
      itemQuantity: '',
      lotNo: '',
      expiryDate: '',
      mfgDate: '',
      documentNo: '',
      notes: '',
    });
    setFormErrors({});
    setSearchTerm('');
    setCategoryFilter('all');
    setCurrentPage(1);
    searchInputRef.current?.focus();
  };

  // Filter & Search
  const filteredItems = useMemo(() => {
    return allItems
      .filter((item) => {
        const matchesSearch =
          (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.item_barcode || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || item.item_category?.toLowerCase() === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const stockA = Number(a.current_stock ?? 0);
        const stockB = Number(b.current_stock ?? 0);
        const minA = Number(a.item_min ?? 0);
        const minB = Number(b.item_min ?? 0);
        if (stockA < minA && stockB >= minB) return -1;
        if (stockB < minB && stockA >= minA) return 1;
        return (a.item_name || '').localeCompare(b.item_name || '');
      });
  }, [allItems, searchTerm, categoryFilter]);

  // Pagination
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_CONFIG.itemsPerPage;
    return filteredItems.slice(start, start + PAGE_CONFIG.itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_CONFIG.itemsPerPage));
  const fillersCount = Math.max(0, PAGE_CONFIG.itemsPerPage - (currentItems?.length || 0)); // ⬅️ แถวว่างที่ต้องเติม

  // รีเซ็ตหน้าเมื่อฟิลเตอร์/ค้นหาเปลี่ยน
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  // คลัมป์หน้าปัจจุบันเมื่อจำนวนหน้าลดลง
  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

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

  // ช่วงแถวที่แสดง (info bar)
  const start = (currentPage - 1) * PAGE_CONFIG.itemsPerPage;
  const startDisplay = filteredItems.length ? start + 1 : 0;
  const endDisplay = Math.min(start + PAGE_CONFIG.itemsPerPage, filteredItems.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        {/* Header */}
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
               {PAGE_CONFIG.title}
            </h1>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>หมวดหมู่</label>
              <Select
                options={PAGE_CONFIG.categoryOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกหมวดหมู่..."
                styles={customSelectStyles}
                value={PAGE_CONFIG.categoryOptions.find((o) => o.value === categoryFilter) || null}
                onChange={(opt) => setCategoryFilter(opt?.value || 'all')}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ค้นหา</label>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="ค้นหาหรือสแกนบาร์โค้ด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearchEnter}
                />
              </div>
            </div>
          </div>
          <div className={styles.searchCluster}>
            <button onClick={handleClearForm} className={`${styles.ghostBtn} ${styles.clearButton}`}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection} role="region" aria-label="ตารางสินค้า">
          <div className={`${styles.tableGridItems} ${styles.tableHeader}`}>
            {PAGE_CONFIG.columns.map((col) => (
              <div
                key={col.key}
                className={`${styles.headerItem} ${col.center ? styles.centerCell : ''}`}
              >
                {col.label}
              </div>
            ))}
          </div>

          <div
            className={styles.inventory}
            style={{ '--rows-per-page': `${PAGE_CONFIG.itemsPerPage}` }}
          >
            {error ? (
              <div className={styles.errorContainer}>
                <span>{error}</span>
                <button onClick={fetchItems} className={styles.retryButton}>
                  ลองใหม่
                </button>
              </div>
            ) : isLoading ? (
              <div className={styles.loadingContainer}>
                <span>กำลังโหลดข้อมูล...</span>
              </div>
            ) : currentItems.length === 0 ? (
              <div className={styles.noDataMessage}>ไม่พบสินค้า</div>
            ) : (
              <>
                {currentItems.map((item) => (
                  <div key={item.item_id} className={`${styles.tableGridItems} ${styles.tableRow}`} role="row">
                    {PAGE_CONFIG.columns.map((col) => (
                      <div
                        key={col.key}
                        className={`${styles.tableCell} ${col.center ? styles.centerCell : ''}`}
                        role="cell"
                      >
                        {(() => {
                          switch (col.key) {
                            case 'name':
                              return <span title={item.item_name}>{item.item_name}</span>;
                            case 'category':
                              return mapCategoryToThai(item.item_category);
                            case 'unit':
                              return item.item_unit || '-';
                            case 'min':
                              return item.item_min ?? '-';
                            case 'max':
                              return item.item_max ?? '-';
                            case 'stock':
                              return item.current_stock < item.item_min ? (
                                <span className={styles.lowStock}>{item.current_stock ?? 0} 🔻 ต่ำกว่ากำหนด</span>
                              ) : (
                                <span>{item.current_stock ?? 0}</span>
                              );
                            case 'action':
                              return (
                                <button
                                  className={styles.actionButton}
                                  onClick={() => handleSelectItem(item)}
                                  aria-label={`เลือกสินค้า ${item.item_name}`}
                                >
                                  เลือก
                                </button>
                              );
                            default:
                              return '-';
                          }
                        })()}
                      </div>
                    ))}
                  </div>
                ))}

                {/* เติมแถวว่างให้ครบ 12 แถวเสมอ */}
                {Array.from({ length: fillersCount }).map((_, i) => (
                  <div
                    key={`filler-${i}`}
                    className={`${styles.tableGridItems} ${styles.tableRow} ${styles.fillerRow}`}
                    aria-hidden="true"
                  >
                    {PAGE_CONFIG.columns.map((col, idx) => (
                      <div
                        key={idx}
                        className={`${styles.tableCell} ${col.center ? styles.centerCell : ''}`}
                      >
                        &nbsp;
                      </div>
                    ))}
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
            {totalPages > 1 && (
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    aria-label="ไปยังหน้าที่แล้ว"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <li key={`ellipsis-${i}`} className={styles.ellipsis}>…</li>
                  ) : (
                    <li key={`page-${p}-${i}`}>
                      <button
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                        onClick={() => setCurrentPage(p)}
                        aria-label={`ไปยังหน้า ${p}`}
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
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    aria-label="ไปยังหน้าถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Form Section */}
        <div className={`${styles.tableSection} ${selectedItem ? styles.formActive : ''}`}>
          <h2 className={styles.subTitle}>
            <Plus size={18} /> เพิ่มรายการรับเข้า: {selectedItem?.item_name || 'โปรดเลือกสินค้า'}
          </h2>
          <div className={styles.formContainer}>
            <div className={styles.formGrid}>
              {PAGE_CONFIG.formFields.map((field) => (
                <div key={field.key} className={`${styles.formField} ${formErrors[field.key] ? styles.fieldError : ''}`}>
                  <label className={styles.label}>
                    {field.label}
                    {field.key === 'notes' && (
                      <span className={styles.charCount}>
                        {formData.notes.length}/{field.maxLength}
                      </span>
                    )}
                    {field.helperText && (
                      <span className={styles.helperIcon} title={field.helperText}>
                        <Info size={14} />
                      </span>
                    )}
                  </label>
                  <div className={styles.inputWrapper}>
                    {field.icon && <field.icon size={18} className={styles.inputIcon} />}
                    {field.type === 'textarea' ? (
                      <textarea
                        className={styles.notesField}
                        value={formData[field.key] ?? ''}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        disabled={!selectedItem || field.disabled}
                        placeholder={field.placeholder}
                        maxLength={field.maxLength}
                        aria-label={field.label}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={field.key === 'itemQuantity'
                          ? (formData[field.key] ? `${formData[field.key]} ${selectedItem?.item_unit || ''}` : '')
                          : formData[field.key]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        disabled={!selectedItem || field.disabled}
                        placeholder={field.placeholder}
                        min={field.min}
                        step={field.step}
                        max={field.type === 'date' && field.key === 'mfgDate' ? new Date().toISOString().split('T')[0] : undefined}
                        className={styles.formInput}
                        ref={field.key === 'purchaseQuantity' ? qtyInputRef : null}
                        aria-label={field.label}
                      />
                    )}
                  </div>
                  {formErrors[field.key] && <p className={styles.errorText}>{formErrors[field.key]}</p>}
                  {field.helperText && !formErrors[field.key] && (
                    <p className={styles.helperText}>{field.helperText}</p>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.formActions}>
              <button className={styles.ghostBtn} onClick={handleClearForm} aria-label="ล้างฟอร์ม">
                <RotateCcw size={16} /> ล้างฟอร์ม
              </button>
              <button
                className={styles.addItemButton}
                onClick={handleAddItem}
                disabled={!selectedItem}
                aria-label="บันทึกรายการรับเข้า"
              >
                <Save size={16} /> บันทึก
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
