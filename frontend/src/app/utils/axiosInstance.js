// app/utils/axiosInstance.js
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const baseConfig = {
  baseURL: "http://localhost:5000/api", // 👉 backend HosWarehouse (แก้ตามจริงถ้า deploy)
  withCredentials: false,
};

// 🔎 ฟังก์ชันดึง token จาก localStorage
const getToken = () => localStorage.getItem("authToken_staff"); // ใช้ key เดียวพอ

// 👉 Admin
export const adminAxios = axios.create(baseConfig);
adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken_admin");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 👉 เจ้าหน้าที่คลัง
export const manageAxios = axios.create(baseConfig);
manageAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken_manage");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 👉 บุคลากรทั่วไป (หมอ / พยาบาล / เภสัช / staff)
export const staffAxios = axios.create(baseConfig);
staffAxios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    try {
      const decoded = jwtDecode(token);
      console.log("📌 staffAxios detected role:", decoded.role);
      config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error("❌ Invalid staff token", e);
    }
  }
  return config;
});

// 👉 ฝ่ายจัดซื้อ
export const purchasingAxios = axios.create(baseConfig);
purchasingAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken_purchasing");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 👉 Default axios (ไม่ผูก role)
const axiosInstance = axios.create(baseConfig);
export default axiosInstance;
