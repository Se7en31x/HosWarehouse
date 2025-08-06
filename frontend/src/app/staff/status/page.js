'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

import { FaRegCircle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import Image from 'next/image';

const mockRequests = [
    {
        id: 1,
        request_id: 'REQ-20250805-001',
        status: 'completed',
        status_th: 'เสร็จสิ้น',
        urgent: false,
        type: 'เบิก',
        request_date: '2025-08-05',
        last_updated: '2025-08-06',
        items: [
            { id: 101, name: 'เข็มฉีดยา 5ml', quantity: 10, unit: 'ชิ้น', image: '/defaults/items/syringe.png' },
            { id: 102, name: 'ผ้าพันแผลขนาดใหญ่', quantity: 5, unit: 'ม้วน', image: '/defaults/items/bandage.png' },
        ],
        steps: [
            { label: 'คำขอถูกส่ง', date: '2025-08-05', is_completed: true, is_current: false, is_rejected: false },
            { label: 'อนุมัติโดยผู้จัดการ', date: '2025-08-05', is_completed: true, is_current: false, is_rejected: false },
            { label: 'กำลังจัดเตรียม', date: '2025-08-06', is_completed: true, is_current: false, is_rejected: false },
            { label: 'รับของเรียบร้อย', date: '2025-08-06', is_completed: true, is_current: false, is_rejected: false },
        ],
    },
    {
        id: 2,
        request_id: 'REQ-20250806-002',
        status: 'in_progress',
        status_th: 'กำลังดำเนินการ',
        urgent: true,
        type: 'ยืม',
        request_date: '2025-08-06',
        last_updated: '2025-08-06',
        items: [
            { id: 201, name: 'เครื่องวัดความดัน', quantity: 1, unit: 'เครื่อง', image: '/defaults/items/blood-pressure-monitor.png' },
        ],
        steps: [
            { label: 'คำขอถูกส่ง', date: '2025-08-06', is_completed: true, is_current: false, is_rejected: false },
            { label: 'อนุมัติโดยผู้จัดการ', date: '2025-08-06', is_completed: true, is_current: true, is_rejected: false },
            { label: 'กำลังจัดเตรียม', date: null, is_completed: false, is_current: false, is_rejected: false },
            { label: 'รับของเรียบร้อย', date: null, is_completed: false, is_current: false, is_rejected: false },
        ],
    },
    {
        id: 3,
        request_id: 'REQ-20250806-003',
        status: 'rejected',
        status_th: 'ถูกปฏิเสธ',
        urgent: false,
        type: 'เบิก',
        request_date: '2025-08-06',
        last_updated: '2025-08-06',
        items: [
            { id: 301, name: 'ถุงมือยาง', quantity: 200, unit: 'คู่', image: '/defaults/items/gloves.png' },
        ],
        steps: [
            { label: 'คำขอถูกส่ง', date: '2025-08-06', is_completed: true, is_current: false, is_rejected: false },
            { label: 'ถูกปฏิเสธโดยผู้จัดการ', date: '2025-08-06', is_completed: true, is_current: false, is_rejected: true },
            { label: 'กำลังจัดเตรียม', date: null, is_completed: false, is_current: false, is_rejected: false },
            { label: 'รับของเรียบร้อย', date: null, is_completed: false, is_current: false, is_rejected: false },
        ],
    },
];

export default function RequestStatus() {
    const [requests, setRequests] = useState([]);
    const [expandedRequest, setExpandedRequest] = useState(null);

    useEffect(() => {
        // ในสถานการณ์จริง คุณจะ fetch ข้อมูลจาก API ที่นี่
        // const fetchRequests = async () => { ... }
        setRequests(mockRequests);
    }, []);

    const toggleExpand = (id) => {
        setExpandedRequest(expandedRequest === id ? null : id);
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'pending':
                return styles.pending;
            case 'in_progress':
                return styles.inProgress;
            case 'completed':
                return styles.completed;
            case 'rejected':
                return styles.rejected;
            default:
                return '';
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.header}>สถานะคำขอของฉัน</h2>

            <div className={styles.requestList}>
                {requests.length > 0 ? (
                    requests.map(request => (
                        <div key={request.id} className={styles.requestCard}>
                            <div className={styles.cardSummary} onClick={() => toggleExpand(request.id)}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.requestInfo}>
                                        <h3 className={styles.requestID}>#{request.request_id}</h3>
                                        <span className={`${styles.statusLabel} ${getStatusClass(request.status)}`}>{request.status_th}</span>
                                    </div>
                                    <div className={styles.metaInfo}>
                                        {request.urgent && <span className={styles.urgentTag}>เร่งด่วน</span>}
                                        <span className={styles.typeTag}>{request.type}</span>
                                        <span className={styles.dateInfo}>เมื่อ: {request.request_date}</span>
                                    </div>
                                </div>
                                <div className={`${styles.expandIcon} ${expandedRequest === request.id ? styles.expanded : ''}`}>
                                    <FaChevronDown />
                                </div>
                            </div>
                            
                            {expandedRequest === request.id && (
                                <div className={styles.cardDetails}>
                                    <div className={styles.timeline}>
                                        {request.steps.map((step, index) => (
                                            <div key={index} className={styles.step}>
                                                <div className={`${styles.stepIcon} ${step.is_completed ? styles.completed : ''} ${step.is_rejected ? styles.rejected : ''}`}>
                                                    {step.is_rejected ? <FaTimesCircle /> : step.is_completed ? <FaCheckCircle /> : <FaRegCircle />}
                                                </div>
                                                <div className={styles.stepContent}>
                                                    <div className={styles.stepLabel}>{step.label}</div>
                                                    {step.date && <div className={styles.stepDate}>{step.date}</div>}
                                                </div>
                                                {index < request.steps.length - 1 && <div className={`${styles.stepLine} ${step.is_completed ? styles.completed : ''}`} />}
                                            </div>
                                        ))}
                                    </div>
                                    <div className={styles.itemsList}>
                                        <h4 className={styles.itemsHeader}>รายการสินค้า</h4>
                                        <div className={styles.itemsGrid}>
                                            {request.items.map(item => (
                                                <div key={item.id} className={styles.itemCard}>
                                                    <Image
                                                        src={item.image || '/defaults/landscape.png'}
                                                        alt={item.name}
                                                        width={60}
                                                        height={60}
                                                        className={styles.itemImage}
                                                    />
                                                    <div className={styles.itemInfo}>
                                                        <div className={styles.itemName}>{item.name}</div>
                                                        <div className={styles.itemQuantity}>{item.quantity} {item.unit}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className={styles.noRequests}>ไม่มีคำขอในขณะนี้</p>
                )}
            </div>
        </div>
    );
}

// Import icons
import { FaChevronDown } from 'react-icons/fa';