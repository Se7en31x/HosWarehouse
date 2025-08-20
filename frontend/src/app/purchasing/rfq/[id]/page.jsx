'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from '../page.module.css';

const MOCK_DETAIL = {
    1: {
        rfq_no: 'RFQ-2025-001',
        date: '2025-08-20',
        creator: 'Admin',
        status: 'Sent',
        note: 'ขอราคาเพื่อเติมสต็อกเดือนนี้',
        attachments: [{ name: 'spec-paracetamol.pdf', size: '120 KB' }],
        items: [
            { code: 'MED001', name: 'ยาพาราเซตามอล 500mg', qty: 50, unit: 'กล่อง', remark: '' },
            { code: 'MED010', name: 'แอลกอฮอล์ 70%', qty: 30, unit: 'ขวด', remark: 'ขวดแก้ว' },
        ],
        invitedSuppliers: [
            { id: 101, name: 'หจก.สุขภาพดี', email: 'sale@sdk.com', invited_at: '2025-08-20 10:20' },
            { id: 102, name: 'บจก.เมดิคอลพลัส', email: 'offer@medicalplus.co.th', invited_at: '2025-08-20 10:25' },
        ],
        timeline: [
            { t: '2025-08-20 10:00', ev: 'สร้าง RFQ' },
            { t: '2025-08-20 10:20', ev: 'เชิญผู้ขาย 2 ราย' },
            { t: '2025-08-20 10:30', ev: 'ส่ง RFQ (PDF)' },
        ],
    },
    2: {
        rfq_no: 'RFQ-2025-002',
        date: '2025-08-21',
        creator: 'Admin',
        status: 'Draft',
        note: 'รายการเบื้องต้น',
        attachments: [],
        items: [{ code: 'GEN005', name: 'กระดาษทิชชู่ 2 ชั้น', qty: 20, unit: 'แพ็ค', remark: '' }],
        invitedSuppliers: [],
        timeline: [{ t: '2025-08-21 11:00', ev: 'สร้าง RFQ (Draft)' }],
    }, 3: {
        rfq_no: 'RFQ-2025-003',
        date: '2025-08-22',
        creator: 'NurseA',
        status: 'Selected',
        note: 'เร่งด่วน',
        attachments: [],
        items: [
            { code: 'MED002', name: 'ไอบูโพรเฟน 400mg', qty: 40, unit: 'กล่อง', remark: '' },
            { code: 'SUP003', name: 'หน้ากากอนามัย 3 ชั้น', qty: 200, unit: 'ชิ้น', remark: '' },
            { code: 'MED011', name: 'เบตาดีน', qty: 15, unit: 'ขวด', remark: '' },
        ],
        invitedSuppliers: [{ id: 201, name: 'บจก.เฮลท์แคร์พลัส', email: 'sale@hcp.co.th', invited_at: '2025-08-22 09:10' }],
        timeline: [
            { t: '2025-08-22 09:00', ev: 'สร้าง RFQ' },
            { t: '2025-08-22 09:10', ev: 'เชิญผู้ขาย 1 ราย' },
            { t: '2025-08-22 09:20', ev: 'ส่ง RFQ (PDF)' },
        ],
    },
};

const Badge = ({ children, tone = 'gray' }) => (
    <span className={`${styles.badge} ${styles['tone_' + tone]}`}>{children}</span>
);

export default function RfqDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [rfq, setRfq] = useState(null);
    const [searchItem, setSearchItem] = useState('');

    useEffect(() => { setRfq(MOCK_DETAIL[id]); }, [id]);
    const filteredItems = useMemo(() => {
        if (!rfq) return [];
        const s = searchItem.toLowerCase();
        return rfq.items.filter(x => x.code.toLowerCase().includes(s) || x.name.toLowerCase().includes(s));
    }, [rfq, searchItem]);

    if (!rfq) return <main className={styles.container}><p>Loading...</p></main>;

    const exportPdf = () => alert('(Mock) ส่งออก PDF RFQ');
    const addItem = () => alert('(Mock) เพิ่มรายการสินค้า');
    const editItem = (code) => alert(`(Mock) แก้ไขรายการ ${code}`);
    const deleteItem = (code) => confirm('ลบรายการนี้?') && alert(`(Mock) ลบ ${code}`);
    const inviteSupplier = () => alert('(Mock) เชิญผู้ขายโดยอีเมล/เลือกรายชื่อ');
    const addAttachment = () => alert('(Mock) แนบไฟล์เพิ่มเติม');
    const closeRFQ = () => alert('(Mock) ปิด RFQ');
    const goQuotation = () => router.push(`/purchasing/quotation/${id}/new`);

    return (
        <main className={styles.container}>
            {/* Breadcrumb */}
            <div className={styles.breadcrumb}>
                <a href="/purchasing/rfq">RFQ</a> <span>/</span> <span>{rfq.rfq_no}</span>
            </div>

            {/* Header card */}
            <section className={styles.card}>
                <div className={styles.cardHeader}>
                    <h1 className={styles.title}>{rfq.rfq_no}</h1>
                    <div className={styles.headerBadges}>
                        <Badge tone={rfq.status === 'Sent' ? 'blue' : rfq.status === 'Selected' ? 'green' : rfq.status === 'Closed' ? 'dark' : 'gray'}>
                            {rfq.status}
                        </Badge>
                    </div>
                </div>
                <div className={styles.gridTwo}>
                    <div>
                        <p><b>วันที่:</b> {rfq.date}</p>
                        <p><b>ผู้สร้าง:</b> {rfq.creator}</p>
                        <p><b>หมายเหตุ:</b> {rfq.note || '-'}</p>
                    </div>
                    <div className={styles.rightActions}>
                        <button className={styles.secondary} onClick={exportPdf}>ส่งออก PDF</button>
                        <button className={styles.primary} onClick={goQuotation}>เพิ่มใบเสนอราคา</button>
                        <button className={styles.danger} onClick={closeRFQ}>ปิด RFQ</button>
                    </div>
                </div>
            </section>

            {/* Attachments & Invite suppliers */}
            <section className={styles.gridTwoCols}>
                <div className={styles.card}>
                    <div className={styles.cardTitleRow}>
                        <h3>ไฟล์แนบ (Attachments)</h3>
                        <button className={styles.ghost} onClick={addAttachment}>+ แนบไฟล์</button>
                    </div>
                    {rfq.attachments.length === 0 ? (
                        <div className={styles.emptyBox}>ไม่มีไฟล์แนบ</div>
                    ) : (
                        <ul className={styles.attachList}>
                            {rfq.attachments.map((f, idx) => (
                                <li key={idx}>
                                    <span className={styles.mono}>{f.name}</span>
                                    <span className={styles.muted}>{f.size}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className={styles.card}>
                    <div className={styles.cardTitleRow}>
                        <h3>เชิญผู้ขาย (Invited)</h3>
                        <button className={styles.ghost} onClick={inviteSupplier}>+ เชิญผู้ขาย</button>
                    </div>
                    {rfq.invitedSuppliers.length === 0 ? (
                        <div className={styles.emptyBox}>ยังไม่ได้เชิญผู้ขาย</div>
                    ) : (
                        <table className={styles.tableSm}>
                            <thead>
                                <tr><th>ชื่อผู้ขาย</th><th>อีเมล</th><th>เวลาที่เชิญ</th></tr>
                            </thead>
                            <tbody>
                                {rfq.invitedSuppliers.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.name}</td><td>{s.email}</td><td>{s.invited_at}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Items */}
            <section className={styles.card}>
                <div className={styles.cardTitleRow}>
                    <h3>รายการสินค้า</h3>
                    <div className={styles.rowGap}>
                        <input className={styles.input} placeholder="ค้นหาในรายการ…" value={searchItem} onChange={e => setSearchItem(e.target.value)} />
                        <button className={styles.ghost} onClick={addItem}>+ เพิ่มรายการ</button>
                    </div>
                </div>

                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>รหัส</th>
                                <th>ชื่อสินค้า</th>
                                <th>จำนวน</th>
                                <th>หน่วย</th>
                                <th>หมายเหตุ</th>
                                <th style={{ width: 120 }}>จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((row, idx) => (
                                <tr key={idx}>
                                    <td className={styles.mono}>{row.code}</td>
                                    <td>{row.name}</td>
                                    <td>{row.qty}</td>
                                    <td>{row.unit}</td>
                                    <td className={styles.muted}>{row.remark || '-'}</td>
                                    <td>
                                        <div className={styles.tableActions}>
                                            <button className={styles.linkBtn} onClick={() => editItem(row.code)}>แก้ไข</button>
                                            <button className={styles.linkBtnDanger} onClick={() => deleteItem(row.code)}>ลบ</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr><td className={styles.empty} colSpan={6}>ไม่พบรายการ</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Timeline / Activity */}
            <section className={styles.card}>
                <h3>กิจกรรม (Timeline)</h3>
                <ul className={styles.timeline}>
                    {rfq.timeline.map((ev, i) => (
                        <li key={i}><span className={styles.mono}>{ev.t}</span> — {ev.ev}</li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
