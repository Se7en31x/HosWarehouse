'use client';

import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../utils/axiosInstance'; // ตรวจสอบ path ให้ถูกต้อง
import Swal from 'sweetalert2';
import styles from './page.module.css'; // ตรวจสอบชื่อไฟล์ CSS

// ฟังก์ชันสำหรับแปลสถานะ
const translateStatus = (status) => {
    const map = {
        pending: 'รอดำเนินการ',
        approved: 'อนุมัติ',
        rejected: 'ปฏิเสธ',
        completed: 'เสร็จสิ้น',
        issued: 'เบิกจ่ายแล้ว',
        returned: 'คืนแล้ว',
        waiting_approval: 'รออนุมัติ',
        waiting_approval_detail: 'รออนุมัติรายละเอียด', // **ปรับปรุง: เพิ่มคำแปลสถานะนี้**
        approved_all: 'อนุมัติทั้งหมด',
        rejected_all: 'ปฏิเสธทั้งหมด',
        approved_partial: 'อนุมัติบางส่วน',
        rejected_partial: 'ปฏิเสธบางส่วน',
        cancelled: 'ยกเลิก',
        preparing: 'กำลังจัดเตรียม',
        delivering: 'กำลังจัดส่ง',
        unknown: 'ไม่ระบุ',
    };
    return map[status] || status;
};

export default function TransactionHistoryLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // **ปรับปรุง: เพิ่ม debouncedSearchTerm**
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortColumn, setSortColumn] = useState('changed_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [isFetching, setIsFetching] = useState(false);

    const logsPerPage = 10;

    // **ปรับปรุง: useEffect สำหรับ Debounce Search Term**
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms debounce delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);


    const fetchHistoryLogs = useCallback(async () => {
        setIsFetching(true);
        setError(null);
        try {
            const res = await axiosInstance.get('/transactionHistory', {
                params: {
                    page: currentPage,
                    limit: logsPerPage,
                    status: filterStatus || undefined,
                    search: debouncedSearchTerm || undefined, // **ปรับปรุง: ใช้ debouncedSearchTerm**
                    sort: sortColumn,
                    order: sortOrder,
                },
            });

            const fetchedLogs = Array.isArray(res.data.logs) ? res.data.logs : [];
            const pages = Number(res.data.totalPages) || 1;

            setLogs(fetchedLogs);
            setTotalPages(pages);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('ไม่สามารถโหลดประวัติการเปลี่ยนแปลงสถานะได้');
            Swal.fire('เกิดข้อผิดพลาด', err.response?.data?.message || err.message, 'error');
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    }, [currentPage, filterStatus, debouncedSearchTerm, sortColumn, sortOrder, logsPerPage]); // **ปรับปรุง: เพิ่ม debouncedSearchTerm ใน dependency array**

    useEffect(() => {
        fetchHistoryLogs();
    }, [fetchHistoryLogs]);

    const handleFilterChange = (e) => {
        setFilterStatus(e.target.value);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const handleClearFilters = () => {
        setFilterStatus('');
        setSearchTerm('');
        setDebouncedSearchTerm(''); // **ปรับปรุง: เคลียร์ debouncedSearchTerm ด้วย**
        setSortColumn('changed_at');
        setSortOrder('desc');
        setCurrentPage(1);
    };

    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage((prev) => prev - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            // **ปรับปรุง: ตรวจสอบความถูกต้องของ Date object**
            if (isNaN(date.getTime())) {
                console.error("formatDate: Invalid date string detected, NaN date:", dateStr);
                return '-';
            }
            return date.toLocaleString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
                timeZone: 'Asia/Bangkok'
            });
        } catch (e) {
            console.error("formatDate: Error processing date string:", dateStr, e);
            return '-';
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
                <p className={styles.loading}>กำลังโหลดประวัติการเปลี่ยนแปลงสถานะ...</p>
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
            <h1 className={styles.heading}>ประวัติการเปลี่ยนสถานะของคำขอ</h1>

            <div className={styles.controls}>
                <div className={styles.filterGroup}>
                    <label htmlFor="search-input" className={styles.filterLabel}>ค้นหา:</label>
                    <input
                        id="search-input"
                        type="text"
                        placeholder="รหัสคำขอ, ผู้เปลี่ยน, หมายเหตุ..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label htmlFor="filter-status" className={styles.filterLabel}>กรองสถานะ:</label>
                    <select
                        id="filter-status"
                        value={filterStatus}
                        onChange={handleFilterChange}
                        className={styles.typeSelect}
                    >
                        <option value="">-- แสดงทั้งหมด --</option>
                        <option value="pending">รอดำเนินการ</option>
                        <option value="waiting_approval">รออนุมัติ</option>
                        <option value="waiting_approval_detail">รออนุมัติรายละเอียด</option> {/* **ปรับปรุง: เพิ่ม option นี้** */}
                        <option value="approved">อนุมัติ</option>
                        <option value="approved_all">อนุมัติทั้งหมด</option>
                        <option value="approved_partial">อนุมัติบางส่วน</option>
                        <option value="rejected">ปฏิเสธ</option>
                        <option value="rejected_all">ปฏิเสธทั้งหมด</option>
                        <option value="rejected_partial">ปฏิเสธบางส่วน</option>
                        <option value="issued">เบิกจ่ายแล้ว</option>
                        <option value="returned">คืนแล้ว</option>
                        <option value="completed">เสร็จสิ้น</option>
                        <option value="cancelled">ยกเลิก</option>
                        <option value="preparing">กำลังจัดเตรียม</option>
                        <option value="delivering">กำลังจัดส่ง</option>
                    </select>
                </div>

                <button onClick={handleClearFilters} className={styles.clearBtn}>
                    ล้างตัวกรอง
                </button>
            </div>

            <div className={styles.card}>
                {isFetching && (
                    <div className={styles.tableLoadingOverlay}>
                        <div className={styles.spinner}></div>
                    </div>
                )}
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('changed_at')} className={styles.sortableHeader}>
                                    วันที่เปลี่ยน {sortColumn === 'changed_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th onClick={() => handleSort('request_code')} className={styles.sortableHeader}> {/* **ปรับปรุง: เปลี่ยน sort column เป็น request_code** */}
                                    รหัสคำขอ {sortColumn === 'request_code' && (sortOrder === 'asc' ? '↑' : '↓')} {/* **ปรับปรุง: เปลี่ยน sort column เป็น request_code** */}
                                </th>
                                <th>จากสถานะ</th>
                                <th>เป็นสถานะ</th>
                                <th onClick={() => handleSort('changed_by')} className={styles.sortableHeader}>
                                    ผู้เปลี่ยน {sortColumn === 'changed_by' && (sortOrder === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>หมายเหตุ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayLogs.map((log, index) => {
                                const isEmpty = !log.history_id;
                                return (
                                    <tr key={log.history_id || `${log.request_id || 'no_req'}-${log.changed_at || 'no_date'}-${index}`}>
                                        <td>{isEmpty ? '' : formatDate(log.changed_at)}</td>
                                        <td>{isEmpty ? '' : log.request_code || log.request_id || '-'}</td> {/* **ปรับปรุง: แสดง request_code ก่อน ถ้าไม่มีค่อยใช้ request_id** */}
                                        <td>
                                            {isEmpty ? '' : (
                                                <span className={`${styles.statusBadge} ${styles[`status-${log.old_status}`]}`}>
                                                    {translateStatus(log.old_status)}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            {isEmpty ? '' : (
                                                <span className={`${styles.statusBadge} ${styles[`status-${log.new_status}`]}`}>
                                                    {translateStatus(log.new_status)}
                                                </span>
                                            )}
                                        </td>
                                        <td>{isEmpty ? '' : (log.user_name || (log.user_fname && log.user_lname ? `${log.user_fname} ${log.user_lname}` : log.changed_by || '-'))}</td>
                                        <td>{isEmpty ? '' : log.note || '-'}</td>
                                    </tr>
                                );
                            })}
                            {logs.length === 0 && !loading && !error && (
                                <tr>
                                    <td colSpan="6" className={styles.emptyRow}>
                                        ไม่พบข้อมูลประวัติ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {totalPages > 0 && (
                <div className={styles.pagination}>
                    <button onClick={handlePrev} disabled={currentPage === 1} className={styles.paginationBtn}>
                        « ก่อนหน้า
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
                    <button onClick={handleNext} disabled={currentPage === totalPages} className={styles.paginationBtn}>
                        ถัดไป »
                    </button>
                </div>
            )}
        </div>
    );
}