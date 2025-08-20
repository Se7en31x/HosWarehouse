'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

/** ข้อมูลจำลอง */
const MOCK_ITEMS = [
  { item_id: 1, code: 'MED001', name: 'ยาพาราเซตามอล 500mg', remain: 15, reorder_point: 20, unit: 'กล่อง' },
  { item_id: 2, code: 'SUP002', name: 'ถุงมือยาง ไซส์ M',        remain: 200, reorder_point: 100, unit: 'กล่อง' },
  { item_id: 3, code: 'MED010', name: 'แอลกอฮอล์ 70%',         remain: 8,  reorder_point: 30,  unit: 'ขวด' },
  { item_id: 4, code: 'GEN005', name: 'กระดาษทิชชู่ 2 ชั้น',    remain: 0,  reorder_point: 10,  unit: 'แพ็ค' },
];

const StatusBadge = ({ remain, rop }) => {
  if (remain <= 0) return <span className={`${styles.badge} ${styles.danger}`}>หมดสต็อก</span>;
  if (remain < rop) return <span className={`${styles.badge} ${styles.warn}`}>ต่ำกว่าจุดสั่งซื้อ</span>;
  return <span className={`${styles.badge} ${styles.ok}`}>ปกติ</span>;
};

export default function InventoryCheckMockPage() {
  // data
  const [items, setItems] = useState([]);
  // selection + qty
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [qtyById, setQtyById] = useState({}); // { item_id: number }
  // filters
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('below'); // all | below | oos
  // paging
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => { setItems(MOCK_ITEMS); }, []);

  /** base = apply search เท่านั้น (ไว้เอาไปนับจำนวนแต่ละหมวดด้วย) */
  const base = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter(x =>
      !s ||
      x.code.toLowerCase().includes(s) ||
      x.name.toLowerCase().includes(s)
    );
  }, [items, search]);

  /** นับจำนวนตามหมวด (นับหลังค้นหาแล้ว) */
  const counts = useMemo(() => {
    const all = base.length;
    const below = base.filter(x => x.remain < x.reorder_point).length;
    const oos = base.filter(x => x.remain <= 0).length;
    return { all, below, oos };
  }, [base]);

  /** filtered ตาม viewMode */
  const filtered = useMemo(() => {
    if (viewMode === 'below') return base.filter(x => x.remain < x.reorder_point);
    if (viewMode === 'oos')   return base.filter(x => x.remain <= 0);
    return base;
  }, [base, viewMode]);

  /** แนะนำจำนวน */
  const suggestQty = (row) => Math.max(1, (row.reorder_point - row.remain) || 0);

  /** เลือก/ยกเลิกรายการ */
  const toggleSelect = (row) => {
    const next = new Set(selectedIds);
    const nextQty = { ...qtyById };
    if (next.has(row.item_id)) {
      next.delete(row.item_id);
      delete nextQty[row.item_id];
    } else {
      next.add(row.item_id);
      if (nextQty[row.item_id] == null) nextQty[row.item_id] = suggestQty(row);
    }
    setSelectedIds(next);
    setQtyById(nextQty);
  };

  /** เลือกทั้งหน้า / ยกเลิกทั้งหน้า */
  const start = (page - 1) * pageSize;
  const end   = start + pageSize;
  const pageItems = filtered.slice(start, end);
  const allSelectedPage = pageItems.length > 0 && pageItems.every(x => selectedIds.has(x.item_id));
  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    const nextQty = { ...qtyById };
    if (allSelectedPage) {
      pageItems.forEach(x => { next.delete(x.item_id); delete nextQty[x.item_id]; });
    } else {
      pageItems.forEach(x => {
        next.add(x.item_id);
        if (nextQty[x.item_id] == null) nextQty[x.item_id] = suggestQty(x);
      });
    }
    setSelectedIds(next);
    setQtyById(nextQty);
  };

  const setQty = (id, raw) => {
    const n = Number(raw);
    const safe = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    setQtyById(prev => ({ ...prev, [id]: safe }));
  };

  /** เติมจำนวนแนะนำ / ล้างจำนวน เฉพาะรายการที่ถูกเลือก (ทั่วทั้งผลลัพธ์ ไม่ใช่เฉพาะหน้านี้) */
  const fillSuggestedForSelected = () => {
    const next = { ...qtyById };
    items.forEach(r => { if (selectedIds.has(r.item_id)) next[r.item_id] = suggestQty(r); });
    setQtyById(next);
  };
  const clearQtyForSelected = () => {
    const next = { ...qtyById };
    items.forEach(r => { if (selectedIds.has(r.item_id)) next[r.item_id] = 0; });
    setQtyById(next);
  };

  /** รายการที่เลือกจริง ๆ (ข้ามหน้าก็ยังถูกเลือกอยู่) */
  const selectedList = useMemo(
    () => items.filter(x => selectedIds.has(x.item_id)).map(x => ({ ...x, qty: Number(qtyById[x.item_id] || 0) })),
    [items, selectedIds, qtyById]
  );
  const validLines = selectedList.filter(x => x.qty > 0);
  const totalQty = validLines.reduce((a, r) => a + r.qty, 0);

  /** สร้าง RFQ / PO (mock) */
  const createRFQ = () => {
    if (validLines.length === 0) return alert('กรุณาเลือกสินค้าและระบุจำนวน (> 0) อย่างน้อย 1 รายการ');
    const payload = validLines.map(({ item_id, code, name, unit, qty }) => ({ item_id, code, name, unit, qty }));
    alert('(Mock) สร้าง RFQ:\n' + JSON.stringify(payload, null, 2));
  };
  const createPOQuick = () => {
    if (validLines.length === 0) return alert('กรุณาเลือกสินค้าและระบุจำนวน (> 0) อย่างน้อย 1 รายการ');
    const payload = validLines.map(({ item_id, code, name, unit, qty }) => ({ item_id, code, name, unit, qty }));
    alert('(Mock) สร้าง PO:\n' + JSON.stringify(payload, null, 2));
  };

  /** เปลี่ยนมุมมองแล้วรีเซ็ตหน้าไปหน้า 1 */
  const switchView = (mode) => { setViewMode(mode); setPage(1); };

  /** เปลี่ยนหน้า */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const gotoPrev = () => setPage(p => Math.max(1, p - 1));
  const gotoNext = () => setPage(p => Math.min(totalPages, p + 1));

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>ตรวจสอบสต็อก (Inventory Check)</h1>
        <p className={styles.subtitle}>
          เลือกสินค้าที่ “ต่ำกว่า ROP” และกำหนดจำนวนที่ต้องการ (แก้ไขได้อีกใน RFQ/PO)
        </p>
      </header>

      <section className={styles.toolbar}>
        <input
          className={styles.input}
          placeholder="ค้นหา: รหัส/ชื่อสินค้า"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />

        {/* ตัวเลือกมุมมอง */}
        <div style={{ display:'flex', gap:6 }}>
          <button
            onClick={() => switchView('all')}
            className={styles.secondary}
            aria-pressed={viewMode==='all'}
            style={viewMode==='all' ? { borderColor:'#2563eb', color:'#2563eb' } : undefined}
          >
            ทั้งหมด ({counts.all})
          </button>
          <button
            onClick={() => switchView('below')}
            className={styles.secondary}
            aria-pressed={viewMode==='below'}
            style={viewMode==='below' ? { borderColor:'#2563eb', color:'#2563eb' } : undefined}
          >
            ต่ำกว่า ROP ({counts.below})
          </button>
          <button
            onClick={() => switchView('oos')}
            className={styles.secondary}
            aria-pressed={viewMode==='oos'}
            style={viewMode==='oos' ? { borderColor:'#2563eb', color:'#2563eb' } : undefined}
          >
            หมดสต็อก ({counts.oos})
          </button>
        </div>

        <div className={styles.spacer} />

        {/* actions จำนวน */}
        <button className={styles.secondary} onClick={fillSuggestedForSelected} disabled={selectedIds.size===0}>
          เติมจำนวนแนะนำ
        </button>
        <button className={styles.secondary} onClick={clearQtyForSelected} disabled={selectedIds.size===0}>
          ล้างจำนวน
        </button>

        <button className={styles.primary}  disabled={validLines.length===0} onClick={createRFQ}>สร้าง RFQ</button>
        <button className={styles.secondary} disabled={validLines.length===0} onClick={createPOQuick}>สร้าง PO ทันที</button>
      </section>

      <section className={styles.card}>
        <div className={styles.tableWrap} role="region" aria-label="ตารางรายการสต็อก">
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <input
                    type="checkbox"
                    aria-label="เลือกทั้งหมดในหน้านี้"
                    checked={allSelectedPage}
                    onChange={toggleSelectAllPage}
                  />
                </th>
                <th>รหัส</th>
                <th>ชื่อรายการ</th>
                <th>คงเหลือ</th>
                <th>จุดสั่งซื้อ</th>
                <th>หน่วย</th>
                <th>สถานะ</th>
                <th style={{ width: 140, textAlign: 'right' }}>สั่งซื้อ (จำนวน)</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className={styles.empty}>ไม่พบรายการ</td>
                </tr>
              ) : (
                pageItems.map((row) => {
                  const checked = selectedIds.has(row.item_id);
                  const qty = qtyById[row.item_id] ?? '';
                  return (
                    <tr key={row.item_id} className={checked ? styles.rowSelected : undefined}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`เลือกรายการ ${row.code}`}
                          checked={checked}
                          onChange={() => toggleSelect(row)}
                        />
                      </td>
                      <td className={styles.mono}>{row.code}</td>
                      <td>{row.name}</td>
                      <td className={row.remain <= 0 ? styles.dangerText : undefined}>{row.remain}</td>
                      <td>{row.reorder_point}</td>
                      <td>{row.unit}</td>
                      <td><StatusBadge remain={row.remain} rop={row.reorder_point} /></td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={qty}
                          onChange={(e) => setQty(row.item_id, e.target.value)}
                          disabled={!checked}
                          aria-label={`จำนวนสั่งซื้อของ ${row.code}`}
                          style={{
                            width: 110,
                            padding: '6px 8px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            background: checked ? '#fff' : '#f3f4f6',
                            color: checked ? '#111827' : '#6b7280',
                            textAlign: 'right',
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px' }}>
          <div>แสดงหน้า <b>{page}</b> / {totalPages}</div>
          <button className={styles.secondary} onClick={gotoPrev} disabled={page<=1}>ก่อนหน้า</button>
          <button className={styles.secondary} onClick={gotoNext} disabled={page>=totalPages}>ถัดไป</button>
          <div style={{ marginLeft:'auto' }}>
            <label style={{ marginRight:6 }}>ต่อหน้า</label>
            <select
              className={styles.input}
              value={pageSize}
              onChange={(e)=>{ setPageSize(Number(e.target.value)||20); setPage(1); }}
              style={{ width: 90 }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <footer className={styles.footer}>
          <div>
            เลือกแล้ว <strong>{selectedIds.size}</strong> รายการ • รวมจำนวนที่จะสั่ง <strong>{totalQty}</strong>
          </div>
          <div className={styles.hint}>
            * จำนวนแนะนำ = max(1, จุดสั่งซื้อ − คงเหลือ). กำหนดจำนวนได้ตั้งแต่ตรงนี้ และยังแก้ไขได้อีกในหน้า RFQ/PO
          </div>
        </footer>
      </section>
    </main>
  );
}
