'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Plus, Save, RotateCcw, Trash2,
    Package, ListChecks, ChevronLeft, ChevronRight
} from 'lucide-react';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import axiosInstance from '@/app/utils/axiosInstance';

const MySwal = withReactContent(Swal);

export default function ItemReceivingPage() {
    const [allItems, setAllItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // form states
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
    const [sourceName, setSourceName] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [receivingItems, setReceivingItems] = useState([]);

    // pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));

    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return allItems.slice(start, start + ITEMS_PER_PAGE);
    }, [allItems, currentPage]);

    // fetch items
    useEffect(() => {
        const fetchItems = async () => {
            setIsLoading(true);
            try {
                const res = await axiosInstance.get('/receiving');
                setAllItems(Array.isArray(res.data) ? res.data : []);
            } catch {
                MySwal.fire({ title: 'ผิดพลาด', text: 'โหลดข้อมูลไม่สำเร็จ', icon: 'error' });
            } finally {
                setIsLoading(false);
            }
        };
        fetchItems();
    }, []);

    // auto calc
    useEffect(() => {
        const pq = parseFloat(purchaseQuantity);
        const cr = parseFloat(conversionRate);
        if (!isNaN(pq) && !isNaN(cr) && pq > 0 && cr > 0) {
            setItemQuantity(pq * cr);
        } else {
            setItemQuantity('');
        }
    }, [purchaseQuantity, conversionRate]);

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        setItemPurchaseUnit(item.item_purchase_unit || '');
        setConversionRate(item.item_conversion_rate || '');
        setPurchaseQuantity('');
        setItemQuantity('');
        setLotNo('');
        setMfgDate('');
        setExpiryDate('');
        setNotes('');
        setDocumentNo('');
    };

    const validateForm = () => {
        const errors = {};
        if (!selectedItem) errors.selectedItem = "กรุณาเลือกสินค้า";
        if (!purchaseQuantity || parseFloat(purchaseQuantity) <= 0)
            errors.purchaseQuantity = "กรุณาใส่จำนวน (หน่วยสั่งซื้อ)";
        if (!conversionRate || parseFloat(conversionRate) <= 0)
            errors.conversionRate = "กรุณาใส่อัตราส่วนที่ถูกต้อง";
        if (!lotNo) errors.lotNo = "กรุณาใส่ Lot";

        // ✅ ตรวจเฉพาะสินค้าที่ต้องมีวันหมดอายุ
        if (["ยา", "เวชภัณฑ์"].includes(selectedItem?.item_category)) {
            if (!expiryDate) errors.expiryDate = "กรุณาใส่วันหมดอายุ";
        }

        return errors;
    };

    const handleAddItem = () => {
        const errors = validateForm();
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const newItem = {
            ...selectedItem,
            item_id: selectedItem.item_id,
            name: selectedItem.item_name,
            purchaseQuantity: parseFloat(purchaseQuantity),
            purchaseUnit: itemPurchaseUnit,
            conversionRate: parseFloat(conversionRate),
            quantity: parseFloat(itemQuantity),
            expiryDate,
            notes,
            tempId: Date.now(),
            lotNo,
            mfgDate,
            documentNo,
        };
        setReceivingItems(prev => [...prev, newItem]);
        handleClearForm();
    };

    const handleClearForm = () => {
        setSelectedItem(null);
        setPurchaseQuantity('');
        setConversionRate('');
        setItemQuantity('');
        setExpiryDate('');
        setNotes('');
        setLotNo('');
        setMfgDate('');
        setDocumentNo('');
    };

    const handleRemoveItem = (id) => {
        setReceivingItems(prev => prev.filter(i => i.tempId !== id));
    };

    const handleSaveItems = async () => {
        if (receivingItems.length === 0) {
            MySwal.fire({ title: 'ไม่มีข้อมูล', text: 'ยังไม่มีรายการที่เพิ่ม', icon: 'warning' });
            return;
        }

        const result = await MySwal.fire({
            title: 'ยืนยันการบันทึก',
            text: `คุณต้องการบันทึก ${receivingItems.length} รายการหรือไม่`,
            icon: 'question',
            showCancelButton: true,
        });

        if (result.isConfirmed) {
            try {
                const payload = {
                    user_id: 1, // TODO: ดึงจาก session หรือ login จริง
                    import_type: "general",
                    source_name: sourceName || null,
                    receiving_note: notes || null,
                    receivingItems: receivingItems.map(i => ({
                        ...i,
                        expiryDate: i.expiryDate || null, 
                        mfgDate: i.mfgDate || null,
                        documentNo: i.documentNo || null,
                        notes: i.notes || null
                    }))
                };

                await axiosInstance.post("/receiving", payload);

                MySwal.fire({ title: 'บันทึกสำเร็จ', icon: 'success' });
                setReceivingItems([]);
            } catch (err) {
                console.error("❌ Save error:", err);
                MySwal.fire({ title: 'บันทึกไม่สำเร็จ', text: 'เกิดข้อผิดพลาด', icon: 'error' });
            }
        }
    };

    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) pages.push(i);
        else if (currentPage <= 4) pages.push(1, 2, 3, 4, 5, '…', totalPages);
        else if (currentPage >= totalPages - 3)
            pages.push(1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        else pages.push(1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages);
        return pages;
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.mainCard}>
                <h1 className={styles.pageTitle}>รับเข้าสินค้า</h1>

                <div className={styles.contentWrapper}>
                    {/* Block 1 */}
                    <div className={styles.tableSection}>
                        <h2 className={styles.tableHeader}><Package size={20} /> รายการสินค้าทั้งหมด</h2>
                        <div className={styles.tableWrapper}>
                            <table className={styles.itemTable}>
                                <thead>
                                    <tr><th>ชื่อสินค้า</th><th>Barcode</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr><td colSpan="3" className={styles.emptyMessage}>กำลังโหลด…</td></tr>
                                    ) : currentItems.length > 0 ? (
                                        currentItems.map(item => (
                                            <tr key={item.item_id}>
                                                <td>{item.item_name}</td>
                                                <td>{item.item_barcode || '-'}</td>
                                                <td className={styles.textRight}>
                                                    <button className={styles.selectItemButton} onClick={() => handleSelectItem(item)}>เลือก</button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="3" className={styles.emptyMessage}>ไม่พบข้อมูล</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <ul className={styles.paginationControls}>
                                <li><button className={styles.pageButton} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></button></li>
                                {getPageNumbers().map((p, i) =>
                                    p === '…' ? <li key={i} className={styles.ellipsis}>…</li> :
                                        <li key={p}><button className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`} onClick={() => setCurrentPage(p)}>{p}</button></li>
                                )}
                                <li><button className={styles.pageButton} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight size={16} /></button></li>
                            </ul>
                        )}
                    </div>

                    {/* Block 2 */}
                    <div className={styles.detailsFormSection}>
                        <h2 className={styles.detailsFormHeader}><Plus size={20} /> เพิ่มรายการรับเข้า: {selectedItem?.item_name || 'โปรดเลือกสินค้า'}</h2>
                        <div className={styles.inputGrid}>
                            <div className={styles.formField}>
                                <label>ผู้ส่งมอบ / ผู้บริจาค</label>
                                <input type="text" value={sourceName} onChange={e => setSourceName(e.target.value)} disabled={!selectedItem} />
                            </div>
                            <div className={styles.formField}>
                                <label>จำนวนที่รับเข้า (หน่วยสั่งซื้อ)</label>
                                <input type="number" value={purchaseQuantity} onChange={e => setPurchaseQuantity(e.target.value)} disabled={!selectedItem} />
                                {formErrors.purchaseQuantity && <p className={styles.errorText}>{formErrors.purchaseQuantity}</p>}
                            </div>
                            <div className={styles.formField}>
                                <label>หน่วยสั่งซื้อ</label>
                                <input type="text" value={itemPurchaseUnit} disabled />
                            </div>
                            <div className={styles.formField}>
                                <label>อัตราส่วนแปลง</label>
                                <input type="number" value={conversionRate} onChange={e => setConversionRate(e.target.value)} disabled={!selectedItem} />
                                {formErrors.conversionRate && <p className={styles.errorText}>{formErrors.conversionRate}</p>}
                            </div>
                            <div className={styles.formField}>
                                <label>จำนวนในหน่วยเบิกใช้</label>
                                <input type="text" value={itemQuantity ? `${itemQuantity} ${selectedItem?.item_unit || ''}` : ''} disabled />
                            </div>
                            <div className={styles.formField}>
                                <label>Lot No.</label>
                                <input type="text" value={lotNo} onChange={e => setLotNo(e.target.value)} disabled={!selectedItem} />
                                {formErrors.lotNo && <p className={styles.errorText}>{formErrors.lotNo}</p>}
                            </div>
                            <div className={styles.formField}>
                                <label>วันหมดอายุ</label>
                                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} disabled={!selectedItem} />
                                {formErrors.expiryDate && <p className={styles.errorText}>{formErrors.expiryDate}</p>}
                            </div>
                            <div className={styles.formField}>
                                <label>วันผลิต</label>
                                <input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} disabled={!selectedItem} />
                            </div>
                            <div className={styles.formField}>
                                <label>เลขที่เอกสาร</label>
                                <input type="text" value={documentNo} onChange={e => setDocumentNo(e.target.value)} disabled={!selectedItem} />
                            </div>
                        </div>
                        <div className={styles.formField}>
                            <label>บันทึก / อ้างอิง</label>
                            <textarea className={styles.notesField} value={notes} onChange={e => setNotes(e.target.value)} disabled={!selectedItem} />
                        </div>
                        <div className={styles.formActions}>
                            <button className={styles.clearButton} onClick={handleClearForm}><RotateCcw size={16} /> ยกเลิก</button>
                            <button className={styles.addItemButton} onClick={handleAddItem} disabled={!selectedItem}><Plus size={16} /> เพิ่ม</button>
                        </div>
                    </div>
                </div>

                {/* Block 3 */}
                <div className={styles.bottomSection}>
                    <div className={styles.tableSection}>
                        <h2 className={styles.tableHeader}><ListChecks size={20} /> รายการรอการบันทึก</h2>
                        <div className={styles.tableWrapper}>
                            <table className={styles.itemTable}>
                                <thead><tr><th>ชื่อสินค้า</th><th>จำนวน</th><th>Lot</th><th>วันหมดอายุ</th><th></th></tr></thead>
                                <tbody>
                                    {receivingItems.length > 0 ? (
                                        receivingItems.map(item => (
                                            <tr key={item.tempId}>
                                                <td>{item.name}</td>
                                                <td>{item.quantity} {item.item_unit}</td>
                                                <td>{item.lotNo}</td>
                                                <td>{item.expiryDate}</td>
                                                <td className={styles.textRight}>
                                                    <button onClick={() => handleRemoveItem(item.tempId)} className={styles.deleteButton}><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="5" className={styles.emptyMessage}>ไม่มีรายการ</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className={styles.saveArea}>
                            <button onClick={handleSaveItems} disabled={receivingItems.length === 0} className={styles.saveButton}><Save size={16} /> บันทึกทั้งหมด</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}