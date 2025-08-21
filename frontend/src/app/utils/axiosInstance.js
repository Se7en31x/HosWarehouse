//app/utils/axiosInstance
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:5000/api', // ชี้ไปที่ backend ของคุณ
});

export default axiosInstance;
