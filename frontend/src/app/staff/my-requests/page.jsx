'use client';

import { useEffect, useMemo, useState } from 'react';
import { staffAxios } from '../../utils/axiosInstance';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight, X, Eye, Trash2, CheckCircle } from 'lucide-react';
import dynamic from "next/dynamic";

// ✅ เพิ่ม Select (react-select) แบบ dynamic
const Select = dynamic(() => import("react-select"), { ssr: false });

/* ---- custom styles สำหรับ react-select ---- */
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "8px",
    minHeight: "40px",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    width: "250px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "8px",
    marginTop: 6,
    boxShadow: "none",
    border: "1px solid #e5e7eb",
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f3f4f6" : "#fff",
    color: "#111827",
    padding: "8px 12px",
    textAlign: "left",
  }),
  placeholder: (base) => ({ ...base, color: "#6b7280" }),
  singleValue: (base) => ({ ...base, textAlign: "left" }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

/* ============================================================
   แผนที่สำหรับแปลสถานะ
============================================================ */
const statusMap = {
  waiting_approval_detail: 'รออนุมัติ',
  waiting_approval: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  approved_all: 'อนุมัติทั้งหมด',
  rejected: 'ปฏิเสธแล้ว',
  rejected_all: 'ปฏิเสธทั้งหมด',
  approved_partial: 'อนุมัติบางส่วน',
  rejected_partial: 'ปฏิเสธบางส่วน',
  approved_partial_and_rejected_partial: 'อนุมัติบางส่วน',
  preparing: 'กำลังจัดเตรียม',
  delivering: 'กำลังนำส่ง',
  completed: 'เสร็จสิ้น',
  canceled: 'ยกเลิกคำขอ',
  approved_in_queue: 'อนุมัติแล้วรอดำเนินการ',
  pending: 'รอดำเนินการ',
};

// ✅ สร้าง options สำหรับสถานะ
const statusOptions = Object.entries(statusMap).map(([value, label]) => ({
  value,
  label,
}));

// ✅ สร้าง options สำหรับประเภทคำขอ
const typeOptions = [
  { value: 'withdraw', label: 'เบิก' },
  { value: 'borrow', label: 'ยืม' },
  { value: 'return', label: 'คืน' },
];

// ฟังก์ชันสำหรับแปลสถานะ
const translateStatus = (status) => {
  return statusMap[String(status).toLowerCase()] || status || '-';
};

// ─────────────────────────────────────────────────────────────
// กันรูปเสีย
function ItemImage({ item_img, alt }) {
  const defaultImg = 'http://localhost:5000/public/defaults/landscape.png';

  const getImgUrl = (img) => {
    if (!img || typeof img !== "string" || img.trim() === "") return defaultImg;
    if (img.startsWith("http")) {
      return img;  // ✅ ถ้าเป็น URL เต็ม (เช่น Supabase)
    }
    return `http://localhost:5000/uploads/${img}`; // ✅ ถ้าเป็นไฟล์ local
  };

  const [imgSrc, setImgSrc] = useState(getImgUrl(item_img));

  return (
    <img
      src={imgSrc}
      alt={alt || 'ไม่มีคำอธิบายภาพ'}
      width={50}
      height={50}
      className={styles.itemThumb}
      onError={() => setImgSrc(defaultImg)}
    />
  );
}


// ─────────────────────────────────────────────────────────────
// เนื้อหารายละเอียดคำขอ (โหมด "รายละเอียด")
function RequestDetailBody({ requestId }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const translateRequestType = (type) => {
    if (!type) return '-';
    const t = String(type).toLowerCase();
    if (t === 'withdraw') return 'การเบิก';
    if (t === 'borrow') return 'การยืม';
    if (t === 'return') return 'การคืน';
    return type;
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await staffAxios.get(`/myRequestDetail/${requestId}`);
        if (!alive) return;
        const data = res.data || {};
        setDetail(data.detail || null);
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setError('ไม่สามารถโหลดข้อมูลคำขอได้');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [requestId]);

  const uniqueTranslatedTypes = useMemo(
    () => [...new Set(items.map((it) => translateRequestType(it.request_detail_type || it.request_type)))],
    [items]
  );

  if (loading) return <div className={styles.modalLoading}>กำลังโหลดข้อมูล…</div>;
  if (error) return <div className={styles.modalError}>{error}</div>;
  if (!detail) return <div className={styles.modalEmpty}>ไม่พบข้อมูลคำขอ</div>;

  return (
    <div className={styles.modalBody}>
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>รหัสคำขอ</div>
          <div className={styles.infoValue}>#{detail.request_code || requestId}</div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>วันที่และเวลา</div>
          <div className={styles.infoValue}>{formatDateTime(detail.request_date)}</div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>ผู้ขอ</div>
          <div className={styles.infoValue}>{detail.user_name || '-'}</div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>แผนก</div>
          <div className={styles.infoValue}>{detail.department || '-'}</div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>ประเภทคำขอ</div>
          <div className={styles.infoValue}>
            {uniqueTranslatedTypes.length > 0 ? uniqueTranslatedTypes.join(' และ ') : '-'}
          </div>
        </div>
        <div className={`${styles.infoCard} ${styles.infoCardFull}`}>
          <div className={styles.infoLabel}>หมายเหตุ</div>
          <div className={styles.infoValue}>{detail.request_note || '-'}</div>
        </div>
      </div>

      <div className={styles.modalTableWrapper}>
        <table className={styles.modalTable}>
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รูปภาพ</th>
              <th>ชื่อพัสดุ</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>สถานะการดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, idx) => (
                <tr key={item.request_detail_id || idx}>
                  <td>{idx + 1}</td>
                  <td><ItemImage item_img={item.item_img} alt={item.item_name} /></td>
                  <td className={styles.cellName}>{item.item_name || '-'}</td>
                  <td>{item.quantity || 0}</td>
                  <td>{item.item_unit || '-'}</td>
                  <td>
                    <span className={styles.typeChip}>
                      {translateStatus(item.processing_status)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className={styles.modalEmpty}>ไม่มีรายการพัสดุ</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// หน้า List หลัก + Popup ดูรายละเอียด
export default function MyRequestsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [requests, setRequests] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  const ITEMS_PER_PAGE = 12; // ปรับตาม CSS (--rows-per-page: 12)

  const menuPortalTarget = useMemo(() => typeof window !== "undefined" ? document.body : null, []);

  // ดึงคำขอ
  const fetchRequests = async () => {
    try {
      setLoadingList(true);
      const res = await staffAxios.get(`/myRequest`);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถโหลดคำขอได้',
        customClass: { container: 'swal-topmost' }
      });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    document.body.style.overflow = openId ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [openId]);

  // ยกเลิกคำขอ
  const handleCancel = async (requestId) => {
    const result = await Swal.fire({
      title: 'ยืนยันการยกเลิก?',
      text: 'คุณต้องการยกเลิกคำขอนี้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกเลิกเลย',
      cancelButtonText: 'ไม่',
      customClass: { container: 'swal-topmost' }
    });
    if (!result.isConfirmed) return;
    try {
      await staffAxios.put(`/myRequest/${requestId}/cancel`);
      await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'ยกเลิกคำขอเรียบร้อยแล้ว' });
      fetchRequests();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ไม่สามารถแก้ไขคำขอได้' });
    }
  };

  // ยืนยันการรับของ
  const handleConfirmReceipt = async (requestId) => {
    const result = await Swal.fire({
      title: 'ยืนยันการรับของครบ?',
      text: 'คุณได้รับพัสดุครบถ้วนและต้องการปิดคำขอนี้ใช่หรือไม่',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;
    try {
      await staffAxios.put(`/myRequest/${requestId}/complete`);
      await Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'ยืนยันการรับของเรียบร้อยแล้ว' });
      fetchRequests();
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'ไม่สามารถยืนยันการรับของได้' });
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return '-';
      const datePart = new Intl.DateTimeFormat('th-TH-u-nu-latn', {
        timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric'
      }).format(dt);
      const timePart = new Intl.DateTimeFormat('th-TH-u-nu-latn', {
        timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false
      }).format(dt);
      return `${datePart} ${timePart}`;
    } catch { return '-'; }
  };

  const renderStatus = (status) => {
    const s = String(status || '').toLowerCase();
    let cls = styles.stBadge;
    if (s.includes('อนุมัติบางส่วน') || s.includes('approved_partial')) cls += ` ${styles.stHold}`;
    else if (s.includes('รอ') || s.includes('pending') || s.includes('waiting') || s.includes('in_progress')) cls += ` ${styles.stHold}`;
    else if (s.includes('อนุมัติทั้งหมด') || (s.includes('อนุมัติ') && !s.includes('บางส่วน')) || s.includes('approved_all') || s.includes('completed') || s.includes('complete') || s.includes('success') || s.includes('stock_deducted')) cls += ` ${styles.stAvailable}`;
    else if (s.includes('ยกเลิก') || s.includes('ปฏิเสธ') || s.includes('cancel') || s.includes('reject')) cls += ` ${styles.stOut}`;
    else cls += ` ${styles.stHold}`;
    return <span className={cls}>{translateStatus(status)}</span>;
  };

  const parseTypes = (types) => {
    if (!types) return [];
    if (Array.isArray(types)) return [...new Set(types.map(t => String(t).toLowerCase().trim()))];
    return [...new Set(String(types).split(',').map(t => t.trim().toLowerCase()))];
  };

  const renderTypeChips = (types) => {
    const arr = parseTypes(types);
    if (arr.length === 0) return '-';
    const label = (t) => t === 'withdraw' ? 'เบิก' : t === 'borrow' ? 'ยืม' : t === 'return' ? 'คืน' : t;
    return (
      <div className={styles.typePills}>
        {arr.map((t) => {
          let cls = styles.typePill;
          if (t === 'withdraw') cls += ` ${styles.typeWithdraw}`;
          else if (t === 'borrow') cls += ` ${styles.typeBorrow}`;
          else if (t === 'return') cls += ` ${styles.typeReturn}`;
          return <span key={t} className={cls}>{label(t)}</span>;
        })}
      </div>
    );
  };

  const stats = useMemo(() => {
    const total = (requests || []).length;
    const withdraw = requests.filter(r =>
      parseTypes(r.request_types).includes('withdraw')
    ).length;
    const borrow = requests.filter(r =>
      parseTypes(r.request_types).includes('borrow')
    ).length;
    const pending = requests.filter(r =>
      ["waiting_approval", "waiting_approval_detail", "pending"]
        .includes(String(r.request_status).toLowerCase())
    ).length;
    const cancelled = requests.filter(r =>
      ["canceled", "cancelled", "rejected_all", "rejected"]
        .includes(String(r.request_status).toLowerCase())
    ).length;
    return { total, withdraw, borrow, pending, cancelled };
  }, [requests]);

  const filtered = useMemo(() => {
    let list = [...requests];
    list = list.filter(r => String(r.request_status || '').toLowerCase() !== 'completed' && String(r.request_status || '').toLowerCase() !== 'canceled');
    if (statusFilter) {
      list = list.filter(r => String(r.request_status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (typeFilter) {
      list = list.filter(r => parseTypes(r.request_types).includes(typeFilter.toLowerCase()));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r =>
        String(r.request_code || '').toLowerCase().includes(q) ||
        String(r.request_types || '').toLowerCase().includes(q) ||
        String(r.request_status || '').toLowerCase().includes(q)
      );
    }
    // เรียงลำดับตามวันที่ (ใหม่ไปเก่า)
    list.sort((a, b) => new Date(b.request_date || 0) - new Date(a.request_date || 0));
    return list;
  }, [requests, statusFilter, typeFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedRequests = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
      else if (currentPage >= totalPages - 2) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const openPopupView = (id) => { setOpenId(id); };
  const closePopup = () => setOpenId(null);

  // รีเซ็ตหน้าเมื่อฟิลเตอร์เปลี่ยน
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, query]);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>คำขอของฉัน</h1>
          </div>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>ทั้งหมด</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={`${styles.statCard} ${styles.statWithdraw}`}>
            <div className={styles.statLabel}>เบิก</div>
            <div className={styles.statValue}>{stats.withdraw}</div>
          </div>
          <div className={`${styles.statCard} ${styles.statBorrow}`}>
            <div className={styles.statLabel}>ยืม</div>
            <div className={styles.statValue}>{stats.borrow}</div>
          </div>
        </div>

        {/* Toolbar Filters */}
        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <Select
                inputId="statusFilter"
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานะ..."
                styles={customSelectStyles}
                value={statusOptions.find(o => o.value === statusFilter) || null}
                onChange={opt => setStatusFilter(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
            <div className={styles.filterGroup}>
              <label className={styles.label}>ประเภท</label>
              <Select
                inputId="typeFilter"
                options={typeOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกประเภท..."
                styles={customSelectStyles}
                value={typeOptions.find(o => o.value === typeFilter) || null}
                onChange={opt => setTypeFilter(opt?.value || '')}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
          </div>
          <div className={styles.searchCluster}>
            <div className={styles.filterGroup}>
              <label htmlFor="filter" className={styles.label}>ค้นหา</label>
              <input
                id="filter"
                className={styles.input}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="สถานะ, ประเภท"
              />
            </div>
            <button
              className={`${styles.ghostBtn} ${styles.clearButton}`}
              onClick={() => { setQuery(''); setTypeFilter(''); setStatusFilter(''); }}
            >
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableSection}>
          <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
            <div className={styles.headerItem}>ลำดับ</div>
            <div className={styles.headerItem}>รหัสคำขอ</div>
            <div className={styles.headerItem}>จำนวน</div>
            <div className={styles.headerItem}>วันที่/เวลา</div>
            <div className={styles.headerItem}>ประเภท</div>
            <div className={styles.headerItem}>สถานะ</div>
            <div className={styles.headerItem}>การดำเนินการ</div>
          </div>

          <div className={styles.inventory} style={{ '--rows-per-page': ITEMS_PER_PAGE }}>
            {loadingList ? (
              <div className={styles.loadingContainer}>กำลังโหลดข้อมูล…</div>
            ) : paginatedRequests.length > 0 ? (
              paginatedRequests.map((req, index) => {
                const rowNo = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                const status = String(req.request_status || '').toLowerCase();
                return (
                  <div key={req.request_id ?? req.request_code ?? index} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{rowNo}</div>
                    <div className={`${styles.tableCell} ${styles.cellName}`}>#{req.request_code || '-'}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{req.item_count ?? '-'}</div>
                    <div className={`${styles.tableCell} ${styles.cell}`}>{req.request_date ? formatDate(req.request_date) : '-'}</div>
                    <div className={`${styles.tableCell} ${styles.cell}`}>{renderTypeChips(req.request_types)}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>{renderStatus(req.request_status)}</div>
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      <div className={styles.rowActions}>
                        <button className={styles.actionButton} onClick={() => openPopupView(req.request_id)} title="ดูรายละเอียด"><Eye size={16} /></button>
                        {status.includes('รอ') || status.includes('pending') ? (
                          <button className={`${styles.actionButton} ${styles.dangerBtnOutline}`} onClick={() => handleCancel(req.request_id)} title="ยกเลิก"><X size={16} /> <span>ยกเลิก</span></button>
                        ) : null}
                        {status === 'delivering' && (
                          <button className={`${styles.actionButton} ${styles.successBtn}`} onClick={() => handleConfirmReceipt(req.request_id)} title="ยืนยันการรับของครบ"><CheckCircle size={16} /> <span>รับของแล้ว</span></button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.noData}>ไม่พบรายการ</div>
            )}
            {/* Fillers เพื่อให้ตารางคงความสูง */}
            {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedRequests.length) }).map((_, i) => (
              <div
                key={`filler-${i}`}
                className={`${styles.tableGrid} ${styles.tableRow} ${styles.fillerRow}`}
                aria-hidden="true"
              >
                <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={styles.tableCell}>&nbsp;</div>
                <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className={styles.paginationBar}>
            <div className={styles.paginationInfo}>
              กำลังแสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} จาก {filtered.length} รายการ
            </div>
            <ul className={styles.paginationControls}>
              <li>
                <button className={styles.pageButton} onClick={handlePrev} disabled={currentPage === 1}><ChevronLeft size={16} /></button>
              </li>
              {getPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <li key={idx} className={styles.ellipsis}>…</li>
                ) : (
                  <li key={idx}>
                    <button
                      className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ''}`}
                      onClick={() => setCurrentPage(p)}
                    >
                      {p}
                    </button>
                  </li>
                )
              )}
              <li>
                <button className={styles.pageButton} onClick={handleNext} disabled={currentPage >= totalPages}><ChevronRight size={16} /></button>
              </li>
            </ul>
          </div>
        </div>

        {/* Popup */}
        {openId && (
          <div className={styles.modalOverlay} onClick={closePopup}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>รายละเอียดคำขอ</h3>
                <button className={styles.actionButton} onClick={closePopup}><X size={18} /></button>
              </div>
              <RequestDetailBody requestId={openId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}