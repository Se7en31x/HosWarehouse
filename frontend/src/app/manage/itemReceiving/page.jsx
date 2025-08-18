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

    const [quantity, setQuantity] = useState('');
    const [pricePerUnit, setPricePerUnit] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [vendorItemCode, setVendorItemCode] = useState('');
    const [lotNo, setLotNo] = useState('');
    const [mfgDate, setMfgDate] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [documentNo, setDocumentNo] = useState('');

    const searchFieldRef = useRef(null);

    useEffect(() => {
        fetchItems();
    }, []);

    useEffect(() => {
        if (searchFieldRef.current) {
            searchFieldRef.current.focus();
        }
    }, [isLoading]);

    useEffect(() => {
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
                    const item = response.data;
                    if (item) {
                        setFilteredItems([item]);
                        setSellingPrice(item.unit_price || '');
                    } else {
                        setFilteredItems([]);
                    }
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

        if (!lotNo) {
            errors.lotNo = "กรุณาใส่เลข Lot";
        }

        if (!pricePerUnit) {
            errors.pricePerUnit = "กรุณาใส่ราคาต้นทุน";
        } else if (isNaN(pricePerUnit) || parseFloat(pricePerUnit) < 0) {
            errors.pricePerUnit = "ต้องเป็นตัวเลขที่ไม่ติดลบ";
        }

        if (!sellingPrice) {
            errors.sellingPrice = "กรุณาใส่ราคาขาย";
        } else if (isNaN(sellingPrice) || parseFloat(sellingPrice) < 0) {
            errors.sellingPrice = "ต้องเป็นตัวเลขที่ไม่ติดลบ";
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
            lotNo: lotNo,
            mfgDate: mfgDate,
            sellingPrice: parseFloat(sellingPrice),
            documentNo: documentNo,
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
        setLotNo('');
        setMfgDate('');
        setSellingPrice('');
        setDocumentNo('');
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
            user_id: 999,
            supplier_id: 1,
            receiving_note: notes,
            receivingItems: receivingItems.map(item => ({
                item_id: item.id,
                quantity: item.quantity,
                pricePerUnit: item.pricePerUnit,
                expiryDate: item.expiryDate,
                notes: item.notes,
                vendor_item_code: item.vendor_item_code,
                lotNo: item.lotNo,
                mfgDate: item.mfgDate,
                sellingPrice: item.sellingPrice,
                documentNo: item.documentNo
            })),
        };
        console.log("Payload to be sent:", payload);

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
            
            // ตรวจสอบว่ามีข้อมูลจากเซิร์ฟเวอร์ตอบกลับมาหรือไม่
            if (error.response && error.response.data) {
                console.error("Server responded with:", error.response.data);
                MySwal.fire({
                    title: 'เกิดข้อผิดพลาด!',
                    text: error.response.data.message || 'ไม่สามารถบันทึกการรับเข้าสินค้าได้',
                    icon: 'error',
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'ตกลง',
                });
            } else {
                MySwal.fire({
                    title: 'เกิดข้อผิดพลาด!',
                    text: 'ไม่สามารถบันทึกการรับเข้าสินค้าได้',
                    icon: 'error',
                    confirmButtonColor: '#d33',
                    confirmButtonText: 'ตกลง',
                });
            }
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
                                    <label>เลขที่ Lot</label>
                                    <input
                                        type="text"
                                        placeholder="กรอกเลข Lot"
                                        value={lotNo}
                                        onChange={(e) => handleFormChange(e, setLotNo)}
                                        disabled={!selectedItem}
                                    />
                                    {formErrors.lotNo && <p className={styles.errorText}>{formErrors.lotNo}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>วันผลิต (Mfg Date)</label>
                                    <input
                                        type="date"
                                        value={mfgDate}
                                        onChange={(e) => handleFormChange(e, setMfgDate)}
                                        disabled={!selectedItem}
                                    />
                                </div>
                                
                                <div className={styles.formField}>
                                    <label>ราคาต้นทุนต่อหน่วย</label>
                                    <input
                                        type="number"
                                        placeholder="กรอกราคาต้นทุน"
                                        value={pricePerUnit}
                                        onChange={(e) => handleFormChange(e, setPricePerUnit)}
                                        min="0"
                                        disabled={!selectedItem}
                                    />
                                    {formErrors.pricePerUnit && <p className={styles.errorText}>{formErrors.pricePerUnit}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>ราคาขายต่อหน่วย</label>
                                    <input
                                        type="number"
                                        placeholder="กรอกราคาขาย"
                                        value={sellingPrice}
                                        onChange={(e) => handleFormChange(e, setSellingPrice)}
                                        min="0"
                                        disabled={!selectedItem}
                                    />
                                    {formErrors.sellingPrice && <p className={styles.errorText}>{formErrors.sellingPrice}</p>}
                                </div>

                                <div className={styles.formField}>
                                    <label>วันหมดอายุ</label>
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => handleFormChange(e, setExpiryDate)}
                                        disabled={!selectedItem}
                                    />
                                    {formErrors.expiryDate && <p className={styles.errorText}>{formErrors.expiryDate}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>รหัสสินค้าผู้ขาย</label>
                                    <input
                                        type="text"
                                        placeholder="กรอกรหัสสินค้าจากผู้ขาย"
                                        value={vendorItemCode}
                                        onChange={(e) => handleFormChange(e, setVendorItemCode)}
                                        disabled={!selectedItem}
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>เลขที่เอกสาร</label>
                                    <input
                                        type="text"
                                        placeholder="เช่น PO-001"
                                        value={documentNo}
                                        onChange={(e) => handleFormChange(e, setDocumentNo)}
                                        disabled={!selectedItem}
                                    />
                                </div>
                            </div>
                            <div className={styles.formField}>
                                <label>บันทึก / อ้างอิง</label>
                                <textarea
                                    className={styles.notesField}
                                    rows="2"
                                    value={notes}
                                    onChange={(e) => handleFormChange(e, setNotes)}
                                    disabled={!selectedItem}
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
                                            <th>ราคาต้นทุน</th>
                                            <th>ราคาขาย</th>
                                            <th>วันหมดอายุ</th>
                                            <th>Lot No.</th>
                                            <th>เลขที่เอกสาร</th>
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
                                                    <td>{item.sellingPrice?.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || '-'}</td>
                                                    <td>{item.expiryDate || '-'}</td>
                                                    <td>{item.lotNo || '-'}</td>
                                                    <td>{item.documentNo || '-'}</td>
                                                    <td className={styles.textRight}>
                                                        <button onClick={() => handleRemoveItem(item.tempId)} className={styles.deleteButton}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className={styles.emptyMessage}>
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