'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

/** ───── MOCK DATA (อยู่ในไฟล์นี้) ───── */
const MOCK = {
    rfqs: [
        { id: 'RFQ-2025-001', date: '2025-08-19', status: 'sent' },
        { id: 'RFQ-2025-002', date: '2025-08-21', status: 'waiting_selection' },
        { id: 'RFQ-2025-003', date: '2025-08-22', status: 'closed' },
    ],
    pos: [
        { id: 'PO-2025-001', date: '2025-08-21', supplier: 'บจก.เมดิคอลพลัส', total: 9800, status: 'approved', received: false },
        { id: 'PO-2025-002', date: '2025-08-22', supplier: 'หจก.สุขภาพดี', total: 15200, status: 'completed', received: true },
        { id: 'PO-2025-003', date: '2025-08-23', supplier: 'บจก.ฟาร์มาพลัส', total: 6200, status: 'waiting_approval', received: false },
    ],
    grs: [
        { id: 'GR-2025-001', date: '2025-08-25', po_no: 'PO-2025-001', receiver: 'คลัง A', good: 50, damaged: 0, returned: 0 },
        { id: 'GR-2025-002', date: '2025-08-26', po_no: 'PO-2025-002', receiver: 'คลัง A', good: 25, damaged: 2, returned: 3 },
    ],
    inventory: [
        { code: 'MED001', name: 'ยาพาราเซตามอล 500mg', stock: 15, reorder_point: 20, unit: 'กล่อง' },
        { code: 'MED010', name: 'แอลกอฮอล์ 70%', stock: 60, reorder_point: 50, unit: 'ขวด' },
        { code: 'GEN005', name: 'กระดาษทิชชู่ 2 ชั้น', stock: 12, reorder_point: 30, unit: 'แพ็ค' },
        { code: 'MED020', name: 'หน้ากากอนามัย 3 ชั้น', stock: 90, reorder_point: 60, unit: 'กล่อง' },
    ],
};
/** ─────────────────────────────── */

export default function PurchasingDashboardPage() {
    const router = useRouter();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => {
            setData(MOCK);
            setLoading(false);
        }, 200);
        return () => clearTimeout(t);
    }, []);

    const kpi = useMemo(() => {
        if (!data) return { rfqOpen: 0, poWaiting: 0, poAwaitGR: 0, lowStock: 0, spendMonth: 0 };
        const rfqOpen = data.rfqs.filter(r => r.status !== 'closed').length;
        const poWaiting = data.pos.filter(p => p.status === 'waiting_approval').length;
        const poAwaitGR = data.pos.filter(p => p.status === 'approved' && !p.received).length;
        const lowStock = data.inventory.filter(i => i.stock < i.reorder_point).length;
        const spendMonth = data.pos.reduce((a, p) => a + (p.total || 0), 0);
        return { rfqOpen, poWaiting, poAwaitGR, lowStock, spendMonth };
    }, [data]);

    const lowStockList = useMemo(() => {
        if (!data) return [];
        return data.inventory
            .filter(i => i.stock < i.reorder_point)
            .sort((a, b) => (a.stock - a.reorder_point) - (b.stock - b.reorder_point))
            .slice(0, 5);
    }, [data]);

    const recentRFQ = useMemo(() => (data?.rfqs || []).slice(0, 5), [data]);
    const recentPO = useMemo(() => (data?.pos || []).slice(0, 5), [data]);
    const recentGR = useMemo(() => (data?.grs || []).slice(0, 5), [data]);

    const spendBySupplier = useMemo(() => {
        if (!data) return [];
        const map = new Map();
        for (const p of data.pos) {
            const key = p.supplier || '-';
            map.set(key, (map.get(key) || 0) + (p.total || 0));
        }
        return Array.from(map.entries())
            .map(([supplier, total]) => ({ supplier, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [data]);

    const goto = (path) => router.push(path);

    if (loading) return <main style={wrap}><div style={empty}>Loading...</div></main>;

    return (
        <main style={wrap}>
            {/* Header */}
            <section style={head}>
                <div>
                    <h1 style={title}>Purchasing Dashboard</h1>
                    <div style={muted}>ภาพรวมงานจัดซื้อวันนี้ • {new Date().toLocaleDateString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={ghostBtn} onClick={() => goto('/purchasing/rfq')}>ไปหน้า RFQ</button>
                    <button style={ghostBtn} onClick={() => goto('/purchasing/po')}>ไปหน้า PO</button>
                    <button style={primaryBtn} onClick={() => goto('/purchasing/reports')}>ดูรายงาน</button>
                </div>
            </section>

            {/* KPI Cards */}
            <section style={grid4}>
                <KpiCard label="RFQ ที่เปิดอยู่" value={kpi.rfqOpen} hint="ยังไม่ปิด/ยังไม่คัดเลือก" onClick={() => goto('/purchasing/rfq')} />
                <KpiCard label="PO รออนุมัติ" value={kpi.poWaiting} onClick={() => goto('/purchasing/po')} />
                <KpiCard label="PO รอรับของ (GR)" value={kpi.poAwaitGR} onClick={() => goto('/purchasing/gr/history')} />
                <KpiCard label="รายการต่ำกว่า ROP" value={kpi.lowStock} onClick={() => goto('/purchasing/inventory')} />
            </section>

            {/* Quick actions */}
            <section style={card}>
                <h3 style={h3}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={primaryBtn} onClick={() => goto('/purchasing/inventory')}>ตรวจสต็อก & สร้าง RFQ</button>
                    <button style={ghostBtn} onClick={() => goto('/purchasing/suppliers')}>จัดการผู้ขาย</button>
                    <button style={ghostBtn} onClick={() => goto('/purchasing/gr/history')}>ดูประวัติ GR</button>
                </div>
            </section>

            {/* Two columns */}
            <section style={grid2}>
                {/* Left: Recent */}
                <div style={card}>
                    <h3 style={h3}>กิจกรรมล่าสุด</h3>

                    <h4 style={h4}>RFQ</h4>
                    <MiniTable
                        headers={['เลขที่', 'วันที่', 'สถานะ']}
                        rows={recentRFQ.map(r => [r.id, r.date, r.status])}
                        emptyText="ยังไม่มี RFQ"
                    />

                    <div style={{ height: 8 }} />

                    <h4 style={h4}>PO</h4>
                    <MiniTable
                        headers={['เลขที่', 'วันที่', 'ผู้ขาย', 'ยอด', 'สถานะ']}
                        rows={recentPO.map(p => [p.id, p.date, p.supplier, fmt(p.total), p.status])}
                        emptyText="ยังไม่มี PO"
                    />

                    <div style={{ height: 8 }} />

                    <h4 style={h4}>GR</h4>
                    <MiniTable
                        headers={['เลขที่', 'วันที่', 'PO', 'ผู้รับ', 'Good/Dmg/Ret']}
                        rows={recentGR.map(g => [g.id, g.date, g.po_no, g.receiver, `${g.good}/${g.damaged}/${g.returned}`])}
                        emptyText="ยังไม่มี GR"
                    />
                </div>

                {/* Right: Low stock & Spend by supplier */}
                <div style={{ display: 'grid', gap: 12 }}>
                    <div style={card}>
                        <div style={rowBetween}>
                            <h3 style={h3}>ต่ำกว่า ROP (Top 5)</h3>
                            <button style={linkBtn} onClick={() => goto('/purchasing/inventory')}>ไปสต็อก →</button>
                        </div>
                        <div style={{ overflow: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                                <thead>
                                    <tr style={theadRow}>
                                        <th style={th}>รหัส</th>
                                        <th style={th}>ชื่อสินค้า</th>
                                        <th style={{ ...th, textAlign: 'right' }}>คงเหลือ</th>
                                        <th style={{ ...th, textAlign: 'right' }}>จุดสั่งซื้อ</th>
                                        <th style={th}>หน่วย</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockList.length === 0 ? (
                                        <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#6b7280' }}>ไม่มีรายการต่ำกว่า ROP</td></tr>
                                    ) : lowStockList.map(i => (
                                        <tr key={i.code}>
                                            <td style={tdMono}>{i.code}</td>
                                            <td style={td}>{i.name}</td>
                                            <td style={{ ...td, textAlign: 'right' }}>{i.stock}</td>
                                            <td style={{ ...td, textAlign: 'right' }}>{i.reorder_point}</td>
                                            <td style={td}>{i.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={card}>
                        <h3 style={h3}>มูลค่าจัดซื้อแยกตามผู้ขาย (Top 5)</h3>
                        <div style={{ overflow: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                                <thead>
                                    <tr style={theadRow}>
                                        <th style={th}>ผู้ขาย</th>
                                        <th style={{ ...th, textAlign: 'right' }}>มูลค่ารวม</th>
                                        <th style={{ ...th, textAlign: 'right' }}>สัดส่วน</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {spendBySupplier.length === 0 ? (
                                        <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: '#6b7280' }}>ไม่มีข้อมูล</td></tr>
                                    ) : spendBySupplier.map((r, idx) => {
                                        const totalAll = kpi.spendMonth || 1;
                                        const pct = (r.total / totalAll) * 100;
                                        return (
                                            <tr key={idx}>
                                                <td style={td}>{r.supplier}</td>
                                                <td style={{ ...td, textAlign: 'right' }}>{fmt(r.total)}</td>
                                                <td style={{ ...td, textAlign: 'right' }}>
                                                    {pct.toFixed(1)}%
                                                    <div style={barWrap}>
                                                        <div style={{ ...barFill, width: `${Math.min(100, pct)}%` }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}

/** ───── Components ───── */
function KpiCard({ label, value, hint, onClick }) {
    return (
        <button style={kpiCard} onClick={onClick}>
            <div style={kpiValue}>{value}</div>
            <div style={kpiLabel}>{label}</div>
            {hint ? <div style={kpiHint}>{hint}</div> : null}
        </button>
    );
}
function MiniTable({ headers, rows, emptyText }) {
    return (
        <div style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                    <tr style={theadRow}>
                        {headers.map((h, i) => (<th key={i} style={th}>{h}</th>))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr><td colSpan={headers.length} style={{ ...td, textAlign: 'center', color: '#6b7280' }}>{emptyText || 'ไม่มีข้อมูล'}</td></tr>
                    ) : rows.map((r, i) => (
                        <tr key={i}>
                            {r.map((c, j) => (<td key={j} style={td}>{c}</td>))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** ───── helpers & styles ───── */
function fmt(n) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const wrap = { padding: 20, background: '#f3f4f6', minHeight: '100vh' };
const head = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 };
const title = { fontSize: '1.4rem', fontWeight: 700, margin: 0 };
const muted = { color: '#6b7280' };

const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 };
const grid2 = { display: 'grid', gridTemplateColumns: '2fr 1.4fr', gap: 12, alignItems: 'start' };

const card = { background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
const h3 = { margin: '0 0 8px 0' };
const h4 = { margin: '6px 0', fontWeight: 600 };

const primaryBtn = { background: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' };
const ghostBtn = { background: '#fff', color: '#111827', border: '1px solid #d1d5db', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' };
const linkBtn = { background: 'transparent', color: '#2563eb', border: 'none', cursor: 'pointer', padding: 0 };

const theadRow = { background: '#f3f4f6' };
const th = { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' };
const td = { padding: 10, borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };
const tdMono = { ...td, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };

const empty = { padding: 16, textAlign: 'center', color: '#6b7280', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };

const kpiCard = { ...card, display: 'grid', gap: 4, alignContent: 'center', cursor: 'pointer', textAlign: 'left' };
const kpiValue = { fontSize: '1.6rem', fontWeight: 800, lineHeight: 1 };
const kpiLabel = { color: '#374151', fontWeight: 600 };
const kpiHint = { color: '#6b7280', fontSize: 12 };

const rowBetween = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };

const barWrap = { height: 6, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden', marginTop: 4, marginLeft: 8 };
const barFill = { height: '100%', background: '#2563eb' };


