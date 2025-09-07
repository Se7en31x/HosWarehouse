'use client';
import { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaTimes, FaInfoCircle, FaToggleOn, FaToggleOff } from "react-icons/fa";
import Swal from "sweetalert2";
import {purchasingAxios} from "@/app/utils/axiosInstance";
import styles from "./page.module.css";

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
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

  // ✅ โหลดข้อมูล supplier
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await purchasingAxios.get("/suppliers");
      setSuppliers(res.data);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: `ไม่สามารถดึงข้อมูลได้: ${err.response?.data?.message || err.message}`,
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ เปิด popup สำหรับเพิ่มผู้ขายใหม่
  const openAddSupplierPopup = () => {
    Swal.fire({
      title: "<span style='color: #007bff'>เพิ่มผู้ขายใหม่</span>",
      html: `
        <div class="${styles.swalFormGrid}">
          <div class="${styles.swalFormGroup}">
            <label for="swal-input1"><FaInfoCircle /> ชื่อบริษัท/ผู้ขาย <span class="${styles.required}">*</span></label>
            <input id="swal-input1" class="${styles.swalInput}" placeholder="เช่น ABC Company" name="supplier_name" maxlength="100" required>
          </div>
          <div class="${styles.swalFormGroup}">
            <label for="swal-input2"><FaInfoCircle /> ชื่อผู้ติดต่อ</label>
            <input id="swal-input2" class="${styles.swalInput}" placeholder="เช่น John Doe" name="supplier_contact_name" maxlength="50">
          </div>
        </div>
        <div class="${styles.swalFormGrid}">
          <div class="${styles.swalFormGroup}">
            <label for="swal-input3"><FaInfoCircle /> เบอร์โทร <span class="${styles.required}">*</span></label>
            <input id="swal-input3" class="${styles.swalInput}" placeholder="เช่น 081-234-5678" name="supplier_phone" maxlength="15" required>
          </div>
          <div class="${styles.swalFormGroup}">
            <label for="swal-input4"><FaInfoCircle /> Email <span class="${styles.required}">*</span></label>
            <input id="swal-input4" class="${styles.swalInput}" placeholder="เช่น john@example.com" name="supplier_email" type="email" maxlength="50" required>
          </div>
        </div>
        <div class="${styles.swalFormGrid}">
          <div class="${styles.swalFormGroup}">
            <label for="swal-input5"><FaInfoCircle /> ที่อยู่</label>
            <input id="swal-input5" class="${styles.swalInput}" placeholder="เช่น 123 ถนนสุขุมวิท" name="supplier_address" maxlength="200">
          </div>
          <div class="${styles.swalFormGroup}">
            <label for="swal-input6"><FaInfoCircle /> Tax ID</label>
            <input id="swal-input6" class="${styles.swalInput}" placeholder="เช่น 1234567890123" name="supplier_tax_id" maxlength="13">
          </div>
        </div>
        <div class="${styles.swalFormGroup}">
          <label for="swal-input7"><FaInfoCircle /> หมายเหตุ</label>
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

  // ✅ เปิด modal สำหรับแก้ไข
  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setForm({ ...supplier });
    setShowModal(true);
  };

  const handleSaveNewSupplier = async (newForm) => {
    try {
      const res = await purchasingAxios.post("/suppliers", newForm);
      Swal.fire({
        icon: "success",
        title: "<span style='color: #28a745'>สำเร็จ</span>",
        text: "เพิ่มผู้ขายใหม่แล้ว",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
      fetchSuppliers();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "<span style='color: #dc3545'>ผิดพลาด</span>",
        text: `ไม่สามารถบันทึกได้: ${err.response?.data?.message || err.message}`,
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
    }
  };

  const handleSave = async () => {
    const requiredFields = ["supplier_name", "supplier_phone", "supplier_email"];
    const emptyFields = requiredFields.filter((field) => !form[field].trim());
    if (emptyFields.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "คำเตือน",
        text: `กรุณากรอกข้อมูลที่จำเป็น: ${emptyFields.join(", ")}`,
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
      return;
    }

    try {
      if (editingSupplier) {
        const res = await purchasingAxios.put(`/suppliers/${editingSupplier.supplier_id}`, form);
        Swal.fire({
          icon: "success",
          title: "สำเร็จ",
          text: "แก้ไขข้อมูลผู้ขายแล้ว",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.submitBtn },
        });
        setShowModal(false);
        fetchSuppliers();
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: `ไม่สามารถบันทึกได้: ${err.response?.data?.message || err.message}`,
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
    }
  };

  const handleDelete = async (supplier_id) => {
    const confirm = await Swal.fire({
      title: "ยืนยัน?",
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
      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: "ลบผู้ขายเรียบร้อยแล้ว",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
      fetchSuppliers();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: `ไม่สามารถลบได้: ${err.message}`,
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
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
      Swal.fire({
        icon: "success",
        title: "สำเร็จ",
        text: `สถานะผู้ขายถูก${newStatus ? "เปิดใช้งาน" : "ปิดใช้งาน"}แล้ว`,
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
      fetchSuppliers();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ผิดพลาด",
        text: `ไม่สามารถเปลี่ยนสถานะได้: ${err.response?.data?.message || err.message}`,
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.submitBtn },
      });
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.supplier_tax_id || "").includes(searchTerm)
  );

  const [showModal, setShowModal] = useState(false);

  return (
    <div className={styles.mainHome}>
      <div className={styles.pageBar}>
        <h1 className={styles.pageTitle}>จัดการผู้ขาย (Suppliers)</h1>
        <button className={styles.primaryButton} onClick={openAddSupplierPopup}>
          <FaPlus /> เพิ่มผู้ขาย
        </button>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input
            className={styles.input}
            placeholder="ค้นหา: ชื่อผู้ขาย, Tax ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableSection}>
        {loading ? (
          <div className={styles.loading}>กำลังโหลด...</div>
        ) : (
          <>
            <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
              <div>ชื่อผู้ขาย</div>
              <div>ผู้ติดต่อ</div>
              <div>เบอร์โทร</div>
              <div>Email</div>
              <div>Tax ID</div>
              <div>สถานะ</div>
              <div>การกระทำ</div>
            </div>
            <div className={styles.inventory}>
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((s) => (
                  <div key={s.supplier_id} className={`${styles.tableGrid} ${styles.tableRow}`}>
                    <div>{s.supplier_name}</div>
                    <div>{s.supplier_contact_name || "-"}</div>
                    <div>{s.supplier_phone || "-"}</div>
                    <div>{s.supplier_email || "-"}</div>
                    <div>{s.supplier_tax_id || "-"}</div>
                    <div>
                      {s.is_active ? (
                        <span className={styles.statusActive}><FaToggleOn /> เปิดใช้งาน</span>
                      ) : (
                        <span className={styles.statusInactive}><FaToggleOff /> ปิดใช้งาน</span>
                      )}
                    </div>
                    <div className={styles.actions}>
                      <button
                        className={styles.ghostBtn}
                        onClick={() => openEditModal(s)}
                      >
                        <FaEdit /> แก้ไข
                      </button>
                      <button
                        className={styles.dangerBtn}
                        onClick={() => handleDelete(s.supplier_id)}
                      >
                        <FaTrash /> ลบ
                      </button>
                      <button
                        className={s.is_active ? styles.dangerBtn : styles.submitBtn}
                        onClick={() => handleToggleStatus(s.supplier_id, s.is_active)}
                      >
                        {s.is_active ? <FaToggleOff /> : <FaToggleOn />} {s.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.tableRow}>
                  <div colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                    ไม่พบข้อมูลผู้ขาย
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal สำหรับแก้ไข */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>แก้ไขผู้ขาย</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.input}
                placeholder="ชื่อบริษัท/ผู้ขาย"
                name="supplier_name"
                value={form.supplier_name}
                onChange={handleInputChange}
                maxLength={100}
                required
              />
              <input
                className={styles.input}
                placeholder="ชื่อผู้ติดต่อ"
                name="supplier_contact_name"
                value={form.supplier_contact_name}
                onChange={handleInputChange}
                maxLength={50}
              />
              <input
                className={styles.input}
                placeholder="เบอร์โทร"
                name="supplier_phone"
                value={form.supplier_phone}
                onChange={handleInputChange}
                maxLength={15}
                required
              />
              <input
                className={styles.input}
                placeholder="Email"
                name="supplier_email"
                value={form.supplier_email}
                onChange={handleInputChange}
                maxLength={50}
                required
                type="email"
              />
              <input
                className={styles.input}
                placeholder="ที่อยู่"
                name="supplier_address"
                value={form.supplier_address}
                onChange={handleInputChange}
                maxLength={200}
              />
              <input
                className={styles.input}
                placeholder="Tax ID"
                name="supplier_tax_id"
                value={form.supplier_tax_id}
                onChange={handleInputChange}
                maxLength={13}
              />
              <textarea
                className={styles.textarea}
                placeholder="หมายเหตุ"
                name="supplier_note"
                value={form.supplier_note}
                onChange={handleInputChange}
                maxLength={500}
              />
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.primaryButton} onClick={handleSave}>
                บันทึก
              </button>
              <button className={styles.ghostBtn} onClick={() => setShowModal(false)}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}