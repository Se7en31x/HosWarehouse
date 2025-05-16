'use client';

import styles from './page.module.css';
import Image from 'next/image';

export default function StatusPage() {
    const orders = [
        {
            id: 1,
            code: 'REQ-00123',
            status: 'รอดำเนินการ',
            items: [
                {
                    name: 'ยาแก้ปวด',
                    imageUrl: 'https://example.com/images/painkiller.jpg',
                    quantity: 10,
                    unit: 'เม็ด',
                }
            ],
        },
        {
            id: 2,
            code: 'REQ-00124',
            status: 'กำลังจัดส่ง',
            items: [
                {
                    name: 'หน้ากากอนามัย',
                    imageUrl: 'https://example.com/images/mask.jpg',
                    quantity: 50,
                    unit: 'ชิ้น',
                }
            ],
        },
        {
            id: 3,
            code: 'REQ-00125',
            status: 'เสร็จสิ้น',
            items: [
                {
                    name: 'เจลล้างมือ',
                    imageUrl: 'https://example.com/images/handgel.jpg',
                    quantity: 30,
                    unit: 'ขวด',
                }
            ],
        },
        {
            id: 4,
            code: 'REQ-00126',
            status: 'ยกเลิก',
            items: [
                {
                    name: 'เครื่องวัดอุณหภูมิ',
                    imageUrl: 'https://example.com/images/thermometer.jpg',
                    quantity: 5,
                    unit: 'เครื่อง',
                }
            ],
        },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'รอดำเนินการ':
                return '#ffc107';
            case 'กำลังจัดส่ง':
                return '#17a2b8';
            case 'เสร็จสิ้น':
                return '#28a745';
            case 'ยกเลิก':
                return '#dc3545';
            default:
                return '#6c757d';
        }
    }

    return (
        <div className={styles.mainHome}>
            <div className={styles.container}>
                <h2 className={styles.header}>ติดตามสถานะคำขอ</h2>

                <div className={styles.cardGrid}>
                    {orders.map((order) => (
                        <div key={order.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <span className={styles.orderCode}>เลขคำขอ: {order.code}</span>
                                <span
                                    className={styles.statusBadge}
                                    style={{ backgroundColor: getStatusColor(order.status) }}
                                >
                                    {order.status}
                                </span>
                            </div>

                            {order.items.map((item, idx) => (
                                <div key={idx} className={styles.itemRow}>
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className={styles.itemImage}
                                    />
                                    <div className={styles.itemInfo}>
                                        <div className={styles.itemName}>{item.name}</div>
                                        <div className={styles.itemQty}>
                                            {item.quantity} {item.unit}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
