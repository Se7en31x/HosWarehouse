'use client';

import { useState, useEffect, useRef } from 'react';
import { Scan, Plus, Save, RotateCcw, Trash2, Search, Package, ListChecks } from 'lucide-react';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import axiosInstance from '@/app/utils/axiosInstance';

const MySwal = withReactContent(Swal);

export default function ItemReceivingPage() {
    // States สำหรับการค้นหาและแสดงผล
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredItems, setFilteredItems] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);

    // States สำหรับฟอร์มรับเข้า
    const [selectedItem, setSelectedItem] = useState(null);
    const [purchaseQuantity, setPurchaseQuantity] = useState('');
    const [itemPurchaseUnit, setItemPurchaseUnit] = useState('');
    const [conversionRate, setConversionRate] = useState('');
    const [itemQuantity, setItemQuantity] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [lotNo, setLotNo] = useState('');
    const [mfgDate, setMfgDate] = useState('');
    const [documentNo, setDocumentNo] = useState('');
    const [importType, setImportType] = useState('');
    const [sourceName, setSourceName] = useState('');
    const [formErrors, setFormErrors] = useState({});

    // States สำหรับตารางรายการที่รอการบันทึก
    const [receivingItems, setReceivingItems] = useState([]);

    // State สำหรับ Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(allItems.length / itemsPerPage);

    const searchFieldRef = useRef(null);

    // Effect สำหรับการดึงข้อมูลสินค้าทั้งหมด
    useEffect(() => {
        fetchItems();
    }, []);

    // Effect สำหรับการอัปเดตค่าฟอร์มเมื่อเลือกสินค้า
    useEffect(() => {
        if (selectedItem) {
            setItemPurchaseUnit(selectedItem.item_purchase_unit || '');
            setConversionRate(selectedItem.item_conversion_rate || '');
            setPurchaseQuantity('');
            setItemQuantity('');
            setLotNo('');
            setMfgDate('');
            setExpiryDate('');
            setNotes('');
            setDocumentNo('');
        }
    }, [selectedItem]);

    // Effect สำหรับการคำนวณจำนวนในหน่วยเบิกใช้
    useEffect(() => {
        const parsedPurchaseQuantity = parseFloat(purchaseQuantity);
        const parsedConversionRate = parseFloat(conversionRate);

        if (!isNaN(parsedPurchaseQuantity) && !isNaN(parsedConversionRate) && parsedPurchaseQuantity > 0 && parsedConversionRate > 0) {
            const calculatedQuantity = parsedPurchaseQuantity * parsedConversionRate;
            setItemQuantity(calculatedQuantity);
        } else {
            setItemQuantity('');
        }
    }, [purchaseQuantity, conversionRate]);

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

    const handleSearch = (term) => {
        if (term.length > 0) {
            setIsLoadingSearch(true);
            let filtered = [];
            if (!isNaN(term) && term.length > 5) {
                const item = allItems.find(i => i.item_barcode === term);
                if (item) {
                    filtered.push(item);
                }
            } else {
                filtered = allItems.filter(item =>
                    item.item_name.toLowerCase().includes(term.toLowerCase()) ||
                    (item.item_barcode && item.item_barcode.includes(term))
                );
            }
            setFilteredItems(filtered);
            setIsLoadingSearch(false);
        } else {
            setFilteredItems([]);
        }
    };

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        setSearchTerm('');
        setFilteredItems([]);
        setFormErrors({});
    };

    const validateForm = () => {
        const errors = {};
        if (!selectedItem) {
            errors.selectedItem = "กรุณาเลือกสินค้า";
        }
        if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0) {
            errors.purchaseQuantity = "กรุณาใส่จำนวน (หน่วยสั่งซื้อ)";
        }
        if (!conversionRate || parseFloat(conversionRate) <= 0) {
            errors.conversionRate = "กรุณาใส่อัตราส่วนการแปลงที่ถูกต้อง";
        }
        if (!lotNo) {
            errors.lotNo = "กรุณาใส่เลข Lot";
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
                html: 'กรุณากรอกข้อมูลในช่องที่จำเป็นให้ครบถ้วน:<br/>' + Object.values(errors).map(err => `&bull; ${err}`).join('<br/>'),
                icon: 'warning',
                confirmButtonColor: '#ff9800',
                confirmButtonText: 'ตกลง',
            });
            return;
        }

        const newItem = {
            ...selectedItem,
            item_id: selectedItem.item_id,
            name: selectedItem.item_name,
            purchaseQuantity: parseFloat(purchaseQuantity),
            purchaseUnit: itemPurchaseUnit,
            conversionRate: parseFloat(conversionRate),
            quantity: parseFloat(itemQuantity),
            expiryDate: expiryDate,
            notes: notes,
            tempId: Date.now(),
            lotNo: lotNo,
            mfgDate: mfgDate,
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
        setSearchTerm('');
        setFilteredItems([]);
        setFormErrors({});
        setPurchaseQuantity('');
        setConversionRate('');
        setItemQuantity('');
        setExpiryDate('');
        setNotes('');
        setLotNo('');
        setMfgDate('');
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
        // if (!importType) {
        //     MySwal.fire({
        //         title: 'ข้อมูลไม่ครบถ้วน!',
        //         text: 'กรุณาเลือกประเภทการนำเข้า',
        //         icon: 'warning',
        //         confirmButtonColor: '#ff9800',
        //         confirmButtonText: 'ตกลง',
        //     });
        //     return;
        // }
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
            import_type: "general",
            source_name: sourceName,
            receiving_note: notes,
            receivingItems: receivingItems.map(item => ({
                item_id: item.item_id,
                quantity: item.quantity,
                purchaseQuantity: item.purchaseQuantity || null,
                purchaseUnit: item.purchaseUnit || null,
                conversionRate: item.conversionRate || null,
                expiryDate: item.expiryDate || null,
                notes: item.notes || null,
                lotNo: item.lotNo,            // ✅ เปลี่ยนเป็น camelCase
                mfgDate: item.mfgDate || null,
                documentNo: item.documentNo || null,
            })),
        };
        console.log("📦 Payload ที่จะส่งไป backend:", payload);
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

            if (error.response && error.response.data) {
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
                                    onChange={(e) => setSearchTerm(e.target.value)}
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
                                    <label>ผู้ส่งมอบ / ผู้บริจาค</label>
                                    <input
                                        type="text"
                                        placeholder="ชื่อหน่วยงานหรือบุคคล"
                                        value={sourceName}
                                        onChange={(e) => setSourceName(e.target.value)}
                                        disabled={!selectedItem}
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>จำนวนที่รับเข้า (หน่วยสั่งซื้อ)</label>
                                    <input
                                        type="number"
                                        placeholder={`จำนวนเป็น ${selectedItem?.item_purchase_unit || ''}`}
                                        value={purchaseQuantity}
                                        onChange={(e) => setPurchaseQuantity(e.target.value)}
                                        disabled={!selectedItem}
                                        min="1"
                                    />
                                    {formErrors.purchaseQuantity && <p className={styles.errorText}>{formErrors.purchaseQuantity}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>หน่วยสั่งซื้อ</label>
                                    <input type="text" value={itemPurchaseUnit || ''} disabled />
                                </div>
                                <div className={styles.formField}>
                                    <label>อัตราส่วนแปลง (1 {itemPurchaseUnit || ''} = ... {selectedItem?.item_unit || ''})</label>
                                    <input
                                        type="number"
                                        placeholder="อัตราส่วน"
                                        value={conversionRate}
                                        onChange={(e) => setConversionRate(e.target.value)}
                                        disabled={!selectedItem}
                                        min="1"
                                    />
                                    {formErrors.conversionRate && <p className={styles.errorText}>{formErrors.conversionRate}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>จำนวนในหน่วยเบิกใช้</label>
                                    <input
                                        type="text"
                                        value={itemQuantity ? `${itemQuantity} ${selectedItem?.item_unit || ''}` : ''}
                                        disabled
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>เลขที่ Lot</label>
                                    <input
                                        type="text"
                                        placeholder="กรอกเลข Lot"
                                        value={lotNo}
                                        onChange={(e) => setLotNo(e.target.value)}
                                        disabled={!selectedItem}
                                    />
                                    {formErrors.lotNo && <p className={styles.errorText}>{formErrors.lotNo}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>วันหมดอายุ</label>
                                    <input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        disabled={!selectedItem}
                                    />
                                    {formErrors.expiryDate && <p className={styles.errorText}>{formErrors.expiryDate}</p>}
                                </div>
                                <div className={styles.formField}>
                                    <label>วันผลิต (Mfg Date)</label>
                                    <input
                                        type="date"
                                        value={mfgDate}
                                        onChange={(e) => setMfgDate(e.target.value)}
                                        disabled={!selectedItem}
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <label>เลขที่เอกสาร</label>
                                    <input
                                        type="text"
                                        placeholder="เช่น ใบส่งของ, ใบเบิกคืน"
                                        value={documentNo}
                                        onChange={(e) => setDocumentNo(e.target.value)}
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
                                    onChange={(e) => setNotes(e.target.value)}
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
                                            <th>จำนวน (หน่วยเบิกใช้)</th>
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
                                                <td colSpan="6" className={styles.emptyMessage}>
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