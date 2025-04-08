import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api', // ชี้ไปที่ backend ของคุณ
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
