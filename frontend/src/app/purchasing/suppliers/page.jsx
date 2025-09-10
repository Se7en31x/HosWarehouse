"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { ClipboardCheck, Search, Trash2, Plus, Edit2, X, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from "lucide-react";
import Swal from "sweetalert2";
import { purchasingAxios } from "@/app/utils/axiosInstance";
import { toast } from "react-toastify";
import styles from "./page.module.css";

const DynamicSelect = dynamic(() => import("react-select"), { ssr: false });

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    borderColor: state.isFocused ? "#2563eb" : "#e5e7eb",
    boxShadow: "none",
    "&:hover": { borderColor: "#2563eb" },
    width: "200px",
  }),
  menu: (base) => ({
    ...base,
    borderRadius: "0.5rem",
    marginTop: 6,
    boxShadow: "none",
    border: "1px solid #e5e7eb",
    zIndex: 9000,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9000 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#f1f5ff" : "#fff",
    color: "#111827",
    padding: "8px 12px",
    textAlign: "left",
  }),
  placeholder: (base) => ({ ...base, color: "#9ca3af" }),
  singleValue: (base) => ({ ...base, textAlign: "left" }),
  clearIndicator: (base) => ({ ...base, padding: 6 }),
  dropdownIndicator: (base) => ({ ...base, padding: 6 }),
};

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState({
    supplier_name: "",
    supplier_contact_name: "",
    supplier_phone: "",
    supplier_email: "",
    supplier_address: "",
    supplier_tax_id: "",
    supplier_note: "",
  });

  const ITEMS_PER_PAGE = 12;
  const menuPortalTarget = useMemo(() => (typeof window !== "undefined" ? document.body : null), []);

  const statusOptions = [
    { value: "all", label: "ทั้งหมด" },
    { value: "active", label: "เปิดใช้งาน" },
    { value: "inactive", label: "ปิดใช้งาน" },
  ];

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter?.value && statusFilter.value !== "all") {
        params.is_active = statusFilter.value === "active" ? true : false;
      }
      const res = await purchasingAxios.get("/suppliers", { params });
      setSuppliers(Array.isArray(res.data) ? res.data.filter(Boolean) : []);
    } catch (err) {
      toast.error(`ไม่สามารถดึงข้อมูลได้: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddSupplierPopup = () => {
    setForm({
      supplier_name: "",
      supplier_contact_name: "",
      supplier_phone: "",
      supplier_email: "",
      supplier_address: "",
      supplier_tax_id: "",
      supplier_note: "",
    });
    Swal.fire({
      title: "<span style='color: #2563eb'>เพิ่มผู้ขายใหม่</span>",
      html: `
        <div class="${styles.swalFormGrid}">
          <div class="${styles.swalFormGroup}">
            <label for="swal-input1">ชื่อบริษัท/ผู้ขาย <span class="${styles.required}">*</span></label>
            <input id="swal-input1" class="${styles.swalInput}" placeholder="เช่น ABC Company" name="supplier_name" maxlength="100" required>
          </div>
          <div class="${styles.swalFormGroup}">
            <label for="swal-input2">ชื่อผู้ติดต่อ</label>
            <input id="swal-input2" class="${styles.swalInput}" placeholder="เช่น John Doe" name="supplier_contact_name" maxlength="50">
          </div>
        </div>
        <div class="${styles.swalFormGrid}">
          <div class="${styles.swalFormGroup}">
            <label for="swal-input3">เบอร์โทร <span class="${styles.required}">*</span></label>
            <input id="swal-input3" class="${styles.swalInput}" placeholder="เช่น 081-234-5678" name="supplier_phone" maxlength="15" required>
          </div>
          <div class="${styles.swalFormGroup}">
            <label for="swal-input4">Email <span class="${styles.required}">*</span></label>
            <input id="swal-input4" class="${styles.swalInput}" placeholder="เช่น john@example.com" name="supplier_email" type="email" maxlength="50" required>
          </div>
        </div>
        <div class="${styles.swalFormGrid}">
          <div class="${styles.swalFormGroup}">
            <label for="swal-input5">ที่อยู่</label>
            <input id="swal-input5" class="${styles.swalInput}" placeholder="เช่น 123 ถนนสุขุมวิท" name="supplier_address" maxlength="200">
          </div>
          <div class="${styles.swalFormGroup}">
            <label for="swal-input6">Tax ID</label>
            <input id="swal-input6" class="${styles.swalInput}" placeholder="เช่น 1234567890123" name="supplier_tax_id" maxlength="13">
          </div>
        </div>
        <div class="${styles.swalFormGroup}">
          <label for="swal-input7">หมายเหตุ</label>
          <textarea id="swal-input7" class="${styles.swalTextarea}" placeholder="เพิ่มรายละเอียดเพิ่มเติม" name="supplier_note" maxlength="500"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
      customClass: {
        popup: styles.customSwalPopup,
        confirmButton: styles.submitBtn,
        cancelButton: styles.cancelBtn,
      },
      preConfirm: () => {
        const newForm = {
          supplier_name: document.getElementById("swal-input1").value.trim(),
          supplier_contact_name: document.getElementById("swal-input2").value.trim(),
          supplier_phone: document.getElementById("swal-input3").value.trim(),
          supplier_email: document.getElementById("swal-input4").value.trim(),
          supplier_address: document.getElementById("swal-input5").value.trim(),
          supplier_tax_id: document.getElementById("swal-input6").value.trim(),
          supplier_note: document.getElementById("swal-input7").value.trim(),
        };
        const requiredFields = ["supplier_name", "supplier_phone", "supplier_email"];
        const emptyFields = requiredFields.filter((field) => !newForm[field]);
        if (emptyFields.length > 0) {
          Swal.showValidationMessage(`<span style="color: #dc3545">กรุณากรอกข้อมูลที่จำเป็น: ${emptyFields.join(", ")}</span>`);
          return false;
        }
        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(newForm.supplier_phone)) {
          Swal.showValidationMessage('<span style="color: #dc3545">เบอร์โทรต้องเป็น 10 หลัก เริ่มต้นด้วย 0</span>');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newForm.supplier_email)) {
          Swal.showValidationMessage('<span style="color: #dc3545">กรุณากรอก Email ให้ถูกต้อง</span>');
          return false;
        }
        return newForm;
      },
      didOpen: () => {
        const popup = Swal.getPopup();
        popup.querySelectorAll(`.${styles.swalInput}, .${styles.swalTextarea}`).forEach((input) => {
          input.addEventListener("input", (e) => {
            e.target.style.borderColor = e.target.value.trim() ? "#28a745" : "#dc3545";
          });
        });
      },
    }).then((result) => {
      if (result.isConfirmed) {
        handleSaveNewSupplier(result.value);
      }
    });
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setForm({ ...supplier });
  };

  const handleSaveNewSupplier = async (newForm) => {
    try {
      await purchasingAxios.post("/suppliers", newForm);
      toast.success("เพิ่มผู้ขายใหม่แล้ว");
      fetchSuppliers();
    } catch (err) {
      toast.error(`ไม่สามารถบันทึกได้: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleSave = async () => {
    const requiredFields = ["supplier_name", "supplier_phone", "supplier_email"];
    const emptyFields = requiredFields.filter((field) => !form[field].trim());
    if (emptyFields.length > 0) {
      toast.error(`กรุณากรอกข้อมูลที่จำเป็น: ${emptyFields.join(", ")}`);
      return;
    }
    const phoneRegex = /^0\d{9}$/;
    if (!phoneRegex.test(form.supplier_phone)) {
      toast.error("เบอร์โทรต้องเป็น 10 หลัก เริ่มต้นด้วย 0");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.supplier_email)) {
      toast.error("กรุณากรอก Email ให้ถูกต้อง");
      return;
    }

    try {
      if (editingSupplier) {
        await purchasingAxios.put(`/suppliers/${editingSupplier.supplier_id}`, form);
        toast.success("แก้ไขข้อมูลผู้ขายแล้ว");
        fetchSuppliers();
      }
    } catch (err) {
      toast.error(`ไม่สามารถบันทึกได้: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDelete = async (supplier_id) => {
    const confirm = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณแน่ใจหรือไม่ที่จะลบผู้ขายนี้?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      customClass: { confirmButton: styles.dangerBtn, cancelButton: styles.cancelBtn },
    });
    if (!confirm.isConfirmed) return;

    try {
      await purchasingAxios.delete(`/suppliers/${supplier_id}`);
      toast.success("ลบผู้ขายเรียบร้อยแล้ว");
      fetchSuppliers();
    } catch (err) {
      toast.error(`ไม่สามารถลบได้: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleToggleStatus = async (supplier_id, is_active) => {
    const newStatus = !is_active;
    const confirm = await Swal.fire({
      title: `ยืนยันการ${newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน"}ผู้ขาย?`,
      text: `คุณแน่ใจหรือไม่ที่จะ${newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน"}ผู้ขายนี้?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: newStatus ? "#28a745" : "#dc3545",
      cancelButtonColor: "#6c757d",
      customClass: { confirmButton: newStatus ? styles.submitBtn : styles.dangerBtn, cancelButton: styles.cancelBtn },
    });
    if (!confirm.isConfirmed) return;

    try {
      await purchasingAxios.patch(`/suppliers/${supplier_id}/status`, { is_active: newStatus });
      toast.success(`สถานะผู้ขายถูก${newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน"}แล้ว`);
      fetchSuppliers();
    } catch (err) {
      toast.error(`ไม่สามารถเปลี่ยนสถานะได้: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredData = useMemo(() => {
    return suppliers.sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
  }, [suppliers]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const fillersCount = Math.max(0, ITEMS_PER_PAGE - (paginatedItems?.length || 0));

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const goToPreviousPage = () => currentPage > 1 && setCurrentPage((c) => c - 1);
  const goToNextPage = () =>
    currentPage * ITEMS_PER_PAGE < filteredData.length && setCurrentPage((c) => c + 1);
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  };

  const startDisplay = filteredData.length ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endDisplay = Math.min((currentPage - 1) * ITEMS_PER_PAGE + ITEMS_PER_PAGE, filteredData.length);

  return (
    <div className={styles.mainHome}>
      <div className={styles.infoContainer}>
        <div className={styles.pageBar}>
          <div className={styles.titleGroup}>
            <h1 className={styles.pageTitle}>
              จัดการผู้ขาย (Suppliers)
            </h1>
          </div>
          <button className={styles.btnPrimary} onClick={openAddSupplierPopup}>
            <Plus size={16} style={{ marginRight: "6px" }} /> เพิ่มผู้ขาย
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.label}>สถานะ</label>
              <DynamicSelect
                options={statusOptions}
                isClearable
                isSearchable={false}
                placeholder="เลือกสถานะ..."
                styles={customSelectStyles}
                value={statusFilter}
                onChange={setStatusFilter}
                menuPortalTarget={menuPortalTarget}
              />
            </div>
          </div>
          <div className={styles.searchCluster}>
            <button className={styles.btnPrimary} onClick={fetchSuppliers}>
              <Search size={16} style={{ marginRight: "6px" }} /> ค้นหา
            </button>
            <button onClick={() => setStatusFilter(null)} className={`${styles.ghostBtn} ${styles.clearButton}`}>
              <Trash2 size={18} /> ล้างตัวกรอง
            </button>
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingContainer} />
        ) : (
          <div className={styles.tableSection}>
            <div className={`${styles.tableGridSupplier} ${styles.tableHeader}`}>
              <div className={styles.headerItem}>ลำดับ</div>
              <div className={styles.headerItem}>ชื่อผู้ขาย</div>
              <div className={styles.headerItem}>ผู้ติดต่อ</div>
              <div className={styles.headerItem}>เบอร์โทร</div>
              <div className={styles.headerItem}>Email</div>
              <div className={styles.headerItem}>Tax ID</div>
              <div className={styles.headerItem}>สถานะ</div>
              <div className={styles.headerItem}>การกระทำ</div>
            </div>

            <div className={styles.inventory} style={{ "--rows-per-page": `${ITEMS_PER_PAGE}` }}>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((s, index) => (
                  <div
                    key={s.supplier_id ?? `${s.supplier_name}-${index}`}
                    className={`${styles.tableGridSupplier} ${styles.tableRow}`}
                  >
                    <div className={`${styles.tableCell} ${styles.centerCell}`}>
                      {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                    </div>
                    <div className={styles.tableCell}>{s.supplier_name || "-"}</div>
                    <div className={styles.tableCell}>{s.supplier_contact_name || "-"}</div>
                    <div className={styles.tableCell}>{s.supplier_phone || "-"}</div>
                    <div className={styles.tableCell}>{s.supplier_email || "-"}</div>
                    <div className={styles.tableCell}>{s.supplier_tax_id || "-"}</div>
                    <div className={styles.tableCell}>
                      <span className={`${styles.stBadge} ${s.is_active ? styles.stAvailable : styles.stOut}`}>
                        {s.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                      </span>
                    </div>
                    <div className={`${styles.tableCell} ${styles.actions}`}>
                      <button className={styles.ghostBtn} onClick={() => openEditModal(s)}>
                        <Edit2 size={16} /> แก้ไข
                      </button>
                      <button className={styles.dangerBtn} onClick={() => handleDelete(s.supplier_id)}>
                        <Trash2 size={16} /> ลบ
                      </button>
                      <button
                        className={s.is_active ? styles.dangerBtn : styles.submitBtn}
                        onClick={() => handleToggleStatus(s.supplier_id, s.is_active)}
                      >
                        {s.is_active ? <ToggleLeft size={16} /> : <ToggleRight size={16} />}
                        {s.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.noDataMessage}>ไม่พบข้อมูล</div>
              )}

              {Array.from({ length: fillersCount }).map((_, i) => (
                <div
                  key={`filler-${i}`}
                  className={`${styles.tableGridSupplier} ${styles.tableRow} ${styles.fillerRow}`}
                  aria-hidden="true"
                >
                  <div className={`${styles.tableCell} ${styles.centerCell}`}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                  <div className={styles.tableCell}>&nbsp;</div>
                </div>
              ))}
            </div>

            <div className={styles.paginationBar}>
              <div className={styles.paginationInfo}>
                กำลังแสดง {startDisplay}-{endDisplay} จาก {filteredData.length} รายการ
              </div>
              <ul className={styles.paginationControls}>
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    aria-label="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </li>
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <li key={`ellipsis-${idx}`} className={styles.ellipsis}>…</li>
                  ) : (
                    <li key={`page-${p}`}>
                      <button
                        className={`${styles.pageButton} ${p === currentPage ? styles.activePage : ""}`}
                        onClick={() => setCurrentPage(p)}
                        aria-current={p === currentPage ? "page" : undefined}
                      >
                        {p}
                      </button>
                    </li>
                  )
                )}
                <li>
                  <button
                    className={styles.pageButton}
                    onClick={goToNextPage}
                    disabled={currentPage >= totalPages}
                    aria-label="หน้าถัดไป"
                  >
                    <ChevronRight size={16} />
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        {editingSupplier && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>แก้ไขผู้ขาย</h2>
                <button className={styles.closeButton} onClick={() => setEditingSupplier(null)}>
                  <X size={20} />
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.swalFormGroup}>
                  <label>ชื่อบริษัท/ผู้ขาย <span className={styles.required}>*</span></label>
                  <input
                    className={styles.swalInput}
                    placeholder="เช่น ABC Company"
                    name="supplier_name"
                    value={form.supplier_name}
                    onChange={handleInputChange}
                    maxLength={100}
                    required
                  />
                </div>
                <div className={styles.swalFormGroup}>
                  <label>ชื่อผู้ติดต่อ</label>
                  <input
                    className={styles.swalInput}
                    placeholder="เช่น John Doe"
                    name="supplier_contact_name"
                    value={form.supplier_contact_name}
                    onChange={handleInputChange}
                    maxLength={50}
                  />
                </div>
                <div className={styles.swalFormGroup}>
                  <label>เบอร์โทร <span className={styles.required}>*</span></label>
                  <input
                    className={styles.swalInput}
                    placeholder="เช่น 081-234-5678"
                    name="supplier_phone"
                    value={form.supplier_phone}
                    onChange={handleInputChange}
                    maxLength={15}
                    required
                  />
                </div>
                <div className={styles.swalFormGroup}>
                  <label>Email <span className={styles.required}>*</span></label>
                  <input
                    className={styles.swalInput}
                    placeholder="เช่น john@example.com"
                    name="supplier_email"
                    value={form.supplier_email}
                    onChange={handleInputChange}
                    maxLength={50}
                    type="email"
                    required
                  />
                </div>
                <div className={styles.swalFormGroup}>
                  <label>ที่อยู่</label>
                  <input
                    className={styles.swalInput}
                    placeholder="เช่น 123 ถนนสุขุมวิท"
                    name="supplier_address"
                    value={form.supplier_address}
                    onChange={handleInputChange}
                    maxLength={200}
                  />
                </div>
                <div className={styles.swalFormGroup}>
                  <label>Tax ID</label>
                  <input
                    className={styles.swalInput}
                    placeholder="เช่น 1234567890123"
                    name="supplier_tax_id"
                    value={form.supplier_tax_id}
                    onChange={handleInputChange}
                    maxLength={13}
                  />
                </div>
                <div className={styles.swalFormGroup}>
                  <label>หมายเหตุ</label>
                  <textarea
                    className={styles.swalTextarea}
                    placeholder="เพิ่มรายละเอียดเพิ่มเติม"
                    name="supplier_note"
                    value={form.supplier_note}
                    onChange={handleInputChange}
                    maxLength={500}
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.submitBtn} onClick={handleSave}>
                  บันทึก
                </button>
                <button className={styles.cancelBtn} onClick={() => setEditingSupplier(null)}>
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}