"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { Download, Filter, Calendar, RefreshCw, BarChart2, Search } from "lucide-react";
import dynamic from "next/dynamic";
const Select = dynamic(() => import("react-select"), { ssr: false });

/**
 * Generic Reports page
 * - UI รูปแบบเดียวกับหน้าอื่น ๆ: Toolbar ด้านบน + Grid Table + ปุ่ม Export
 * - รองรับ 4 กลุ่มรายงาน (Inventory / Operations / Procurement / Supplier)
 * - ดึง metadata จาก backend ถ้ามี (meta.columns) ไม่มีก็ fallback จาก reportsMeta
 */

// -------- Options (ตัวอย่าง; สามารถดึงจริงจาก API ได้) --------
const GROUPS = [
  { key: "inventory", label: "Inventory" },
  { key: "operations", label: "Operations" },
  { key: "procurement", label: "Procurement" },
  { key: "supplier", label: "Supplier & Pricing" },
];

const REPORTS_BY_GROUP = {
  inventory: [
    { key: "stock-balance", label: "สต๊อกคงเหลือ + มูลค่า" },
    { key: "kardex", label: "Stock Card / Kardex" },
    { key: "fast-slow", label: "Fast/Slow-moving" },
    { key: "near-expiry", label: "ใกล้หมดอายุ" },
  ],
  operations: [
    { key: "req-status", label: "คำขอตามสถานะ" },
    { key: "req-leadtime", label: "อายุงานคำขอ (Lead time)" },
    { key: "approval-outcome", label: "ผลการอนุมัติ" },
    { key: "ready-deduct", label: "พร้อมตัดสต๊อก" },
    { key: "approved-vs-deducted", label: "Approved vs Deducted" },
  ],
  procurement: [
    { key: "rfq-aging", label: "RFQ Aging & Hit Rate" },
    { key: "po-aging", label: "PO Status & Aging" },
    { key: "po-vs-gr", label: "PO vs GR" },
  ],
  supplier: [
    { key: "price-history", label: "Price History & Supplier" },
  ],
};

// -------- Fallback columns ถ้า backend ยังไม่ส่ง meta.columns --------
const reportsMeta = {
  "stock-balance": {
    columns: [
      { key: "code", label: "รหัส" },
      { key: "name", label: "รายการ" },
      { key: "category", label: "หมวดหมู่" },
      { key: "location", label: "สถานที่" },
      { key: "lot_no", label: "ล็อต" },
      { key: "expiry_date", label: "หมดอายุ" },
      { key: "qty_on_hand", label: "คงเหลือ" },
      { key: "unit", label: "หน่วย" },
      { key: "stock_value", label: "มูลค่า" },
    ],
  },
  kardex: {
    columns: [
      { key: "txn_at", label: "วันที่" },
      { key: "ref_type", label: "อ้างอิง" },
      { key: "ref_no", label: "เลขที่" },
      { key: "lot_no", label: "ล็อต" },
      { key: "qty_in", label: "เข้า" },
      { key: "qty_out", label: "ออก" },
      { key: "balance_after", label: "คงเหลือ" },
    ],
  },
  "fast-slow": {
    columns: [
      { key: "code", label: "รหัส" },
      { key: "name", label: "รายการ" },
      { key: "movement", label: "ปริมาณเคลื่อนไหว" },
      { key: "class", label: "จัดกลุ่ม" },
    ],
  },
  "near-expiry": {
    columns: [
      { key: "code", label: "รหัส" },
      { key: "name", label: "รายการ" },
      { key: "lot_no", label: "ล็อต" },
      { key: "expiry_date", label: "วันหมดอายุ" },
      { key: "days_to_expire", label: "เหลือ (วัน)" },
      { key: "qty_on_hand", label: "คงเหลือ" },
    ],
  },
  "req-status": {
    columns: [
      { key: "request_status", label: "สถานะ" },
      { key: "count", label: "จำนวน" },
    ],
  },
  "req-leadtime": {
    columns: [
      { key: "step", label: "ขั้นตอน" },
      { key: "avg_minutes", label: "เฉลี่ย (นาที)" },
      { key: "p90_minutes", label: "P90 (นาที)" },
    ],
  },
  "approval-outcome": {
    columns: [
      { key: "approver", label: "ผู้อนุมัติ" },
      { key: "approved", label: "ผ่าน" },
      { key: "rejected", label: "ปฏิเสธ" },
      { key: "partial", label: "บางส่วน" },
    ],
  },
  "ready-deduct": {
    columns: [
      { key: "request_code", label: "เลขที่คำขอ" },
      { key: "department", label: "แผนก" },
      { key: "request_date", label: "วันที่ขอ" },
      { key: "qty_to_deduct", label: "รอตัด (รวม)" },
    ],
  },
  "approved-vs-deducted": {
    columns: [
      { key: "request_code", label: "เลขที่คำขอ" },
      { key: "item", label: "รายการ" },
      { key: "approved_qty", label: "อนุมัติ" },
      { key: "deducted_qty", label: "ตัดแล้ว" },
      { key: "gap", label: "ต่าง" },
    ],
  },
  "rfq-aging": {
    columns: [
      { key: "rfq_no", label: "RFQ" },
      { key: "supplier", label: "ผู้ขาย" },
      { key: "days_open", label: "ค้าง (วัน)" },
      { key: "status", label: "สถานะ" },
    ],
  },
  "po-aging": {
    columns: [
      { key: "po_no", label: "PO" },
      { key: "supplier", label: "ผู้ขาย" },
      { key: "po_date", label: "วันที่สั่ง" },
      { key: "days_overdue", label: "เกินกำหนด (วัน)" },
      { key: "status", label: "สถานะ" },
    ],
  },
  "po-vs-gr": {
    columns: [
      { key: "po_no", label: "PO" },
      { key: "item_name", label: "รายการ" },
      { key: "qty_ordered", label: "สั่ง" },
      { key: "qty_received", label: "รับ" },
      { key: "qty_diff", label: "ต่าง" },
    ],
  },
  "price-history": {
    columns: [
      { key: "item_name", label: "รายการ" },
      { key: "supplier", label: "ผู้ขาย" },
      { key: "unit_price", label: "ราคา/หน่วย" },
      { key: "effective_date", label: "มีผลวันที่" },
    ],
  },
};

const categoryOptions = [
  { value: "", label: "ทุกหมวด" },
  { value: "ยา", label: "ยา" },
  { value: "เวชภัณฑ์", label: "เวชภัณฑ์" },
  { value: "ครุภัณฑ์", label: "ครุภัณฑ์" },
  { value: "อุปกรณ์ทางการแพทย์", label: "อุปกรณ์ทางการแพทย์" },
  { value: "ของใช้ทั่วไป", label: "ของใช้ทั่วไป" },
];

const locationOptions = [
  { value: "", label: "ทุกสถานที่" },
  { value: "main", label: "คลังกลาง" },
  { value: "pharmacy", label: "ห้องยา" },
];

const statusOptions = [
  { value: "", label: "ทุกสถานะ" },
  { value: "pending", label: "รอดำเนินการ" },
  { value: "approved_all", label: "อนุมัติทั้งหมด" },
  { value: "approved_partial_and_rejected_partial", label: "อนุมัติ/ปฏิเสธบางส่วน" },
  { value: "preparing", label: "กำลังเตรียม" },
  { value: "delivering", label: "กำลังส่งมอบ" },
  { value: "completed", label: "เสร็จสิ้น" },
  { value: "canceled", label: "ยกเลิก" },
];

const customSelectStyles = {
  control: (base) => ({ ...base, minHeight: 40, borderColor: "var(--border)", boxShadow: "none" }),
  menu: (base) => ({ ...base, zIndex: 20 }),
};

export default function ReportsPage() {
  const [group, setGroup] = useState(GROUPS[0].key);
  const [reportKey, setReportKey] = useState(REPORTS_BY_GROUP[GROUPS[0].key][0].key);

  // filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null); // { key, version, columns }

  const reportsInGroup = useMemo(() => REPORTS_BY_GROUP[group] || [], [group]);

  useEffect(() => {
    // reset report เมื่อเปลี่ยน group
    setReportKey(reportsInGroup[0]?.key || "");
  }, [group]);

  const buildParams = () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (category) params.set("category", category);
    if (location) params.set("location", location);
    if (status) params.set("status", status);
    if (searchText) params.set("q", searchText.trim());
    return params.toString();
  };

  const runReport = async () => {
    try {
      setLoading(true);
      setRows([]);
      setMeta(null);

      // เรียก API จริง: `/api/reports/[key]`
      const qs = buildParams();
      const res = await fetch(`/api/reports/${reportKey}${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Fetch report failed");
      const json = await res.json();

      const incomingColumns = json?.meta?.columns;
      setMeta(json?.meta || { key: reportKey, version: 1, columns: incomingColumns || reportsMeta[reportKey]?.columns || [] });
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch (e) {
      console.error(e);
      // fallback: ใช้ columns จาก reportsMeta และแสดงค่าว่าง
      setMeta({ key: reportKey, version: 1, columns: reportsMeta[reportKey]?.columns || [] });
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!meta?.columns?.length) return;
    const headers = meta.columns.map((c) => c.label);
    const keys = meta.columns.map((c) => c.key);
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const row = keys.map((k) => {
        const val = r[k] ?? "";
        // escape commas/quotes/newlines
        const s = String(val).replaceAll('"', '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(row.join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns = meta?.columns || reportsMeta[reportKey]?.columns || [];

  return (
    <div className={styles.main}>
      <div className={styles.headerBar}>
        <div className={styles.titleWrap}>
          <BarChart2 className={styles.icon} />
          <h1 className={styles.title}>Reports</h1>
        </div>
        <div className={styles.tabsWrap}>
          {GROUPS.map((g) => (
            <button
              key={g.key}
              className={`${styles.tabBtn} ${group === g.key ? styles.active : ""}`}
              onClick={() => setGroup(g.key)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary tabs: รายงานในกลุ่ม */}
      <div className={styles.subTabs}>
        {(reportsInGroup || []).map((r) => (
          <button
            key={r.key}
            className={`${styles.subTabBtn} ${reportKey === r.key ? styles.active : ""}`}
            onClick={() => setReportKey(r.key)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGrid}>
          <div className={styles.filterGroup}>
            <label className={styles.label}>จากวันที่</label>
            <div className={styles.inputWrap}>
              <Calendar size={16} />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.label}>ถึงวันที่</label>
            <div className={styles.inputWrap}>
              <Calendar size={16} />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.label}>หมวดหมู่</label>
            <Select options={categoryOptions} styles={customSelectStyles} isSearchable={false}
              value={categoryOptions.find(o => o.value === category) || categoryOptions[0]}
              onChange={(opt) => setCategory(opt?.value ?? "")}
            />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.label}>สถานที่</label>
            <Select options={locationOptions} styles={customSelectStyles} isSearchable={false}
              value={locationOptions.find(o => o.value === location) || locationOptions[0]}
              onChange={(opt) => setLocation(opt?.value ?? "")}
            />
          </div>
          {group === "operations" && (
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะคำขอ</label>
              <Select options={statusOptions} styles={customSelectStyles} isSearchable={false}
                value={statusOptions.find(o => o.value === status) || statusOptions[0]}
                onChange={(opt) => setStatus(opt?.value ?? "")}
              />
            </div>
          )}
          <div className={`${styles.filterGroup} ${styles.searchGroup}`}>
            <label className={styles.label}>ค้นหา</label>
            <div className={styles.inputWrap}>
              <Search size={16} />
              <input placeholder="พิมพ์คำค้น..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.runBtn} onClick={runReport} disabled={loading}>
            {loading ? <RefreshCw className={styles.spin} size={16} /> : <Filter size={16} />}
            <span>{loading ? "กำลังดึงข้อมูล..." : "รันรายงาน"}</span>
          </button>
          <button className={styles.exportBtn} onClick={exportCSV} disabled={!rows.length}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Result */}
      <div className={styles.resultPanel}>
        {/* Header summary */}
        <div className={styles.resultHeader}>
          <div className={styles.metaLeft}>
            <div className={styles.metaTitle}>{REPORTS_BY_GROUP[group].find(r => r.key === reportKey)?.label}</div>
            {meta?.version && (<div className={styles.metaSub}>version {meta.version}</div>)}
          </div>
          <div className={styles.metaRight}>
            <div className={styles.countBadge}>ผลลัพธ์ {rows.length} แถว</div>
          </div>
        </div>

        {/* Table */}
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          {columns.map((c) => (
            <div key={c.key} className={styles.headerItem}>{c.label}</div>
          ))}
        </div>

        <div className={styles.tableBody}>
          {loading && (
            <div className={styles.skeletonRows}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.skeletonRow}`}>
                  {columns.map((c) => (
                    <div key={c.key} className={styles.tableCell}>
                      <div className={styles.skelBox} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className={styles.emptyState}>ไม่มีข้อมูล — ปรับตัวกรองแล้วลองใหม่อีกครั้ง</div>
          )}

          {!loading && rows.length > 0 && rows.map((row, idx) => (
            <div key={idx} className={styles.tableGrid}>
              {columns.map((c) => (
                <div key={c.key} className={styles.tableCell}>
                  {formatCell(row[c.key])}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatCell(val) {
  if (val == null) return "";
  if (typeof val === "number") {
    const isInt = Number.isInteger(val);
    return isInt ? val.toLocaleString() : val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  // ISO date short
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    return val.slice(0, 10);
  }
  return String(val);
}
