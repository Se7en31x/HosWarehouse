
"use client";
import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axiosInstance from "@/app/utils/axiosInstance";
import { FaSearch } from "react-icons/fa";
import Swal from "sweetalert2";
import exportPDF from "@/app/components/pdf/PDFExporter";

const categories = ["ทั้งหมด", "ยา", "เวชภัณฑ์", "ครุภัณฑ์", "อุปกรณ์ทางการแพทย์", "ของใช้ทั่วไป"];

const PurchaseRequestPage = () => {
  const [requests, setRequests] = useState([]);
  const [filterCategory, setFilterCategory] = useState("ทั้งหมด");
  const [showModal, setShowModal] = useState(false);
  const [specs, setSpecs] = useState({});
  const [loading, setLoading] = useState(true);

  // Load purchase requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await axiosInstance.get("/pr");
        setRequests(res.data.map((item) => ({ ...item, checked: false })));
      } catch (err) {
        Swal.fire({
          title: "ผิดพลาด",
          text: "ไม่สามารถดึงข้อมูลคำขอสั่งซื้อได้: " + (err.response?.data?.message || err.message),
          icon: "error",
          confirmButtonText: "ตกลง",
          customClass: { confirmButton: styles.swalButton },
        });
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleFilterChange = (e) => setFilterCategory(e.target.value);

  const handleCheckboxChange = (id) => {
    setRequests((prev) =>
      prev.map((item) =>
        (item.pr_item_id || item.pr_id) === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleSelectAll = () => {
    setRequests((prev) => prev.map((item) => ({ ...item, checked: true })));
  };

  const handleClearSelection = () => {
    setRequests((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  const handleSpecChange = (id, value) => {
    setSpecs((prev) => ({ ...prev, [id]: value }));
  };

  const handleGenerateQuotation = () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }
    setShowModal(true);
  };

  const handleSubmitQuotation = async () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) return;

    try {
      const res = await axiosInstance.post("/rfq", {
        created_by: 1, // TODO: แทนด้วย user จาก session
        items: selectedItems.map((item) => ({
          pr_id: item.pr_id,
          pr_item_id: item.pr_item_id,
          qty: item.qty_requested,
          unit: item.unit,
          spec: specs[item.pr_item_id || item.pr_id] || null,
        })),
      });

      Swal.fire("สำเร็จ", "สร้างใบขอราคาเรียบร้อย: " + res.data.rfq_no, "success");
      setShowModal(false);
      setRequests((prev) => prev.map((item) => ({ ...item, checked: false })));
      setSpecs({});
    } catch (err) {
      Swal.fire("ผิดพลาด", err.response?.data?.message || err.message, "error");
    }
  };

  const handleExportPDF = async () => {
    const selectedItems = requests.filter((item) => item.checked);
    if (selectedItems.length === 0) {
      Swal.fire({
        title: "แจ้งเตือน",
        text: "กรุณาเลือกอย่างน้อยหนึ่งรายการ",
        icon: "warning",
        confirmButtonText: "ตกลง",
        customClass: { confirmButton: styles.swalButton },
      });
      return;
    }

    const rfqNumber = `RFQ-${new Date().getTime()}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    await exportPDF({
      filename: `ใบขอราคา_${rfqNumber}.pdf`,
      title: "ใบขอราคา (Request for Quotation)",
      meta: {
        headerBlock: [
          ["เลขที่เอกสาร", rfqNumber],
          ["วันที่ออก", new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })],
        ],
        leftBlock: [
          ["ผู้จัดทำ", "ฝ่ายจัดซื้อ โรงพยาบาลตัวอย่าง"],
          ["ที่อยู่", "123/45 ถนนสุขภาพ แขวงการแพทย์ เขตเมือง กรุงเทพฯ 10110"],
          ["เบอร์โทร", "02-123-4567"],
        ],
        rightBlock: [
          ["หน่วยงาน", "งานคลังพัสดุ"],
          ["อีเมล", "purchasing@hospital.com"],
          ["กำหนดส่งใบเสนอราคา", dueDate],
        ],
        footerBlock: [
          ["เงื่อนไขการชำระเงิน", "ชำระภายใน 30 วันหลังรับสินค้า"],
          ["การจัดส่ง", "จัดส่งฟรีภายใน 7 วันทำการ ถึงโรงพยาบาลตัวอย่าง"],
          ["ภาษี", "ราคารวมภาษีมูลค่าเพิ่ม 7%"],
          ["หมายเหตุ", "กรุณาระบุระยะเวลาการส่งมอบและเงื่อนไขการรับประกันในใบเสนอราคา"],
        ],
        sections: {
          leftTitle: "ข้อมูลผู้จัดทำ",
          rightTitle: "ข้อมูลการติดต่อ",
          footerTitle: "เงื่อนไขใบขอราคา",
        },
        layout: {
          tableColWidths: [15, 70, 20, 20, 65], // Sequence, Item Name, Quantity, Unit, Specs
        },
      },
      columns: ["ลำดับ", "ชื่อสินค้า", "จำนวน", "หน่วย", "คุณลักษณะ"],
      rows: selectedItems.map((item, idx) => [
        idx + 1,
        item.item_name || "-",
        item.qty_requested || 0,
        item.unit || "-",
        specs[item.pr_item_id || item.pr_id] || "-",
      ]),
      signatures: { roles: ["ผู้จัดทำ", "ผู้ตรวจสอบ", "ผู้อนุมัติ"] },
      options: {
        brand: {
          name: "โรงพยาบาลตัวอย่าง",
          address: "123/45 ถนนสุขภาพ แขวงการแพทย์ เขตเมือง กรุงเทพฯ 10110",
          phone: "02-123-4567",
          email: "purchasing@hospital.com",
          logoUrl: "/font/Sarabun/logo.png", // Place logo in public/font/Sarabun/
          headerBand: true,
          bandColor: [0, 141, 218],
          logoWidth: 20,
          logoHeight: 20,
        },
        watermark: { text: "RFQ", angle: 45 },
        footerCols: 1,
        margin: { left: 15, right: 15, top: 20, bottom: 20 },
        font: { size: { title: 18, body: 11, table: 10, footer: 9 } },
      },
    });
  };

  const filteredRequests =
    filterCategory === "ทั้งหมด"
      ? requests
      : requests.filter((item) => item.item_category === filterCategory);

  if (loading) return <div className={styles.loading}>กำลังโหลด...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>ระบบการสั่งซื้อ - ออกใบขอราคา</h1>

      {/* Filter */}
      <div className={styles.filter}>
        <label>ประเภท: </label>
        <select value={filterCategory} onChange={handleFilterChange}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>เลือก</th>
              <th>PR NO</th>
              <th>ชื่อสินค้า</th>
              <th>จำนวน</th>
              <th>หน่วย</th>
              <th>ประเภท</th>
              <th>ผู้ขอ</th>
              <th>สถานะ</th>
              <th>วันที่</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((item) => {
              const rowKey = item.pr_item_id || item.pr_id;
              return (
                <tr key={rowKey}>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.checked || false}
                      onChange={() => handleCheckboxChange(rowKey)}
                    />
                  </td>
                  <td>{item.pr_no || "-"}</td>
                  <td>{item.item_name || "-"}</td>
                  <td>{item.qty_requested || 0}</td>
                  <td>{item.unit || "-"}</td>
                  <td>{item.item_category || "-"}</td>
                  <td>
                    {item.user_fname || ""} {item.user_lname || ""}
                  </td>
                  <td>{item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : "-"}</td>
                  <td>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString("th-TH") : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Buttons */}
      <div className={styles.buttonGroup}>
        <button className={styles.button} onClick={handleSelectAll}>
          เลือกทั้งหมด
        </button>
        <button className={styles.button} onClick={handleClearSelection}>
          ล้างการเลือก
        </button>
        <button
          className={styles.button}
          onClick={handleGenerateQuotation}
          disabled={!requests.some((item) => item.checked)}
        >
          ออกใบขอราคา
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>ใบขอราคา</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PR No</th>
                  <th>ชื่อสินค้า</th>
                  <th>จำนวน</th>
                  <th>หน่วย</th>
                  <th>คุณลักษณะ (ระบุเพิ่มเติม)</th>
                </tr>
              </thead>
              <tbody>
                {requests
                  .filter((item) => item.checked)
                  .map((item) => {
                    const rowKey = item.pr_item_id || item.pr_id;
                    return (
                      <tr key={rowKey}>
                        <td>{item.pr_no || "-"}</td>
                        <td>{item.item_name || "-"}</td>
                        <td>{item.qty_requested || 0}</td>
                        <td>{item.unit || "-"}</td>
                        <td>
                          <input
                            type="text"
                            value={specs[rowKey] || ""}
                            onChange={(e) => handleSpecChange(rowKey, e.target.value)}
                            placeholder="ระบุคุณลักษณะ เช่น ขนาด, สี, รุ่น"
                            className={styles.input}
                          />
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            <div className={styles.modalFooter}>
              <button className={styles.button} onClick={handleExportPDF}>
                ⬇️ ดาวน์โหลด PDF
              </button>
              <button className={styles.button} onClick={handleSubmitQuotation}>
                บันทึกและส่ง
              </button>
              <button className={styles.buttonDanger} onClick={() => setShowModal(false)}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseRequestPage;
