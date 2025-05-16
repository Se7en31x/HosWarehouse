'use client';

import { useContext } from 'react';
import { CartContext } from '../context/CartContext'; // ปรับตามโครงสร้างโปรเจกต์ของคุณ
import styles from './page.module.css';
import Image from 'next/image';

export default function Cart() {
    // const { cartItems, removeFromCart, editCartItem } = useContext(CartContext);

    const cartItems = [
        {
            id: 1,
            code: '12345',
            name: 'ยาแก้ปวด',
            quantity: 10,
            unit: 'เม็ด',
            type: 'ยา',
            location: 'คลังยา A',
            action: 'borrow', // หรือ 'withdraw', 'return'
            imageUrl: 'https://example.com/images/painkiller.jpg', // URL ของภาพสินค้า
        },
        {
            id: 2,
            code: '67890',
            name: 'หน้ากากอนามัย',
            quantity: 50,
            unit: 'ชิ้น',
            type: 'อุปกรณ์',
            location: 'คลังอุปกรณ์ B',
            action: 'withdraw',
            imageUrl: 'https://example.com/images/mask.jpg', // URL ของภาพสินค้า
        },
        {
            id: 3,
            code: '11223',
            name: 'เจลล้างมือ',
            quantity: 30,
            unit: 'ขวด',
            type: 'อุปกรณ์',
            location: 'คลังอุปกรณ์ A',
            action: 'return',
            imageUrl: 'https://example.com/images/handgel.jpg', // URL ของภาพสินค้า
        },
        {
            id: 4,
            code: '44556',
            name: 'เครื่องวัดอุณหภูมิ',
            quantity: 5,
            unit: 'เครื่อง',
            type: 'อุปกรณ์',
            location: 'คลังเครื่องมือ C',
            action: 'borrow',
            imageUrl: 'https://example.com/images/thermometer.jpg', // URL ของภาพสินค้า
        }
    ];

    const translateAction = (action) => {
        switch (action) {
            case "เบิก":
                return "Withdraw";
            case "ยืม":
                return "Borrow";
            case "คืน":
                return "Return";
            default:
                return action;
        }
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.header}>รายการเบิก ยืม</h2>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>รูปภาพ</th>
                            <th>หมายเลข</th>
                            <th>ชื่อ</th>
                            <th>จำนวน</th>
                            <th>หน่วย</th>
                            <th>หมวดหมู่</th>
                            <th>สถานที่จัดเก็บ</th>
                            <th>ประเภท</th>
                            <th>การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cartItems.map((item) => (
                            <tr key={item.id}>
                                <td>
                                    <img
                                        src={item.imageUrl || 'https://via.placeholder.com/50'}
                                        alt={item.name}
                                        width={50}
                                        height={50}
                                    />
                                </td>
                                <td>{item.code || '00123'}</td>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td>{item.unit}</td>
                                <td>{item.type}</td>
                                <td>{item.location}</td>
                                <td>
                                    {item.action === 'borrow'
                                        ? 'ยืม'
                                        : item.action === 'withdraw'
                                            ? 'เบิก'
                                            : item.action}
                                </td>
                                <td>
                                    {/* <button onClick={() => editCartItem(item.id)}>✏️</button> */}
                                    <button className={styles.delete} onClick={() => removeFromCart(item.id)}>ลบ</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className={styles.footer}>
                <div className={styles.options}>
                    <label>
                        <input type="checkbox" /> ต้องการเร่งด่วน
                    </label>
                    <label>
                        <input type="checkbox" /> จัดส่งตามปกติ
                    </label>
                    <input type="date" className={styles.datePicker} />
                </div>

                <textarea
                    className={styles.textarea}
                    placeholder="หมายเหตุ"
                    rows={3}
                />

                <div className={styles.buttons}>
                    <button className={styles.cancel}>ยกเลิก</button>
                    <button className={styles.draft}>ฉบับร่าง</button>
                    <button className={styles.confirm}>ยืนยัน</button>
                </div>
            </div>
        </div>
    );
}