"use client";

import { useEffect, useMemo, useState } from "react";
import axiosInstance from "@/app/utils/axiosInstance";
import Modal from "../components/HistoryModal";
import styles from "./page.module.css";

const fmtTH = (d) => (d ? new Date(d).toLocaleDateString("th-TH") : "-");
const num = (x) => Number(x || 0);

const statusClass = (s = "") => {
  const v = s.toLowerCase();
  if (v.includes("complete") || v.includes("เสร็จ")) return "ok";
  if (v.includes("pending") || v.includes("ค้าง") || v.includes("ยังไม่")) return "warn";
  return "neutral";
};

export default function HistoryPurchasingPage() {
  // data
  const [poRows, setPoRows] = useState([]);
  const [rfqRows, setRfqRows] = useState([]);
  const [grRows, setGrRows] = useState([]);

  // ui state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | completed | pending

  // modal
  const [open, setOpen] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mLoading, setMLoading] = useState(false);
  const [mContent, setMContent] = useState(null);
  const [modalVariant, setModalVariant] = useState("po"); // "po" | "rfq" | "gr"

  // load all
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setErr("");
      try {
        const [po, rfq, gr] = await Promise.all([
          axiosInstance.get("/historyPurchasing/po"),
          axiosInstance.get("/historyPurchasing/rfq"),
          axiosInstance.get("/historyPurchasing/gr"),
        ]);
        setPoRows(po?.data ?? []);
        setRfqRows(rfq?.data ?? []);
        setGrRows(gr?.data ?? []);
      } catch (e) {
        console.error(e);
        setErr("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // summary
  const summary = useMemo(() => {
    const poTotal = poRows.length;
    const poGrand = poRows.reduce((s, r) => s + num(r.grand_total), 0);
    const grCount = grRows.length;
    const grQty = grRows.reduce((s, r) => s + num(r.total_received), 0);
    const rfqCount = rfqRows.length;
    const rfqItems = rfqRows.reduce((s, r) => s + num(r.total_items), 0);
    return { poTotal, poGrand, grCount, grQty, rfqCount, rfqItems };
  }, [poRows, grRows, rfqRows]);

  // filters
  const matchQuery = (text) =>
    !query ||
    (text ?? "")
      .toString()
      .toLowerCase()
      .includes(query.trim().toLowerCase());

  const filterStatus = (status) => {
    if (statusFilter === "all") return true;
    const s = (status ?? "").toString().toLowerCase();
    if (statusFilter === "completed") return s.includes("complete") || s.includes("เสร็จ");
    if (statusFilter === "pending") return s.includes("pend") || s.includes("ค้าง") || s.includes("ยังไม่");
    return true;
  };

  const poFiltered = useMemo(
    () =>
      poRows.filter(
        (r) =>
          filterStatus(r.status) &&
          (matchQuery(r.po_no) ||
            matchQuery(r.supplier_name) ||
            matchQuery(fmtTH(r.po_date)))
      ),
    [poRows, query, statusFilter]
  );

  const rfqFiltered = useMemo(
    () =>
      rfqRows.filter(
        (r) =>
          filterStatus(r.status) &&
          (matchQuery(r.rfq_no) ||
            matchQuery(fmtTH(r.created_at)) ||
            matchQuery(r.status))
      ),
    [rfqRows, query, statusFilter]
  );

  const grFiltered = useMemo(
    () =>
      grRows.filter(
        (r) =>
          filterStatus(r.status) &&
          (matchQuery(r.gr_no) ||
            matchQuery(r.po_no) ||
            matchQuery(r.supplier_name) ||
            matchQuery(fmtTH(r.gr_date)))
      ),
    [grRows, query, statusFilter]
  );

  // modal handlers
  const openPODetail = async (row) => {
    setOpen(true);
    setMLoading(true);
    setModalVariant("po");
    setMTitle(`รายละเอียด PO ${row.po_no}`);
    try {
      const [itemsRes, grRes, srcRes] = await Promise.all([
        axiosInstance.get(`/historyPurchasing/po/${row.po_id}/items`),
        axiosInstance.get(`/historyPurchasing/po/${row.po_id}/gr`),
        axiosInstance.get(`/historyPurchasing/po/${row.po_id}/source-pr-items`),
      ]);
      const items = itemsRes?.data || [];
      const grs = grRes?.data || [];
      const src = srcRes?.data || [];

      const receivedSum = items.reduce((s, it) => s + Number(it.received_qty || 0), 0);
      const orderedSum = items.reduce((s, it) => s + Number(it.ordered_qty || 0), 0);
      const remainSum = items.reduce((s, it) => s + Math.max(0, Number(it.remaining_qty || 0)), 0);

      setMContent(
        <>
          {/* Key-Value */}
          <div className={modalCss.kvGrid}>
            <div className={modalCss.kv}><span>ผู้ขาย</span><strong>{row.supplier_name || "-"}</strong></div>
            <div className={modalCss.kv}><span>วันที่สั่งซื้อ</span><strong>{fmtTH(row.po_date)}</strong></div>
            <div className={modalCss.kv}><span>รวมมูลค่า</span><strong>{num(row.grand_total).toLocaleString()}</strong></div>
            <div className={modalCss.kv}><span>สถานะ</span><strong>{row.status || "-"}</strong></div>
          </div>

          {/* Stats */}
          <div className={modalCss.statRow}>
            <div className={modalCss.stat}><div className="v">{orderedSum.toLocaleString()}</div><div className="k">จำนวนสั่งรวม</div></div>
            <div className={modalCss.stat}><div className="v">{receivedSum.toLocaleString()}</div><div className="k">รับแล้วรวม</div></div>
            <div className={modalCss.stat}><div className="v">{remainSum.toLocaleString()}</div><div className="k">คงเหลือรวม</div></div>
          </div>

          {/* PO Items */}
          <div className={modalCss.section}>
            <div className={modalCss.sectionHead}>
              <h4>รายการใน PO</h4>
              <span className={`${modalCss.badge} ${modalCss[statusClass(row.status)]}`}>{row.status || "-"}</span>
            </div>
            <div className={modalCss.tableWrap}>
              <table className={modalCss.miniTable}>
                <thead>
                  <tr>
                    <th>สินค้า</th>
                    <th className={modalCss.right}>สั่ง</th>
                    <th className={modalCss.right}>รับแล้ว</th>
                    <th className={modalCss.right}>คงเหลือ</th>
                    <th className={modalCss.right}>ราคา</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.po_item_id}>
                      <td>{it.item_name}</td>
                      <td className={modalCss.right}>
                        {Number(it.ordered_qty || 0).toLocaleString()}{" "}
                        <span className={modalCss.pill}>{it.unit}</span>
                      </td>
                      <td className={modalCss.right}>{Number(it.received_qty || 0).toLocaleString()}</td>
                      <td className={modalCss.right}>{Number(it.remaining_qty || 0).toLocaleString()}</td>
                      <td className={modalCss.right}>{num(it.price).toLocaleString()}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5}>ไม่มีรายการ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Source PR via RFQ */}
          <div className={modalCss.section}>
            <div className={modalCss.sectionHead}><h4>ที่มาจาก PR (ผ่าน RFQ)</h4></div>
            <div className={modalCss.tableWrap}>
              <table className={modalCss.miniTable}>
                <thead>
                  <tr>
                    <th>PR</th>
                    <th>สินค้า</th>
                    <th className={modalCss.right}>ขอ</th>
                    <th className={modalCss.right}>RFQ</th>
                    <th>Spec</th>
                  </tr>
                </thead>
                <tbody>
                  {src.map((s) => (
                    <tr key={s.rfq_item_id}>
                      <td><span className={modalCss.tag}>PR#{s.pr_no}</span></td>
                      <td>{s.item_name}</td>
                      <td className={modalCss.nowrap}>{Number(s.requested_qty || 0).toLocaleString()} <span className={modalCss.pill}>{s.pr_unit}</span></td>
                      <td className={modalCss.nowrap}>{Number(s.rfq_qty || 0).toLocaleString()} <span className={modalCss.pill}>{s.rfq_unit}</span></td>
                      <td>{s.spec || "-"}</td>
                    </tr>
                  ))}
                  {src.length === 0 && (
                    <tr>
                      <td colSpan={5}>-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GR linked to PO */}
          <div className={modalCss.section}>
            <div className={modalCss.sectionHead}><h4>การรับของ (GR) ที่เชื่อมกับ PO นี้</h4></div>
            {grs.length === 0 ? (
              <p>ยังไม่มีการรับของ</p>
            ) : (
              <ul className={modalCss.timeline}>
                {grs.map((g) => (
                  <li key={g.gr_id}>
                    <strong>{g.gr_no}</strong> · {fmtTH(g.gr_date)} · {g.total_received} ชิ้น{" "}
                    <span className={`${modalCss.badge} ${modalCss[statusClass(g.status)]}`} style={{ marginLeft: 6 }}>
                      {g.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      );
    } catch (e) {
      console.error(e);
      setMContent(<p>ดึงข้อมูลรายละเอียดไม่สำเร็จ</p>);
    } finally {
      setMLoading(false);
    }
  };

  const openRFQDetail = async (row) => {
    setOpen(true);
    setMLoading(true);
    setModalVariant("rfq");
    setMTitle(`รายละเอียด RFQ ${row.rfq_no}`);
    try {
      const { data: items = [] } = await axiosInstance.get(
        `/historyPurchasing/rfq/${row.rfq_id}/items`
      );
      setMContent(
        <>
          <div className={modalCss.kvGrid}>
            <div className={modalCss.kv}><span>วันที่สร้าง</span><strong>{fmtTH(row.created_at)}</strong></div>
            <div className={modalCss.kv}><span>สถานะ</span><strong>{row.status || "-"}</strong></div>
            <div className={modalCss.kv}><span>รวม PR</span><strong>{row.total_pr}</strong></div>
            <div className={modalCss.kv}><span>รวมรายการ</span><strong>{row.total_items}</strong></div>
          </div>

          <div className={modalCss.section}>
            <div className={modalCss.sectionHead}>
              <h4>รายการใน RFQ</h4>
              <span className={`${modalCss.badge} ${modalCss[statusClass(row.status)]}`}>{row.status || "-"}</span>
            </div>
            <div className={modalCss.tableWrap}>
              <table className={modalCss.miniTable}>
                <thead>
                  <tr>
                    <th>PR</th>
                    <th>สินค้า</th>
                    <th className={modalCss.right}>จำนวน</th>
                    <th>หน่วย</th>
                    <th>Spec</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.rfq_item_id}>
                      <td><span className={modalCss.tag}>PR#{it.pr_id}</span></td>
                      <td>{it.item_name}</td>
                      <td className={modalCss.right}>{Number(it.qty || 0).toLocaleString()}</td>
                      <td className={modalCss.nowrap}><span className={modalCss.pill}>{it.unit}</span></td>
                      <td>{it.spec || "-"}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5}>ไม่มีรายการ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
    } catch (e) {
      console.error(e);
      setMContent(<p>ดึงข้อมูลรายละเอียดไม่สำเร็จ</p>);
    } finally {
      setMLoading(false);
    }
  };

  const openGRDetail = async (row) => {
    setOpen(true);
    setMLoading(true);
    setModalVariant("gr");
    setMTitle(`รายละเอียด GR ${row.gr_no}`);
    try {
      const { data: items = [] } = await axiosInstance.get(
        `/historyPurchasing/gr/${row.gr_id}/items`
      );
      setMContent(
        <>
          <div className={modalCss.kvGrid}>
            <div className={modalCss.kv}><span>PO</span><strong>{row.po_no}</strong></div>
            <div className={modalCss.kv}><span>ผู้ขาย</span><strong>{row.supplier_name}</strong></div>
            <div className={modalCss.kv}><span>วันที่รับ</span><strong>{fmtTH(row.gr_date)}</strong></div>
            <div className={modalCss.kv}><span>สถานะ</span><strong>{row.status}</strong></div>
          </div>

          <div className={modalCss.section}>
            <div className={modalCss.sectionHead}>
              <h4>สินค้าใน GR</h4>
              <span className={`${modalCss.badge} ${modalCss[statusClass(row.status)]}`}>{row.status}</span>
            </div>
            <div className={modalCss.tableWrap}>
              <table className={modalCss.miniTable}>
                <thead>
                  <tr>
                    <th>สินค้า</th>
                    <th className={modalCss.right}>สั่ง</th>
                    <th className={modalCss.right}>รับจริง</th>
                    <th>Lot</th>
                    <th>EXP</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.gr_item_id}>
                      <td>{it.item_name}</td>
                      <td className={modalCss.right}>{Number(it.qty_ordered || 0).toLocaleString()}</td>
                      <td className={modalCss.right}>{Number(it.qty_received || 0).toLocaleString()}</td>
                      <td className={modalCss.nowrap}>{it.lot_no || "-"}</td>
                      <td className={modalCss.nowrap}>{it.exp_date ? fmtTH(it.exp_date) : "-"}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5}>ไม่มีรายการ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
    } catch (e) {
      console.error(e);
      setMContent(<p>ดึงข้อมูลรายละเอียดไม่สำเร็จ</p>);
    } finally {
      setMLoading(false);
    }
  };

  const closeModal = () => {
    setOpen(false);
    setMTitle("");
    setMContent(null);
    setMLoading(false);
  };

  return (
    <div className={styles.page}>
      {/* HERO */}
      <div className={styles.hero}>
        <div>
          <h1>ประวัติฝ่ายจัดซื้อ</h1>
          <p>รวมประวัติทั้งหมดไว้ในหน้าเดียว — ดูเร็ว และเจาะรายละเอียดผ่าน Pop-up</p>
        </div>
        <div className={styles.filters}>
          <input
            className={styles.search}
            placeholder="ค้นหาเลขที่/ผู้ขาย/วันที่…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className={styles.select}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="pending">ค้าง/ยังไม่ครบ</option>
          </select>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className={styles.summaryRow}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>PO ทั้งหมด</div>
          <div className={styles.cardMain}>{summary.poTotal}</div>
          <div className={styles.cardFoot}>มูลค่ารวม {summary.poGrand.toLocaleString()} บาท</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>RFQ</div>
          <div className={styles.cardMain}>{summary.rfqCount}</div>
          <div className={styles.cardFoot}>รวมรายการ {summary.rfqItems}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>GR</div>
          <div className={styles.cardMain}>{summary.grCount}</div>
          <div className={styles.cardFoot}>รับเข้ารวม {summary.grQty.toLocaleString()} ชิ้น</div>
        </div>
      </div>

      {err && <div className={styles.error}>{err}</div>}
      {loading && <div className={styles.loading}>กำลังโหลดข้อมูล…</div>}

      {/* PO SECTION */}
      {!loading && (
        <section className={styles.section} id="po">
          <div className={styles.sectionHead}>
            <h2>PO History</h2>
            <span className={styles.badge}>{poFiltered.length} รายการ</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.nowrap}>PO No</th>
                  <th>วันที่</th>
                  <th>ผู้ขาย</th>
                  <th className={styles.right}>มูลค่า</th>
                  <th>สถานะ</th>
                  <th className={styles.right}>รับแล้ว/รายการ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {poFiltered.map((r) => (
                  <tr key={r.po_id}>
                    <td className={styles.nowrap}>{r.po_no}</td>
                    <td>{fmtTH(r.po_date)}</td>
                    <td>{r.supplier_name}</td>
                    <td className={styles.right}>{num(r.grand_total).toLocaleString()}</td>
                    <td>{r.status}</td>
                    <td className={styles.right}>{r.received_items}/{r.total_items}</td>
                    <td className={styles.nowrap}>
                      <button className={styles.btn} onClick={() => openPODetail(r)}>รายละเอียด</button>
                    </td>
                  </tr>
                ))}
                {poFiltered.length === 0 && (
                  <tr><td colSpan={7} className={styles.muted}>ไม่พบข้อมูลที่ตรงกับการค้นหา</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* RFQ SECTION */}
      {!loading && (
        <section className={styles.section} id="rfq">
          <div className={styles.sectionHead}>
            <h2>RFQ History</h2>
            <span className={styles.badge}>{rfqFiltered.length} รายการ</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.nowrap}>RFQ No</th>
                  <th>วันที่สร้าง</th>
                  <th>สถานะ</th>
                  <th className={styles.right}>รวม PR</th>
                  <th className={styles.right}>รวมรายการ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rfqFiltered.map((r) => (
                  <tr key={r.rfq_id}>
                    <td className={styles.nowrap}>{r.rfq_no}</td>
                    <td>{fmtTH(r.created_at)}</td>
                    <td>{r.status}</td>
                    <td className={styles.right}>{r.total_pr}</td>
                    <td className={styles.right}>{r.total_items}</td>
                    <td className={styles.nowrap}>
                      <button className={styles.btn} onClick={() => openRFQDetail(r)}>รายละเอียด</button>
                    </td>
                  </tr>
                ))}
                {rfqFiltered.length === 0 && (
                  <tr><td colSpan={6} className={styles.muted}>ไม่พบข้อมูลที่ตรงกับการค้นหา</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* GR SECTION */}
      {!loading && (
        <section className={styles.section} id="gr">
          <div className={styles.sectionHead}>
            <h2>GR History</h2>
            <span className={styles.badge}>{grFiltered.length} รายการ</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.nowrap}>GR No</th>
                  <th>วันที่รับ</th>
                  <th>PO No</th>
                  <th>ผู้ขาย</th>
                  <th className={styles.right}>จำนวนรับ</th>
                  <th>สถานะ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grFiltered.map((r) => (
                  <tr key={r.gr_id}>
                    <td className={styles.nowrap}>{r.gr_no}</td>
                    <td>{fmtTH(r.gr_date)}</td>
                    <td className={styles.nowrap}>{r.po_no}</td>
                    <td>{r.supplier_name}</td>
                    <td className={styles.right}>{r.total_received}</td>
                    <td>{r.status}</td>
                    <td className={styles.nowrap}>
                      <button className={styles.btn} onClick={() => openGRDetail(r)}>รายละเอียด</button>
                    </td>
                  </tr>
                ))}
                {grFiltered.length === 0 && (
                  <tr><td colSpan={7} className={styles.muted}>ไม่พบข้อมูลที่ตรงกับการค้นหา</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal */}
      <Modal
        open={open}
        title={mTitle}
        onClose={closeModal}
        loading={mLoading}
        variant={modalVariant}
      >
        {mContent}
      </Modal>
    </div>
  );
}
