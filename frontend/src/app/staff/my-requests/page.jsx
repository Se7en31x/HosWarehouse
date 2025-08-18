'use client';

import { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import styles from './page.module.css';
import Swal from 'sweetalert2';
import { ChevronLeft, ChevronRight, X, Eye, Trash2, RotateCw } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// แผนที่สำหรับแปลสถานะ (ย้ายมาไว้ด้านนอกเพื่อให้ใช้ได้ทั่วถึง)
const statusMap = {
  waiting_approval_detail: 'รออนุมัติ',
  waiting_approval: 'รอการอนุมัติ',
  approved: 'อนุมัติแล้ว',
  approved_all: 'อนุมัติทั้งหมด',
  rejected: 'ปฏิเสธแล้ว',
  rejected_all: 'ปฏิเสธทั้งหมด',
  approved_partial: 'อนุมัติบางส่วน',
  rejected_partial: 'ปฏิเสธบางส่วน',
  approved_partial_and_rejected_partial: 'อนุมัติ/ปฏิเสธบางส่วน',
  preparing: 'กำลังจัดเตรียม',
  delivering: 'กำลังนำส่ง',
  completed: 'เสร็จสิ้น',
  canceled: 'ยกเลิกคำขอ',
  approved_in_queue: 'รอดำเนินการ',
  in_progress: 'กำลังดำเนินการ',
  // เพิ่มสถานะอื่น ๆ ที่ต้องการแปลได้ที่นี่
};

// ฟังก์ชันสำหรับแปลสถานะ
const translateStatus = (status) => {
  return statusMap[String(status).toLowerCase()] || status || '-';
};

// ─────────────────────────────────────────────────────────────
// กันรูปเสีย
function ItemImage({ item_img, alt }) {
  const defaultImg = 'http://localhost:5000/public/defaults/landscape.png';
  const [imgSrc, setImgSrc] = useState(
    item_img && typeof item_img === 'string' && item_img.trim() !== ''
      ? `http://localhost:5000/uploads/${item_img}`
      : defaultImg
  );
  return (
    <img
      src={imgSrc}
      alt={alt || 'ไม่มีคำอธิบายภาพ'}
      width={56}
      height={56}
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
        const res = await axiosInstance.get(`/my-request-detail/${requestId}?user_id=1`);
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

  const statusText = detail.request_status || 'ไม่ระบุสถานะ';
  const s = String(statusText).toLowerCase();
  let statusClass = styles.badgeNeutral;
  if (s.includes('รอ') || s.includes('pending')) statusClass = styles.badgeWarning;
  else if (s.includes('ยกเลิก') || s.includes('ปฏิเสธ') || s.includes('cancel') || s.includes('reject')) statusClass = styles.badgeDanger;
  else if (s.includes('อนุมัติ') || s.includes('เสร็จสิ้น') || s.includes('approved') || s.includes('complete') || s.includes('success') || s.includes('stock_deducted')) statusClass = styles.badgeSuccess;

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
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>สถานะ</div>
          <div className={styles.infoValue}>
            <span className={`${styles.badge} ${statusClass}`}>
              {translateStatus(detail.request_status)}
            </span>
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
              <th>ประเภทรายการ</th>
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
                  <td>{item.unit || '-'}</td>
                  <td>
                    <span className={styles.typeChip}>
                      {translateRequestType(item.request_detail_type || item.request_type)}
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
  const [requests, setRequests] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const userId = 1;

  const [openId, setOpenId] = useState(null);

  // ค้นหา/กรอง (client-side)
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRequests = async () => {
    try {
      setLoadingList(true);
      const res = await axiosInstance.get(`/my-requests?user_id=${userId}`);
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

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = openId ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [openId]);

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
      await axiosInstance.put(`/my-requests/${requestId}/cancel`, { user_id: userId });
      await Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'ยกเลิกคำขอเรียบร้อยแล้ว',
        customClass: { container: 'swal-topmost' }
      });
      fetchRequests();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'ผิดพลาด',
        text: 'ไม่สามารถแก้ไขคำขอได้',
        customClass: { container: 'swal-topmost' }
      });
    }
  };

  const handleDelete = async (requestId) => {
    const result = await Swal.fire({
      title: 'ลบคำขอถาวร?',
      text: 'การลบจะไม่สามารถกู้คืนได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ลบเลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444',
      customClass: { container: 'swal-topmost' }
    });
    if (!result.isConfirmed) return;

    try {
      let ok = false;
      try {
        const r1 = await axiosInstance.delete(`/my-requests/${requestId}`);
        ok = r1?.status >= 200 && r1?.status < 300;
      } catch (_) { }

      if (!ok) {
        try {
          const r2 = await axiosInstance.delete(`/my-requests/${requestId}/delete`);
          ok = r2?.status >= 200 && r2?.status < 300;
        } catch (_) { }
      }

      if (!ok) {
        const r3 = await axiosInstance.post(`/my-requests/${requestId}/delete`);
        ok = r3?.status >= 200 && r3?.status < 300;
      }

      if (ok) {
        await Swal.fire({
          icon: 'success',
          title: 'ลบแล้ว',
          text: 'ลบคำขอเรียบร้อย',
          customClass: { container: 'swal-topmost' }
        });
        setOpenId((cur) => (cur === requestId ? null : cur));
        fetchRequests();
      } else {
        throw new Error('DELETE_API_NOT_FOUND');
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'ผิดพลาด',
        text: 'ลบคำขอไม่สำเร็จ',
        customClass: { container: 'swal-topmost' }
      });
    }
  };

  const translateRequestTypes = (types) => {
    if (!types) return '-';
    const mapType = { withdraw: 'การเบิก', borrow: 'การยืม', return: 'คืน' };
    return [...new Set(String(types).split(',').map((t) => mapType[t?.toLowerCase()] || t))].join(' และ ');
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  };

  const renderStatus = (status) => {
    const s = `${status || ''}`.toLowerCase();
    let cls = styles.badgeNeutral;
    if (s.includes('รอ') || s.includes('pending')) cls = styles.badgeWarning;
    else if (s.includes('อนุมัติ') || s.includes('เสร็จสิ้น') || s.includes('approved') || s.includes('complete') || s.includes('success') || s.includes('stock_deducted')) cls = styles.badgeSuccess;
    else if (s.includes('ยกเลิก') || s.includes('ปฏิเสธ') || s.includes('cancel') || s.includes('reject')) cls = styles.badgeDanger;
    return <span className={`${styles.badge} ${cls}`}>{translateStatus(status)}</span>;
  };

  // สถิติบนหัว
  const stats = useMemo(() => {
    const total = (requests || []).length;
    const pending = (requests || []).filter(r => {
      const t = String(r.request_status || '').toLowerCase();
      return t.includes('รอ') || t.includes('pending');
    }).length;
    const approved = (requests || []).filter(r => {
      const t = String(r.request_status || '').toLowerCase();
      return t.includes('อนุมัติ') || t.includes('เสร็จสิ้น') || t.includes('approved') || t.includes('complete') || t.includes('success') || t.includes('stock_deducted');
    }).length;
    const cancelled = total - pending - approved;
    return { total, pending, approved, cancelled };
  }, [requests]);

  // กรอง/ค้นหา + หน้า
  const filtered = useMemo(() => {
    let list = Array.isArray(requests) ? requests : [];
    if (statusFilter !== 'all') {
      const key = String(statusFilter).toLowerCase();
      list = list.filter((r) => String(r.request_status || '').toLowerCase().includes(key));
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (r) =>
          String(r.request_code || '').toLowerCase().includes(q) ||
          String(r.request_types || '').toLowerCase().includes(q) ||
          String(r.request_status || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedRequests = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const openPopupView = (id) => { setOpenId(id); };
  const closePopup = () => setOpenId(null);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.headerBar}>
        <div>
          <h1 className={styles.pageTitle}>คำขอของฉัน</h1>
          <p className={styles.pageSubtitle}>ติดตามสถานะการเบิก/ยืม/คืน ได้ในหน้าจอนี้</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnGhost} onClick={fetchRequests} title="รีเฟรช">
            <RotateCw size={16} /> <span className={styles.btnText}>รีเฟรช</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className={styles.summaryGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>ทั้งหมด</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statLabel}>รอดำเนินการ</div>
          <div className={styles.statValue}>{stats.pending}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statLabel}>อนุมัติ/เสร็จสิ้น</div>
          <div className={styles.statValue}>{stats.approved}</div>
        </div>
        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statLabel}>ยกเลิก/ปฏิเสธ</div>
          <div className={styles.statValue}>{stats.cancelled}</div>
        </div>
      </div>

      {/* Toolbar: chips + search */}
      <div className={styles.toolbar}>
        <div className={styles.segmented}>
          {[
            { key: 'all', label: 'ทั้งหมด' },
            { key: 'รอ', label: 'รอ...' },
            { key: 'อนุมัติ', label: 'อนุมัติ/เสร็จสิ้น' },
            { key: 'ยกเลิก', label: 'ยกเลิก/ปฏิเสธ' },
          ].map(b => (
            <button
              key={b.key}
              className={`${styles.segmentedBtn} ${statusFilter === b.key ? styles.segmentedActive : ''}`}
              onClick={() => { setCurrentPage(1); setStatusFilter(b.key); }}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className={styles.searchWrap}>
          <input
            className={styles.inputSearch}
            placeholder="ค้นหา: รหัส/ประเภท/สถานะ"
            value={query}
            onChange={(e) => { setCurrentPage(1); setQuery(e.target.value); }}
          />
          {query && (
            <button className={styles.btnGhost} onClick={() => setQuery('')}>ล้าง</button>
          )}
        </div>
      </div>

      {/* ===== ตารางแบบ “โค้ดต้นแบบ” ===== */}
      <div className={styles.tableFrame}>
        {/* Header ติดบนในกรอบเดียวกัน */}
        <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
          <div className={styles.headerItem}>ลำดับ</div>
          <div className={styles.headerItem}>รหัสคำขอ</div>
          <div className={styles.headerItem}>วันที่/เวลา</div>
          <div className={styles.headerItem}>ประเภท</div>
          <div className={styles.headerItem}>สถานะ</div>
          <div className={styles.headerItem}>จำนวน</div>
          <div className={styles.headerItem}>จัดการ</div>
        </div>

        {/* Body สูงคงที่ = rows-per-page */}
        <div className={styles.inventory} style={{ '--rows-per-page': ITEMS_PER_PAGE }}>
          {loadingList ? (
            <div className={styles.noData}>
              กำลังโหลดข้อมูล…
            </div>
          ) : paginatedRequests.length > 0 ? (
            paginatedRequests.map((req, index) => {
              const rowNo = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
              return (
                <div
                  key={req.request_id ?? req.request_code ?? index}
                  className={`${styles.tableGrid} ${styles.tableRow}`}
                >
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>{rowNo}</div>
                  <div className={`${styles.tableCell} ${styles.codeCell}`}>#{req.request_code || '-'}</div>
                  <div className={`${styles.tableCell} ${styles.muted}`}>
                    {req.request_date ? formatDate(req.request_date) : '-'}
                  </div>
                  <div className={`${styles.tableCell} ${styles.typeCell}`}>
                    {translateRequestTypes(req.request_types)}
                  </div>
                  <div className={styles.tableCell}>{renderStatus(req.request_status)}</div>
                  <div className={styles.tableCell}>{req.item_count ?? '-'}</div>
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>
                    <div className={styles.rowActions}>
                      <button
                        className={styles.btnIcon}
                        onClick={() => openPopupView(req.request_id)}
                        title="ดูรายละเอียด"
                      >
                        <Eye size={16} />
                      </button>

                      {(() => {
                        const t = String(req.request_status || '').toLowerCase();
                        const allowCancel = t.includes('รอ') || t.includes('pending') || t.includes('await');
                        return allowCancel ? (
                          <button
                            className={styles.btnIconWarning}
                            onClick={() => handleCancel(req.request_id)}
                            title="ยกเลิก"
                          >
                            <X size={16} /> <span>ยกเลิก</span>
                          </button>
                        ) : null;
                      })()}

                      <button
                        className={styles.btnIconDanger}
                        onClick={() => handleDelete(req.request_id)}
                        title="ลบคำขอถาวร"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className={styles.noData}>ไม่พบรายการ</div>
          )}
        </div>

        {/* Pagination (สไตล์เดียวกับต้นแบบ) */}
        <ul className={styles.paginationControls}>
          <li>
            <button className={styles.pageButton} onClick={handlePrev} disabled={currentPage === 1} aria-label="หน้าก่อนหน้า">
              <ChevronLeft size={16} />
            </button>
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
            <button
              className={styles.pageButton}
              onClick={handleNext}
              disabled={currentPage >= totalPages}
              aria-label="หน้าถัดไป"
            >
              <ChevronRight size={16} />
            </button>
          </li>
        </ul>
      </div>

      {/* Popup (รายละเอียดเท่านั้น) */}
      {openId && (
        <div className={styles.modalOverlay} onClick={closePopup}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <h3 className={styles.modalTitle}>
                  รายละเอียดคำขอ <span className={styles.modalCode}>#{openId}</span>
                </h3>
              </div>
              <button className={styles.modalClose} onClick={closePopup} aria-label="ปิด">
                <X size={18} />
              </button>
            </div>

            <RequestDetailBody requestId={openId} />
          </div>
        </div>
      )}
    </div>
  );
}