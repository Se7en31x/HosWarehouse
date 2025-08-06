'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import styles from './page.module.css';
import axiosInstance from '@/app/utils/axiosInstance';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSortUp, faSortDown, faSearch, faFilter, faTimes, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

// --- Utility Functions ---
const translateType = (type) => {
    const translations = {
        'เบิก': 'เบิก',
        'ยืม': 'ยืม',
        'คืน': 'คืน',
        'เพิ่ม/นำเข้า': 'เพิ่ม/นำเข้า',
        'ปรับปรุงสต็อก': 'ปรับปรุงสต็อก',
        'โอนย้าย': 'โอนย้าย',
        'ยกเลิก/ชำรุด': 'ยกเลิก/ชำรุด',
        'การเปลี่ยนสถานะอนุมัติ': 'เปลี่ยนสถานะอนุมัติ',
        'การเปลี่ยนสถานะดำเนินการ': 'เปลี่ยนสถานะดำเนินการ',
    };
    return translations[type] || type;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' });
    } catch (e) {
        return '-';
    }
};

// --- Sub-components for Modal Details ---
const DetailsTable = ({ headers, data, renderRow }) => (
    <div className={styles.detailsTableWrapper}>
        <table className={styles.detailTable}>
            <thead>
                <tr>
                    {headers.map((header, i) => <th key={i}>{header}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.map(renderRow)}
            </tbody>
        </table>
    </div>
);

const WithdrawalAndBorrowDetails = ({ details }) => (
    <div>
        <h4>รายการย่อย:</h4>
        <DetailsTable
            headers={['ชื่อ', 'จำนวน', 'จำนวนที่อนุมัติ', 'หน่วย', 'สถานะย่อย']}
            data={details}
            renderRow={(d, i) => (
                <tr key={i}>
                    <td>{d.item_name}</td>
                    <td>{d.requested_qty}</td>
                    <td>{d.approved_qty || '-'}</td>
                    <td>{d.item_unit || '-'}</td>
                    <td>{d.processing_status || d.approval_status || '-'}</td>
                </tr>
            )}
        />
    </div>
);

const ImportDetails = ({ details }) => (
    <div>
        <h4>รายการนำเข้า:</h4>
        <DetailsTable
            headers={['เวชภัณฑ์/อุปกรณ์', 'จำนวน', 'ราคา/หน่วย', 'หมายเหตุ']}
            data={details}
            renderRow={(d, i) => (
                <tr key={i}>
                    <td>{d.item_name}</td>
                    <td>{d.import_qty} {d.item_unit}</td>
                    <td>{d.import_price ? `฿${d.import_price.toFixed(2)}` : '-'}</td>
                    <td>{d.import_note || '-'}</td>
                </tr>
            )}
        />
    </div>
);

const StockAdjustmentDetails = ({ details }) => (
    <div>
        <h4>รายละเอียดการปรับปรุงสต็อก:</h4>
        <DetailsTable
            headers={['เวชภัณฑ์/อุปกรณ์', 'จำนวนที่ปรับ', 'หน่วย', 'หมายเหตุ']}
            data={details}
            renderRow={(d, i) => (
                <tr key={i}>
                    <td>{d.item_name}</td>
                    <td>{d.move_qty} {d.item_unit}</td>
                    <td>{d.note || '-'}</td>
                </tr>
            )}
        />
    </div>
);

const TransferDetails = ({ details }) => (
    <div>
        <h4>รายการโอนย้าย:</h4>
        <DetailsTable
            headers={['เวชภัณฑ์/อุปกรณ์', 'จำนวน', 'หน่วย', 'หมายเหตุ']}
            data={details}
            renderRow={(d, i) => (
                <tr key={i}>
                    <td>{d.item_name}</td>
                    <td>{d.move_qty} {d.item_unit}</td>
                    <td>{d.note || '-'}</td>
                </tr>
            )}
        />
    </div>
);

const ReturnDetails = ({ details }) => (
    <div>
        <h4>รายการคืน:</h4>
        <DetailsTable
            headers={['เวชภัณฑ์/อุปกรณ์', 'จำนวน', 'สถานะ', 'หมายเหตุ']}
            data={details}
            renderRow={(d, i) => (
                <tr key={i}>
                    <td>{d.item_name}</td>
                    <td>{d.return_qty} {d.item_unit}</td>
                    <td>{d.return_status || '-'}</td>
                    <td>{d.return_note || '-'}</td>
                </tr>
            )}
        />
    </div>
);

const CancelAndDamageDetails = ({ details }) => (
    <div>
        <h4>รายการที่ถูกยกเลิก/ชำรุด:</h4>
        <DetailsTable
            headers={['เวชภัณฑ์/อุปกรณ์', 'จำนวน', 'หน่วย', 'เหตุผล']}
            data={details}
            renderRow={(d, i) => (
                <tr key={i}>
                    <td>{d.item_name}</td>
                    <td>{d.move_qty} {d.item_unit}</td>
                    <td>{d.note || '-'}</td>
                </tr>
            )}
        />
    </div>
);

const ApprovalStatusChangeDetails = ({ details }) => (
    <div>
        <p><strong>คำขอ:</strong> {details[0]?.request_code}</p>
        <p><strong>สถานะเดิม:</strong> {details[0]?.old_status}</p>
        <p><strong>สถานะใหม่:</strong> {details[0]?.new_status}</p>
        <p><strong>หมายเหตุ:</strong> {details[0]?.note || '-'}</p>
    </div>
);

const OperationStatusChangeDetails = ({ details }) => (
    <div>
        <p><strong>คำขอ:</strong> {details[0]?.request_code}</p>
        <p><strong>สถานะดำเนินการเดิม:</strong> {details[0]?.old_processing_status}</p>
        <p><strong>สถานะดำเนินการใหม่:</strong> {details[0]?.new_processing_status}</p>
        <p><strong>รายละเอียดการดำเนินการ:</strong> {details[0]?.description || '-'}</p>
        <p><strong>หมายเหตุ:</strong> {details[0]?.note || '-'}</p>
    </div>
);


// --- Main Component ---
export default function TransactionHistoryLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortColumn, setSortColumn] = useState('timestamp');
    const [sortOrder, setSortOrder] = useState('desc');
    const [isFetching, setIsFetching] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const logsPerPage = 10;

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchHistoryLogs = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        try {
            const response = await axiosInstance.get('/transaction-history', {
                params: {
                    page: currentPage,
                    limit: logsPerPage,
                    type: filterType,
                    search: debouncedSearchTerm,
                    sort_by: sortColumn,
                    sort_order: sortOrder,
                },
            });

            const { data, total_pages } = response.data;
            setLogs(data);
            setTotalPages(total_pages);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('ไม่สามารถโหลดประวัติการทำรายการได้');
            Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดประวัติการทำรายการได้', 'error');
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    }, [currentPage, filterType, debouncedSearchTerm, sortColumn, sortOrder, logsPerPage]);

    useEffect(() => {
        fetchHistoryLogs();
    }, [fetchHistoryLogs]);

    const handleFilterChange = (e) => {
        setFilterType(e.target.value);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleSort = (column) => {
        const backendColumn = {
            'timestamp': 'timestamp',
            'type': 'type',
            'user': 'user_name',
        }[column] || 'timestamp';

        if (sortColumn === backendColumn) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(backendColumn);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilterType('');
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setSortColumn('timestamp');
        setSortOrder('desc');
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handleRowClick = (transaction) => {
        setSelectedTransaction(transaction);
    };

    const renderDetails = (transaction) => {
        switch (transaction.type) {
            case 'เบิก':
            case 'ยืม':
                return <WithdrawalAndBorrowDetails details={transaction.details} />;
            case 'เพิ่ม/นำเข้า':
                return <ImportDetails details={transaction.details} />;
            case 'คืน':
                return <ReturnDetails details={transaction.details} />;
            case 'ปรับปรุงสต็อก':
                return <StockAdjustmentDetails details={transaction.details} />;
            case 'โอนย้าย':
                return <TransferDetails details={transaction.details} />;
            case 'ยกเลิก/ชำรุด':
                return <CancelAndDamageDetails details={transaction.details} />;
            case 'การเปลี่ยนสถานะอนุมัติ':
                return <ApprovalStatusChangeDetails details={transaction.details} />;
            case 'การเปลี่ยนสถานะดำเนินการ':
                return <OperationStatusChangeDetails details={transaction.details} />;
            default:
                return <p>ไม่มีข้อมูลรายละเอียดสำหรับประเภทนี้</p>;
        }
    };

    const displayLogs = [...logs];
    while (displayLogs.length < logsPerPage) {
        displayLogs.push({});
    }

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p className={styles.loading}>กำลังโหลดประวัติการทำรายการ...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${styles.container} ${styles.errorContainer}`}>
                <p>{error}</p>
                <button onClick={fetchHistoryLogs} className={styles.retryBtn}>
                    ลองโหลดใหม่
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.heading}>ประวัติการทำรายการทั้งหมด</h1>
                <div className={styles.controls}>
                    <div className={styles.filterGroup}>
                        <label htmlFor="search-input" className={styles.filterLabel}>
                            <FontAwesomeIcon icon={faSearch} /> ค้นหา:
                        </label>
                        <input
                            id="search-input"
                            type="text"
                            placeholder="ค้นหาจากชื่อผู้ทำรายการ..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className={styles.searchInput}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label htmlFor="filter-type" className={styles.filterLabel}>
                            <FontAwesomeIcon icon={faFilter} /> กรองประเภท:
                        </label>
                        <select
                            id="filter-type"
                            value={filterType}
                            onChange={handleFilterChange}
                            className={styles.typeSelect}
                        >
                            <option value="">-- แสดงทั้งหมด --</option>
                            <option value="เบิก">เบิก</option>
                            <option value="ยืม">ยืม</option>
                            <option value="คืน">คืน</option>
                            <option value="เพิ่ม/นำเข้า">เพิ่ม/นำเข้า</option>
                            <option value="ปรับปรุงสต็อก">ปรับปรุงสต็อก</option>
                            <option value="โอนย้าย">โอนย้าย</option>
                            <option value="ยกเลิก/ชำรุด">ยกเลิก/ชำรุด</option>
                            <option value="การเปลี่ยนสถานะอนุมัติ">เปลี่ยนสถานะอนุมัติ</option>
                            <option value="การเปลี่ยนสถานะดำเนินการ">เปลี่ยนสถานะดำเนินการ</option>
                        </select>
                    </div>
                    <button onClick={handleClearFilters} className={styles.clearBtn} title="ล้างตัวกรองทั้งหมด">
                        <FontAwesomeIcon icon={faTimes} /> ล้างตัวกรอง
                    </button>
                </div>

                {isFetching && (
                    <div className={styles.tableLoadingOverlay}>
                        <div className={styles.spinner}></div>
                    </div>
                )}
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('timestamp')} className={styles.sortableHeader}>
                                    วันที่และเวลา {sortColumn === 'timestamp' && (sortOrder === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />)}
                                </th>
                                <th onClick={() => handleSort('type')} className={styles.sortableHeader}>
                                    ประเภท {sortColumn === 'type' && (sortOrder === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />)}
                                </th>
                                <th onClick={() => handleSort('user')} className={styles.sortableHeader}>
                                    ผู้ทำรายการ {sortColumn === 'user_name' && (sortOrder === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />)}
                                </th>
                                <th>การดำเนินการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayLogs.map((log, index) => {
                                const isEmpty = !log.id;
                                return (
                                    <tr
                                        key={log.id || `empty-${index}`}
                                        className={!isEmpty ? styles.rowWithData : styles.emptyRowPlaceholder}
                                    >
                                        <td>{isEmpty ? '' : formatDate(log.timestamp)}</td>
                                        <td>{isEmpty ? '' : translateType(log.type)}</td>
                                        <td>{isEmpty ? '' : log.user_name || '-'}</td>
                                        <td>
                                            {!isEmpty && (
                                                <button
                                                    onClick={() => handleRowClick(log)}
                                                    className={styles.detailButton}
                                                >
                                                    ดูรายละเอียด
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {logs.length === 0 && !loading && !error && (
                                <tr className={styles.noDataRow}>
                                    <td colSpan="4">ไม่พบข้อมูลประวัติ</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 0 && (
                    <div className={styles.pagination}>
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className={styles.paginationBtn}>
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                className={`${styles.paginationBtn} ${currentPage === i + 1 ? styles.activePage : ''}`}
                                onClick={() => handlePageChange(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className={styles.paginationBtn}>
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                )}
            </div>

            {selectedTransaction && (
                <div className={styles.modal} onClick={() => setSelectedTransaction(null)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <span className={styles.closeButton} onClick={() => setSelectedTransaction(null)}>&times;</span>
                        <h3>รายละเอียดการทำรายการ</h3>
                        <p><strong>ประเภท:</strong> {translateType(selectedTransaction.type)}</p>
                        <p><strong>ผู้ทำรายการ:</strong> {selectedTransaction.user_name}</p>
                        <p><strong>วันที่และเวลา:</strong> {formatDate(selectedTransaction.timestamp)}</p>
                        <div className={styles.modalDetailsSection}>
                            {renderDetails(selectedTransaction)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}