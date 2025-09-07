import axios from "axios";
import { jwtDecode } from "jwt-decode";

const baseConfig = {
  baseURL: "http://localhost:5000/api", // 👉 เปลี่ยนตามจริงถ้า deploy
  withCredentials: false,
};

// 🔎 ฟังก์ชันดึง token + ใส่ลง header
const setAuthHeader = (config, key) => {
  const token = localStorage.getItem(key);
  if (token) {
    try {
      const decoded = jwtDecode(token);
      console.log(`📌 ${key} detected role:`, decoded.role || "unknown");
      config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      console.error(`❌ Invalid token for ${key}`, e);
    }
  }
  return config;
};

// 👉 Admin
export const adminAxios = axios.create(baseConfig);
adminAxios.interceptors.request.use((config) =>
  setAuthHeader(config, "authToken_admin")
);

// 👉 เจ้าหน้าที่คลัง
export const manageAxios = axios.create(baseConfig);
manageAxios.interceptors.request.use((config) =>
  setAuthHeader(config, "authToken_manage")
);

// 👉 บุคลากรทั่วไป (หมอ / พยาบาล / staff)
export const staffAxios = axios.create(baseConfig);
staffAxios.interceptors.request.use((config) =>
  setAuthHeader(config, "authToken_staff")
);

// 👉 ฝ่ายจัดซื้อ
export const purchasingAxios = axios.create(baseConfig);
purchasingAxios.interceptors.request.use((config) =>
  setAuthHeader(config, "authToken_purchasing")
);

// 👉 Default axios (ไม่ผูก role)
const axiosInstance = axios.create(baseConfig);
export default axiosInstance;
