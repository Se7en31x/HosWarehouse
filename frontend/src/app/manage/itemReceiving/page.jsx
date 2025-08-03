"use client";

import { useState, useEffect, useRef } from 'react';
import { Scan, Plus, Save, RotateCcw, Trash2, Search, Package, ListChecks } from 'lucide-react';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import axiosInstance from '@/app/utils/axiosInstance';

const MySwal = withReactContent(Swal);

export default function ItemReceivingPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [receivingItems, setReceivingItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [allItems, setAllItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    
    const [formErrors, setFormErrors] = useState({});

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(allItems.length / itemsPerPage);

    // เพิ่ม state สำหรับ Vendor Item Code
    const [quantity, setQuantity] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [vendorItemCode, setVendorItemCode] = useState('');

    // *** ส่วนที่ถูกปรับปรุง: useRef เพื่ออ้างอิงช่องค้นหา ***
    const searchFieldRef = useRef(null);

    useEffect(() => {
        fetchItems();
    }, []);

    // *** ส่วนที่ถูกปรับปรุง: useEffect เพื่อ auto-focus และ auto-search ***
    useEffect(() => {
        // ให้ช่องค้นหามีการ focus ทันทีที่หน้าจอโหลด
        if (searchFieldRef.current) {
            searchFieldRef.current.focus();
        }
    }, [isLoading]);

    useEffect(() => {
        // เมื่อมีผลลัพธ์การค้นหาเพียง 1 รายการ ให้เลือกอัตโนมัติ
        if (filteredItems.length === 1) {
            handleSelectItem(filteredItems[0]);
        }
    }, [filteredItems]);

    const fetchItems = async () => {
        setIsLoading(true);
        try {
            const response = await axiosInstance.get('/receiving');
            setAllItems(response.data);
            setFilteredItems([]);
        } catch (error) {
            console.error("Failed to fetch items:", error);
            setAllItems([]);
            MySwal.fire({
                title: 'เกิดข้อผิดพลาด!',
                text: 'ไม่สามารถดึงข้อมูลสินค้าได้',
                icon: 'error',
                confirmButtonColor: '#d33',
                confirmButtonText: 'ตกลง',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSearch = async (term) => {
        if (term.length > 0) {
            setIsLoadingSearch(true);
            try {
                if (!isNaN(term) && term.length > 5) {
                    const response = await axiosInstance.get(`/receiving/barcode?barcode=${term}`);
                    setFilteredItems(response.data ? [response.data] : []);
                } else {
                    const filtered = allItems.filter(item =>
                        item.item_name.toLowerCase().includes(term.toLowerCase()) ||
                        (item.item_barcode && item.item_barcode.includes(term))
                    );
                    setFilteredItems(filtered);
                }
            } catch (error) {
                console.error("Search failed:", error);
                setFilteredItems([]);
            } finally {
                setIsLoadingSearch(false);
            }
        } else {
            setFilteredItems([]);
        }
    };

    const handleFormChange = (e, setter) => {
        setter(e.target.value);
    };

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        setSearchTerm('');
        setFilteredItems([]);
        setFormErrors({});
        setVendorItemCode(item.vendor_item_code || '');
    };

    const validateForm = () => {
        const errors = {};
        if (!selectedItem) {
            errors.selectedItem = "กรุณาเลือกสินค้า";
        }
        
        if (!quantity) {
            errors.quantity = "กรุณาใส่จำนวน";
        } else if (isNaN(quantity) || parseFloat(quantity) <= 0) {
            errors.quantity = "ต้องเป็นตัวเลขมากกว่า 0";
        }

        if (!pricePerUnit) {
            errors.pricePerUnit = "กรุณาใส่ราคา";
        } else if (isNaN(pricePerUnit) || parseFloat(pricePerUnit) < 0) {
            errors.pricePerUnit = "ต้องเป็นตัวเลขที่ไม่ติดลบ";
        }

        if (!expiryDate) {
            errors.expiryDate = "กรุณาใส่วันหมดอายุ";
        }
        return errors;
    };

    const handleAddItem = () => {
        const errors = validateForm();
        setFormErrors(errors);

        if (Object.keys(errors).length > 0) {
            MySwal.fire({
                title: 'ข้อมูลไม่ครบถ้วน!',
                html: 'กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน:<br/>' +
                    Object.values(errors).map(err => `&bull; ${err}`).join('<br/>'),
                icon: 'warning',
                confirmButtonColor: '#ff9800',
                confirmButtonText: 'ตกลง',
            });
            return;
        }

        const newItem = {
            ...selectedItem,
            id: selectedItem.item_id,
            name: selectedItem.item_name,
            quantity: parseInt(quantity, 10),
            pricePerUnit: parseFloat(pricePerUnit),
            expiryDate: expiryDate,
            notes: notes,
            tempId: Date.now(),
            vendor_item_code: vendorItemCode,
        };

        setReceivingItems([...receivingItems, newItem]);
        handleClearForm();
    };

    const handleRemoveItem = (tempId) => {
        setReceivingItems(receivingItems.filter(item => item.tempId !== tempId));
    };

    const handleClearForm = () => {
        setSelectedItem(null);
        setQuantity('');
        setPricePerUnit('');
        setExpiryDate('');
        setNotes('');
        setSearchTerm('');
        setFilteredItems([]);
        setFormErrors({});
        setVendorItemCode('');
        setCurrentPage(1);
        if (searchFieldRef.current) {
            searchFieldRef.current.focus();
        }
    };

    const handleSaveItems = () => {
        if (receivingItems.length === 0) {
            MySwal.fire({
                title: 'ไม่สามารถบันทึกได้',
                text: 'ไม่พบรายการสินค้าที่ต้องบันทึก',
                icon: 'warning',
                confirmButtonColor: '#ff9800',
                confirmButtonText: 'ตกลง',
            });
            return;
        }
    
        MySwal.fire({
            title: 'ยืนยันการบันทึก',
            html: `คุณต้องการบันทึกการรับเข้าสินค้า <b>${receivingItems.length}</b> รายการใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2e7d32',
            cancelButtonColor: '#d33',
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก',
        }).then((result) => {
            if (result.isConfirmed) {
                handleConfirmSave();
            }
        });
    };
    
    const handleConfirmSave = async () => {
        const payload = {
            user_id: 1,
            supplier_id: null,
            receiving_note: notes,
            receivingItems: receivingItems.map(item => ({
                item_id: item.id,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                expiryDate: item.expiryDate,
                notes: item.notes,
                vendor_item_code: item.vendor_item_code,
            })),
        };

        try {
            await axiosInstance.post('/receiving', payload);
            
            MySwal.fire({
                title: 'บันทึกสำเร็จ!',
                text: 'บันทึกการรับเข้าสินค้าเรียบร้อยแล้ว',
                icon: 'success',
                confirmButtonColor: '#2e7d32',
                confirmButtonText: 'ตกลง',
            });
            
            setReceivingItems([]);
            handleClearForm();
        } catch (error) {
            console.error("Error saving items:", error);
            MySwal.fire({
                title: 'เกิดข้อผิดพลาด!',
                text: 'ไม่สามารถบันทึกการรับเข้าสินค้าได้',
                icon: 'error',
                confirmButtonColor: '#d33',
                confirmButtonText: 'ตกลง',
            });
        }
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = allItems.slice(indexOfFirstItem, indexOfLastItem);
    const totalItemsInTable = allItems.length;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.mainCard}>
                <div className={styles.header}>
                    <h1>หน้าจอรับเข้าสินค้า</h1>
                    <p>จัดการการรับเข้าสินค้าสำหรับคลังพัสดุ</p>
                </div>
                <div className={styles.contentWrapper}>
                    <div className={styles.sider}>
                        <div className={styles.searchSection}>
                            <div className={styles.searchBoxContainer}>
                                <Search className={styles.searchIconPrefix} />
                                <input
                                    type="text"
                                    className={styles.searchField}
                                    placeholder="ค้นหาสินค้าด้วยชื่อหรือ Barcode..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                    }}
                                    // *** ส่วนที่ถูกปรับปรุง: useRef และ onKeyDown ***
                                    ref={searchFieldRef}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && searchTerm) {
                                            handleSearch(searchTerm);
                                        }
                                    }}
                                />
                                <button className={styles.scanButton}>
                                    <Scan size={20} />
                                </button>
                            </div>
                            {searchTerm && (
                                <div className={styles.searchResults}>
                                    {isLoadingSearch ? (
                                        <div className={styles.loadingMessage}>กำลังค้นหา...</div>
                                    ) : filteredItems.length > 0 ? (
                                        filteredItems.map(item => (
                                            <div key={item.item_id} className={styles.searchItem} onClick={() => handleSelectItem(item)}>
                                                {item.item_name}
                                            </div>
                                        ))
                                    ) : (
                                        <div className={styles.emptyMessage}>ไม่พบผลลัพธ์</div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className={styles.tableSection}>
                            <h2 className={styles.tableHeader}>
                                <Package size={20} className={styles.headerIcon} />
                                รายการสินค้าทั้งหมด
                            </h2>
                            <div className={styles.tableWrapper}>
                                <table className={styles.itemTable}>
                                    <thead>
                                        <tr>
                                            <th>ชื่อสินค้า</th>
                                            <th>Barcode</th>
                                            <th className={styles.textRight}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="3" className={styles.emptyMessage}>
                                                    กำลังโหลดข้อมูลสินค้า...
                                                </td>
                                            </tr>
                                        ) : totalItemsInTable > 0 ? (
                                            currentItems.map(item => (
                                                <tr key={item.item_id}>
                                                    <td className={styles.itemName}>{item.item_name}</td>
                                                    <td>{item.item_barcode || '-'}</td>
                                                    <td className={styles.textRight}>
                                                        <button
                                                            className={styles.selectItemButton}
                                                            onClick={() => handleSelectItem(item)}
                                                        >
                                                            เลือก
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className={styles.emptyMessage}>
                                                    ไม่พบรายการสินค้า
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {totalItemsInTable > itemsPerPage && (
                            <div className={styles.paginationControls}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={styles.pageButton}
                                >
                                    ก่อนหน้า
                                </button>
                                <span>หน้า {currentPage} จาก {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={styles.pageButton}
                                >
                                    ถัดไป
                                </button>
                            </div>
                        )}
                    </div>

                    <div className={styles.mainContent}>
                        <div id="receiving-form" className={styles.detailsFormSection}>
                            <h2 className={styles.detailsFormHeader}>
                                <Plus size={20} className={styles.headerIcon} />
                                เพิ่มรายการรับเข้า: {selectedItem?.item_name || 'โปรดเลือกสินค้า'}
                            </h2>
                            <div className={styles.inputGrid}>
                                <div className={styles.formField}>
                                    <label>จำนวนที่รับเข้า</label>
                                    <input
                                        type="number"
                                        placeholder="กรอกจำนวน"
                                        value={quantity}
                                        onChange={(e) => handleFormChange(e, setQuantity)}
                                        min="1"
                                    />
                                    {formErrors.quantity && <p className={styles.errorText}>{formErrors.quantity}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>หน่วยนับ</label>
                                    <input type="text" value={selectedItem?.item_unit || ''} disabled />
                                </div>
                                <div className={styles.formField}>
                                    <label>ราคาต่อหน่วย</label>
                                    <input
                                        type="number"
                                        placeholder="กรอกราคา"
                                        value={pricePerUnit}
                                        onChange={(e) => handleFormChange(e, setPricePerUnit)}
                                        min="0"
                                    />
                                    {formErrors.pricePerUnit && <p className={styles.errorText}>{formErrors.pricePerUnit}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>วันหมดอายุ</label>
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => handleFormChange(e, setExpiryDate)}
                                    />
                                    {formErrors.expiryDate && <p className={styles.errorText}>{formErrors.expiryDate}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>Barcode สินค้า</label>
                                    <input
                                        type="text"
                                        value={selectedItem?.item_barcode || ''}
                                        placeholder="Barcode จะแสดงที่นี่"
                                        disabled
                                    />
                                    {formErrors.selectedItem && <p className={styles.errorText}>{formErrors.selectedItem}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>รหัสสินค้าผู้ขาย</label>
                                    <input
                                        type="text"
                                        placeholder="กรอกรหัสสินค้าจากผู้ขาย"
                                        value={vendorItemCode}
                                        onChange={(e) => setVendorItemCode(e.target.value)}
                                        disabled={!selectedItem}
                                    />
                                </div>
                            </div>
                            <div className={styles.formField}>
                                <label>บันทึก / อ้างอิง (เช่น เลขที่ PO)</label>
                                <textarea
                                    className={styles.notesField}
                                    rows="2"
                                    value={notes}
                                    onChange={(e) => handleFormChange(e, setNotes)}
                                />
                            </div>
                            <div className={styles.formActions}>
                                <button type="button" className={styles.clearButton} onClick={handleClearForm}>
                                    <RotateCcw className={styles.icon} />
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    className={styles.addItemButton}
                                    onClick={handleAddItem}
                                    disabled={!selectedItem}
                                >
                                    <Plus className={styles.icon} />
                                    เพิ่มลงรายการ
                                </button>
                            </div>
                        </div>

                        <div className={styles.tableSection}>
                            <h2 className={styles.tableHeader}>
                                <ListChecks size={20} className={styles.headerIcon} />
                                รายการที่รอการบันทึก ({receivingItems.length} รายการ)
                            </h2>
                            <div className={styles.tableWrapper}>
                                <table className={styles.itemTable}>
                                    <thead>
                                        <tr>
                                        <th>ชื่อสินค้า</th>
                                        <th>จำนวน</th>
                                        <th>ราคา/หน่วย</th>
                                        <th>วันหมดอายุ</th>
                                        <th>Barcode</th>
                                        <th>รหัสผู้ขาย</th>
                                        <th className={styles.textRight}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {receivingItems.length > 0 ? (
                                            receivingItems.map(item => (
                                                <tr key={item.tempId}>
                                                    <td className={styles.itemName}>{item.name}</td>
                                                    <td>{item.quantity} {item.item_unit}</td>
                                                    <td>{item.pricePerUnit?.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '-'}</td>
                                                    <td>{item.expiryDate || '-'}</td>
                                                    <td>{item.item_barcode || '-'}</td>
                                                    <td>{item.vendor_item_code || '-'}</td>
                                                    <td className={styles.textRight}>
                                                        <button onClick={() => handleRemoveItem(item.tempId)} className={styles.deleteButton}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className={styles.emptyMessage}>
                                                    ไม่มีรายการสินค้าที่รอการบันทึก
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className={styles.actionButtonsSection}>
                            <button
                                type="button"
                                className={styles.saveButton}
                                onClick={handleSaveItems}
                                disabled={receivingItems.length === 0}
                            >
                                <Save className={styles.icon} />
                                บันทึกการรับเข้าทั้งหมด
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}