'use client';

import { useContext } from 'react';
import { CartContext } from '../context/CartContext'; // ปรับตามโครงสร้างโปรเจกต์ของคุณ
import styles from './page.module.css';
import Image from 'next/image';

export default function Cart() {
    const { cartItems, removeFromCart, editCartItem } = useContext(CartContext);

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
                                        src="https://medthai.com/wp-content/uploads/2016/11/%E0%B8%8B%E0%B8%B5%E0%B8%A1%E0%B8%AD%E0%B8%A5.jpg"
                                        alt={item.name}
                                        width={50}
                                        height={50}
                                    />

                                </td>
                                <td>{item.code}</td>
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
                                    <button onClick={() => removeFromCart(item.id)}>ลบ</button>
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