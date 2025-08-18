'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';
import {
  FaRegCircle, FaCheckCircle, FaTimesCircle, FaChevronDown,
  FaSearch, FaBolt, FaClock, FaSortAmountDown, FaCheck,
  FaCalendarAlt, FaTimes
} from 'react-icons/fa';

import { DayPicker } from 'react-day-picker';
import {
  format,
  startOfDay, endOfDay,
  startOfMonth, endOfMonth,
  subDays
} from 'date-fns';
import { th as thLocale } from 'date-fns/locale';

/* ---------- Mock data (แทนที่ด้วยข้อมูลจริงได้) ---------- */
const mockRequests = [
  {
    id: 1,
    request_id: 'REQ-2025-0001',
    type: 'เบิก',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: true,
    request_date: '2025-08-17T09:15:00+07:00',
    last_updated: '2025-08-18T14:30:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-17 09:15', is_completed: true,  is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-17 11:00', is_completed: true,  is_rejected: false },
      { label: 'กำลังเตรียมของ', date: '', is_completed: false, is_rejected: false },
      { label: 'นำส่ง/รับของ',  date: '', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-01', name: 'หน้ากากอนามัย', quantity: 50, unit: 'ชิ้น', image: '' },
      { id: 'itm-02', name: 'ถุงมือไนไตรล์', quantity: 30, unit: 'กล่อง', image: '' },
    ],
  },
  {
    id: 2,
    request_id: 'REQ-2025-0002',
    type: 'ยืม',
    status: 'completed',
    status_th: 'เสร็จสิ้น',
    urgent: false,
    request_date: '2025-08-15T16:00:00+07:00',
    last_updated: '2025-08-16T10:20:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-15 16:00', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-15 17:10', is_completed: true, is_rejected: false },
      { label: 'เบิก/ยืมของ', date: '2025-08-15 18:00', is_completed: true, is_rejected: false },
      { label: 'รับของเรียบร้อย', date: '2025-08-16 09:30', is_completed: true, is_rejected: false },
    ],
    items: [
      { id: 'itm-03', name: 'เครื่องวัดความดัน', quantity: 1, unit: 'เครื่อง', image: '' },
      { id: 'itm-04', name: 'เทปพันแผล', quantity: 10, unit: 'ม้วน', image: '' },
    ],
  },
  {
    id: 3,
    request_id: 'REQ-2025-0003',
    type: 'เบิก',
    status: 'rejected',
    status_th: 'ถูกปฏิเสธ',
    urgent: false,
    request_date: '2025-07-30T11:00:00+07:00',
    last_updated: '2025-07-31T09:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-07-30 11:00', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-07-30 15:20', is_completed: false, is_rejected: true },
    ],
    items: [
      { id: 'itm-05', name: 'แอลกอฮอล์ล้างมือ 500ml', quantity: 12, unit: 'ขวด', image: '' },
    ],
  },
  {
    id: 4,
    request_id: 'REQ-2025-0004',
    type: 'เบิก',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: false,
    request_date: '2025-08-18T08:05:00+07:00',
    last_updated: '2025-08-18T10:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-18 08:05', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-18 09:10', is_completed: true, is_rejected: false },
      { label: 'กำลังเตรียมของ', date: '', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-06', name: 'ผ้าก๊อซ 4x4 นิ้ว', quantity: 100, unit: 'ชิ้น', image: '' },
      { id: 'itm-07', name: 'น้ำเกลือล้างแผล 1000ml', quantity: 6, unit: 'ขวด', image: '' },
    ],
  },
  {
    id: 5,
    request_id: 'REQ-2025-0005',
    type: 'เบิก',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: true,
    request_date: '2025-08-12T13:40:00+07:00',
    last_updated: '2025-08-18T09:25:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-12 13:40', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-12 14:10', is_completed: true, is_rejected: false },
      { label: 'กำลังเตรียมของ', date: '2025-08-18 09:00', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-08', name: 'ไซริงค์ 5ml', quantity: 200, unit: 'อัน', image: '' },
      { id: 'itm-09', name: 'ชุดให้น้ำเกลือ', quantity: 20, unit: 'ชุด', image: '' },
    ],
  },
  {
    id: 6,
    request_id: 'REQ-2025-0006',
    type: 'ยืม',
    status: 'completed',
    status_th: 'เสร็จสิ้น',
    urgent: false,
    request_date: '2025-08-10T10:00:00+07:00',
    last_updated: '2025-08-11T08:15:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-10 10:00', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-10 10:30', is_completed: true, is_rejected: false },
      { label: 'เบิก/ยืมของ', date: '2025-08-10 11:00', is_completed: true, is_rejected: false },
      { label: 'รับของเรียบร้อย', date: '2025-08-11 08:00', is_completed: true, is_rejected: false },
    ],
    items: [
      { id: 'itm-10', name: 'เครื่องวัดออกซิเจนปลายนิ้ว', quantity: 2, unit: 'เครื่อง', image: '' },
    ],
  },
  {
    id: 7,
    request_id: 'REQ-2025-0007',
    type: 'เบิก',
    status: 'rejected',
    status_th: 'ถูกปฏิเสธ',
    urgent: false,
    request_date: '2025-08-05T14:10:00+07:00',
    last_updated: '2025-08-05T15:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-05 14:10', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-05 15:00', is_completed: false, is_rejected: true },
    ],
    items: [
      { id: 'itm-11', name: 'เครื่องวัดอุณหภูมิอินฟราเรด', quantity: 1, unit: 'เครื่อง', image: '' },
    ],
  },
  {
    id: 8,
    request_id: 'REQ-2025-0008',
    type: 'ยืม',
    status: 'completed',
    status_th: 'เสร็จสิ้น',
    urgent: true,
    request_date: '2025-07-20T09:00:00+07:00',
    last_updated: '2025-07-21T12:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-07-20 09:00', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-07-20 09:40', is_completed: true, is_rejected: false },
      { label: 'เบิก/ยืมของ', date: '2025-07-20 10:30', is_completed: true, is_rejected: false },
      { label: 'รับของเรียบร้อย', date: '2025-07-21 11:30', is_completed: true, is_rejected: false },
    ],
    items: [
      { id: 'itm-12', name: 'ปั๊มฉีดยา (Syringe Pump)', quantity: 1, unit: 'เครื่อง', image: '' },
      { id: 'itm-13', name: 'สายต่ออินฟิวชั่น', quantity: 5, unit: 'เส้น', image: '' },
    ],
  },
  {
    id: 9,
    request_id: 'REQ-2025-0009',
    type: 'เบิก',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: false,
    request_date: '2025-08-01T08:30:00+07:00',
    last_updated: '2025-08-17T16:10:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-01 08:30', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-01 09:00', is_completed: true, is_rejected: false },
      { label: 'กำลังเตรียมของ', date: '2025-08-17 16:00', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-14', name: 'ผ้าพันยืด', quantity: 25, unit: 'ม้วน', image: '' },
    ],
  },
  {
    id: 10,
    request_id: 'REQ-2025-0010',
    type: 'เบิก',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: true,
    request_date: '2025-08-18T15:20:00+07:00',
    last_updated: '2025-08-18T15:45:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-18 15:20', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-15', name: 'มีดผ่าตัด (เบอร์ 11)', quantity: 10, unit: 'เล่ม', image: '' },
      { id: 'itm-16', name: 'ใบมีดสำรอง', quantity: 50, unit: 'ใบ', image: '' },
    ],
  },
  {
    id: 11,
    request_id: 'REQ-2025-0011',
    type: 'ยืม',
    status: 'completed',
    status_th: 'เสร็จสิ้น',
    urgent: false,
    request_date: '2025-06-25T10:00:00+07:00',
    last_updated: '2025-06-26T09:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-06-25 10:00', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-06-25 10:20', is_completed: true, is_rejected: false },
      { label: 'เบิก/ยืมของ', date: '2025-06-25 11:00', is_completed: true, is_rejected: false },
      { label: 'รับของเรียบร้อย', date: '2025-06-26 09:00', is_completed: true, is_rejected: false },
    ],
    items: [
      { id: 'itm-17', name: 'เครื่องพ่นละอองยา Nebulizer', quantity: 1, unit: 'เครื่อง', image: '' },
    ],
  },
  {
    id: 12,
    request_id: 'REQ-2025-0012',
    type: 'เบิก',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: false,
    request_date: '2025-08-14T12:05:00+07:00',
    last_updated: '2025-08-16T09:30:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-14 12:05', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-14 13:00', is_completed: true, is_rejected: false },
      { label: 'กำลังเตรียมของ', date: '2025-08-16 09:00', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-18', name: 'ผ้าปิดแผลกันน้ำ', quantity: 40, unit: 'ชิ้น', image: '' },
      { id: 'itm-19', name: 'สำลีปราศจากเชื้อ', quantity: 5, unit: 'ห่อ', image: '' },
    ],
  },
  {
    id: 13,
    request_id: 'REQ-2025-0013',
    type: 'ยืม',
    status: 'rejected',
    status_th: 'ถูกปฏิเสธ',
    urgent: false,
    request_date: '2025-07-28T08:45:00+07:00',
    last_updated: '2025-07-28T10:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-07-28 08:45', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-07-28 10:00', is_completed: false, is_rejected: true },
    ],
    items: [
      { id: 'itm-20', name: 'เครื่องกระตุกหัวใจ AED', quantity: 1, unit: 'เครื่อง', image: '' },
    ],
  },
  {
    id: 14,
    request_id: 'REQ-2025-0014',
    type: 'เบิก',
    status: 'completed',
    status_th: 'เสร็จสิ้น',
    urgent: false,
    request_date: '2025-08-03T09:10:00+07:00',
    last_updated: '2025-08-04T08:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-03 09:10', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-03 09:40', is_completed: true, is_rejected: false },
      { label: 'กำลังเตรียมของ', date: '2025-08-03 10:30', is_completed: true, is_rejected: false },
      { label: 'นำส่ง/รับของ', date: '2025-08-04 08:00', is_completed: true, is_rejected: false },
    ],
    items: [
      { id: 'itm-21', name: 'ผ้าปูที่นอนผู้ป่วย', quantity: 20, unit: 'ผืน', image: '' },
    ],
  },
  {
    id: 15,
    request_id: 'REQ-2025-0015',
    type: 'ยืม',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: false,
    request_date: '2025-08-09T14:30:00+07:00',
    last_updated: '2025-08-12T16:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-09 14:30', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-09 15:00', is_completed: true, is_rejected: false },
      { label: 'เบิก/ยืมของ', date: '', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-22', name: 'เครื่องวัดระดับน้ำตาล', quantity: 1, unit: 'เครื่อง', image: '' },
      { id: 'itm-23', name: 'แผ่นทดสอบน้ำตาล', quantity: 50, unit: 'แผ่น', image: '' },
    ],
  },
  {
    id: 16,
    request_id: 'REQ-2025-0016',
    type: 'เบิก',
    status: 'completed',
    status_th: 'เสร็จสิ้น',
    urgent: true,
    request_date: '2025-08-02T07:50:00+07:00',
    last_updated: '2025-08-02T12:10:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-02 07:50', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-02 08:15', is_completed: true, is_rejected: false },
      { label: 'กำลังเตรียมของ', date: '2025-08-02 09:30', is_completed: true, is_rejected: false },
      { label: 'นำส่ง/รับของ', date: '2025-08-02 12:10', is_completed: true, is_rejected: false },
    ],
    items: [
      { id: 'itm-24', name: 'เสื้อกาวน์แพทย์', quantity: 5, unit: 'ตัว', image: '' },
      { id: 'itm-25', name: 'หมวกคลุมผม', quantity: 100, unit: 'ชิ้น', image: '' },
    ],
  },
  {
    id: 17,
    request_id: 'REQ-2025-0017',
    type: 'เบิก',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: false,
    request_date: '2025-08-18T11:30:00+07:00',
    last_updated: '2025-08-18T12:50:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-18 11:30', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-26', name: 'น้ำยาฆ่าเชื้อพื้นผิว', quantity: 10, unit: 'แกลลอน', image: '' },
    ],
  },
  {
    id: 18,
    request_id: 'REQ-2025-0018',
    type: 'ยืม',
    status: 'completed',
    status_th: 'เสร็จสิ้น',
    urgent: false,
    request_date: '2025-07-05T13:00:00+07:00',
    last_updated: '2025-07-06T09:20:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-07-05 13:00', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-07-05 13:30', is_completed: true, is_rejected: false },
      { label: 'เบิก/ยืมของ', date: '2025-07-05 14:30', is_completed: true, is_rejected: false },
      { label: 'รับของเรียบร้อย', date: '2025-07-06 09:20', is_completed: true, is_rejected: false },
    ],
    items: [
      { id: 'itm-27', name: 'เครื่องดูดเสมหะแบบพกพา', quantity: 1, unit: 'เครื่อง', image: '' },
    ],
  },
  {
    id: 19,
    request_id: 'REQ-2025-0019',
    type: 'เบิก',
    status: 'rejected',
    status_th: 'ถูกปฏิเสธ',
    urgent: true,
    request_date: '2025-08-13T10:25:00+07:00',
    last_updated: '2025-08-13T11:00:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-13 10:25', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-13 11:00', is_completed: false, is_rejected: true },
    ],
    items: [
      { id: 'itm-28', name: 'มีดผ่าตัด (เบอร์ 15)', quantity: 5, unit: 'เล่ม', image: '' },
    ],
  },
  {
    id: 20,
    request_id: 'REQ-2025-0020',
    type: 'ยืม',
    status: 'in_progress',
    status_th: 'กำลังดำเนินการ',
    urgent: false,
    request_date: '2025-08-16T09:00:00+07:00',
    last_updated: '2025-08-18T13:45:00+07:00',
    steps: [
      { label: 'ส่งคำขอ', date: '2025-08-16 09:00', is_completed: true, is_rejected: false },
      { label: 'ผู้จัดการอนุมัติ', date: '2025-08-16 09:30', is_completed: true, is_rejected: false },
      { label: 'เบิก/ยืมของ', date: '', is_completed: false, is_rejected: false },
    ],
    items: [
      { id: 'itm-29', name: 'เครื่องติดตามสัญญาณชีพ (Monitor)', quantity: 1, unit: 'เครื่อง', image: '' },
      { id: 'itm-30', name: 'สาย ECG', quantity: 3, unit: 'เส้น', image: '' },
    ],
  },
];



const STATUS_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'in_progress', label: 'กำลังดำเนินการ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'rejected', label: 'ถูกปฏิเสธ' },
];
const TYPE_OPTIONS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'เบิก', label: 'เบิก' },
  { value: 'ยืม', label: 'ยืม' },
];
const SORT_OPTIONS = [
  { value: 'recent', label: 'อัปเดตล่าสุด' },
  { value: 'oldest', label: 'เก่าสุดก่อน' },
];

/* ---------- NiceSelect ---------- */
function NiceSelect({ value, onChange, options, placeholder = 'เลือก...', className = '' }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(options.findIndex(o => o.value === value));
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => { setHighlight(options.findIndex(o => o.value === value)); }, [value, options]);
  useEffect(() => {
    const onDocClick = (e) => { if (!btnRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape', 'Home', 'End'].includes(e.key)) e.preventDefault();
    switch (e.key) {
      case 'ArrowDown': setOpen(true); setHighlight(h => Math.min(options.length - 1, (h < 0 ? 0 : h + 1))); break;
      case 'ArrowUp': setOpen(true); setHighlight(h => Math.max(0, (h < 0 ? 0 : h - 1))); break;
      case 'Home': setOpen(true); setHighlight(0); break;
      case 'End': setOpen(true); setHighlight(options.length - 1); break;
      case 'Enter':
      case ' ':
        if (open && highlight >= 0) { onChange(options[highlight].value); setOpen(false); } else { setOpen(true); }
        break;
      case 'Escape': setOpen(false); break;
    }
  };

  const selected = options.find(o => o.value === value);

  return (
    <div className={`${styles.selectRoot} ${className}`}>
      <button
        ref={btnRef}
        type="button"
        className={styles.selectButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKey}
      >
        <span>{selected ? selected.label : placeholder}</span>
        <FaChevronDown className={styles.selectArrow} />
      </button>

      {open && (
        <ul
          ref={menuRef}
          role="listbox"
          className={styles.selectMenu}
          aria-activedescendant={highlight >= 0 ? `opt-${options[highlight].value}` : undefined}
        >
          {options.map((opt, idx) => {
            const isSel = opt.value === value;
            const isAct = idx === highlight;
            return (
              <li
                id={`opt-${opt.value}`}
                key={opt.value}
                role="option"
                aria-selected={isSel}
                className={`${styles.option} ${isAct ? styles.optionActive : ''} ${isSel ? styles.optionSelected : ''}`}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span>{opt.label}</span>
                {isSel && <FaCheck className={styles.optionCheck} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- DateRangeInput (ใช้ .rdp-weekdays ให้ตรงกับวันที่) ---------- */
function DateRangeInput({ value, onChange, placeholder = 'เลือกช่วงวันที่' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || { from: undefined, to: undefined });
  const wrapRef = useRef(null);

  // 1 = จันทร์, 0 = อาทิตย์ (แก้ค่าตรงนี้ค่าเดียวหากต้องการ)
  const WEEK_START = 1;

  // กำหนดชื่อวันไทยให้แน่นอน (ตาม getDay: 0=อา … 6=ส)
  const formatters = {
    formatWeekdayName: (date) => {
      // ✅ เรียงตาม getDay(): 0=อา, 1=จ, 2=อ, 3=พ, 4=พฤ, 5=ศ, 6=ส  
      const TH_WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
      return TH_WEEKDAYS[date.getDay()];
    },
  };
  // locale ที่ fix ให้เริ่มสัปดาห์ตรงกับ WEEK_START
  const thLocaleFixed = {
    ...thLocale,
    options: {
      ...(thLocale.options || {}),
      weekStartsOn: WEEK_START // 1 = จันทร์
    },
  };

  useEffect(() => {
    const onDocClick = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => { setDraft(value || { from: undefined, to: undefined }); }, [value]);

  const displayText = (() => {
    if (value?.from && value?.to) {
      return `${format(value.from, 'dd/MM/yyyy', { locale: thLocale })} – ${format(value.to, 'dd/MM/yyyy', { locale: thLocale })}`;
    }
    if (value?.from) return `${format(value.from, 'dd/MM/yyyy', { locale: thLocale })} – `;
    return '';
  })();

  const apply = () => { onChange(draft); setOpen(false); };
  const clear = () => { onChange({ from: undefined, to: undefined }); setOpen(false); };

  // ปุ่มลัด
  const setToday = () => setDraft({ from: startOfDay(new Date()), to: endOfDay(new Date()) });
  const setLast7 = () => setDraft({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) });
  const setThisMonth = () => {
    const now = new Date();
    setDraft({ from: startOfMonth(now), to: endOfMonth(now) });
  };
  const setPrevMonth = () => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setDraft({ from: startOfMonth(prev), to: endOfMonth(prev) });
  };

  return (
    <div ref={wrapRef} className={styles.rangeInputWrap} data-has-value={!!displayText} data-placeholder={placeholder}>
      <button type="button" className={styles.calBtn} onClick={() => setOpen(true)} aria-label={placeholder} title={placeholder}>
        <FaCalendarAlt />
      </button>

      <input
        type="text"
        readOnly
        className={`${styles.inputPill} ${styles.rangeDisplay}`}
        value={displayText}
        onMouseDown={(e) => { e.preventDefault(); setOpen(true); }}
        onFocus={() => setOpen(true)}
        aria-label={placeholder}
      />

      {displayText && (
        <button type="button" className={styles.clearBtn} onClick={clear} aria-label="ล้างช่วงวันที่" title="ล้างช่วงวันที่">
          <FaTimes />
        </button>
      )}

      {open && (
        <div className={styles.calendarPop} role="dialog" aria-modal="true">
          <div className={styles.presets}>
            <button className={styles.presetBtn} onClick={setToday}>วันนี้</button>
            <button className={styles.presetBtn} onClick={setLast7}>7 วันล่าสุด</button>
            <button className={styles.presetBtn} onClick={setThisMonth}>เดือนนี้</button>
            <button className={styles.presetBtn} onClick={setPrevMonth}>เดือนที่แล้ว</button>
          </div>

          <DayPicker
            mode="range"
            numberOfMonths={1}
            selected={draft}
            onSelect={setDraft}
            weekStartsOn={WEEK_START}
            locale={thLocaleFixed}
            formatters={formatters}
            showOutsideDays
            captionLayout="dropdown"
            fromYear={2020}
            toYear={2032}
            defaultMonth={draft?.from || draft?.to || new Date()}
          />

          <div className={styles.calendarFooter}>
            <button type="button" className={styles.calAction} onClick={clear}>ล้าง</button>
            <button type="button" className={styles.calActionPrimary} onClick={apply}>ใช้ช่วงนี้</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Page ---------- */
export default function RequestStatus() {
  const [requests, setRequests] = useState([]);
  const [expandedRequest, setExpandedRequest] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => { setRequests(mockRequests); }, []);

  const counts = useMemo(() => {
    const c = { all: requests.length, in_progress: 0, completed: 0, rejected: 0 };
    requests.forEach(r => (c[r.status] = (c[r.status] || 0) + 1));
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const matches = requests.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (urgentOnly && !r.urgent) return false;

      const t = (r.request_id + ' ' + (r.items || []).map(i => i.name).join(' ')).toLowerCase();
      if (search && !t.includes(search.toLowerCase())) return false;

      const d = new Date(r.request_date);
      if (dateRange?.from && d < startOfDay(dateRange.from)) return false;
      if (dateRange?.to && d > endOfDay(dateRange.to)) return false;

      return true;
    });

    matches.sort((a, b) =>
      sortBy === 'recent'
        ? new Date(b.last_updated) - new Date(a.last_updated)
        : new Date(a.last_updated) - new Date(b.last_updated)
    );
    return matches;
  }, [requests, statusFilter, typeFilter, urgentOnly, dateRange, search, sortBy]);

  const toggleExpand = (id) => setExpandedRequest(expandedRequest === id ? null : id);
  const getStatusClass = (s) =>
    s === 'in_progress' ? styles.in_progress :
      s === 'completed' ? styles.completed :
        s === 'rejected' ? styles.rejected : styles.pending;

  const resetFilters = () => {
    setStatusFilter('all'); setTypeFilter('all'); setUrgentOnly(false);
    setDateRange({ from: undefined, to: undefined });
    setSearch(''); setSortBy('recent');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.topbar}>
        <div><h2 className={styles.header}>สถานะคำขอของฉัน</h2></div>
        <div className={styles.quickStats}>
          <div className={styles.statCard}><span>ทั้งหมด</span><strong>{counts.all}</strong></div>
          <div className={styles.statCard}><span>กำลังดำเนินการ</span><strong>{counts.in_progress || 0}</strong></div>
          <div className={styles.statCard}><span>เสร็จสิ้น</span><strong>{counts.completed || 0}</strong></div>
          <div className={styles.statCard}><span>ถูกปฏิเสธ</span><strong>{counts.rejected || 0}</strong></div>
        </div>
      </div>

      {/* Layout */}
      <div className={styles.layout}>
        {/* Sidebar Filters */}
        <aside className={styles.sidebar}>
          <div className={styles.filterHeader}>
            <span>ฟิลเตอร์</span>
            <button className={styles.resetBtn} onClick={resetFilters}>รีเซ็ตทั้งหมด</button>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.field}>
              <label className={styles.label}>สถานะ</label>
              <NiceSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
              <div className={styles.helper}>เลือกสถานะที่ต้องการแสดงผล</div>
            </div>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.field}>
              <label className={styles.label}>ประเภท</label>
              <NiceSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
            </div>
          </div>

          {/* วันที่ */}
          <div className={styles.filterSection}>
            <div className={styles.field}>
              <label className={styles.label}>ช่วงวันที่</label>
              <DateRangeInput value={dateRange} onChange={setDateRange} />
              <div className={styles.helper}>เลือกช่วงวันที่เพื่อกรองคำขอ</div>
            </div>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.fieldRow}>
              <button
                type="button"
                role="switch"
                aria-checked={urgentOnly}
                className={`${styles.switch} ${urgentOnly ? styles.switchOn : ''}`}
                onClick={() => setUrgentOnly(v => !v)}
              >
                <span className={styles.knob} />
              </button>
              <span className={styles.switchLabel}><FaBolt /> เร่งด่วนเท่านั้น</span>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className={styles.main}>
          <div className={styles.toolbarMain}>
            <div className={styles.searchBox}>
              <FaSearch />
              <input
                type="text"
                placeholder="ค้นหาเลขคำขอหรือชื่อรายการ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.sortBox}>
              <FaSortAmountDown />
              <NiceSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} className={styles.sortSelect} />
            </div>
          </div>

          <div className={styles.requestList}>
            {filtered.length > 0 ? (
              filtered.map((request) => (
                <div key={request.id} className={styles.requestCard}>
                  <div className={styles.cardSummary} onClick={() => toggleExpand(request.id)}>
                    <div className={styles.cardLeft}>
                      <div className={styles.timeBlock}>
                        <FaClock />
                        <div>
                          <div className={styles.timeTop}>{request.request_date}</div>
                          <div className={styles.timeSub}>อัปเดต {request.last_updated}</div>
                        </div>
                      </div>

                      <div className={styles.mainInfo}>
                        <h3 className={styles.requestID}>{request.request_id}</h3>
                        <div className={styles.metaRow}>
                          {request.urgent && <span className={`${styles.pill} ${styles.pillUrgent}`}>เร่งด่วน</span>}
                          <span className={styles.pill}>{request.type}</span>
                          <span className={`${styles.statusPill} ${getStatusClass(request.status)}`}>{request.status_th}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`${styles.expandIcon} ${expandedRequest === request.id ? styles.expanded : ''}`}>
                      <FaChevronDown />
                    </div>
                  </div>

                  {expandedRequest === request.id && (
                    <div className={styles.cardDetails}>
                      <div className={styles.timeline}>
                        {request.steps?.map((step, index) => (
                          <div key={index} className={styles.step}>
                            <div className={`${styles.stepIcon} ${step.is_rejected ? styles.rejected : step.is_completed ? styles.completed : ''}`}>
                              {step.is_rejected ? <FaTimesCircle /> : step.is_completed ? <FaCheckCircle /> : <FaRegCircle />}
                            </div>
                            <div className={styles.stepContent}>
                              <div className={styles.stepLabel}>{step.label}</div>
                              {step.date && <div className={styles.stepDate}>{step.date}</div>}
                            </div>
                            {index < request.steps.length - 1 && (
                              <div className={`${styles.stepLine} ${step.is_completed ? styles.completed : ''}`} />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className={styles.itemsList}>
                        <div className={styles.itemsHeaderRow}>
                          <h4 className={styles.itemsHeader}>รายการสินค้า</h4>
                          <div className={styles.itemsNote}>รวม {request.items?.length || 0} รายการ</div>
                        </div>
                        <div className={styles.itemsGrid}>
                          {request.items?.map((item) => (
                            <div key={item.id} className={styles.itemCard}>
                              <Image src={item.image || '/defaults/landscape.png'} alt={item.name} width={60} height={60} className={styles.itemImage} />
                              <div className={styles.itemInfo}>
                                <div className={styles.itemName}>{item.name}</div>
                                <div className={styles.itemQuantity}>{item.quantity} {item.unit}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className={styles.noRequests}>ไม่มีคำขอที่ตรงกับตัวกรอง</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}