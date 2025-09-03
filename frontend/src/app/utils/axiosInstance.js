//app/utils/axiosInstance

import axios from "axios";

const baseConfig = {
  baseURL: "http://localhost:5000/api", // 👉 backend HosWarehouse (แก้ตามจริงถ้า deploy)
  withCredentials: false, // true ถ้าต้องการส่ง cookie ไปด้วย
};

// 🔎 ฟังก์ชันดึง token ตาม role จาก localStorage
const getToken = (role) => localStorage.getItem(`authToken_${role}`);

// 👉 Admin
export const adminAxios = axios.create(baseConfig);
adminAxios.interceptors.request.use((config) => {
  const token = getToken("admin");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 👉 เจ้าหน้าที่คลัง (รวม manager ไว้ด้วย)
export const manageAxios = axios.create(baseConfig);
manageAxios.interceptors.request.use((config) => {
  const token = getToken("manage");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 👉 บุคลากรทั่วไป (หมอ / พยาบาล / staff อื่น ๆ)
export const staffAxios = axios.create(baseConfig);
staffAxios.interceptors.request.use((config) => {
  const token = getToken("staff");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 👉 ฝ่ายจัดซื้อ
export const purchasingAxios = axios.create(baseConfig);
purchasingAxios.interceptors.request.use((config) => {
  const token = getToken("purchasing");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});



// import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api', // ชี้ไปที่ backend ของคุณ
});

export default axiosInstance;
