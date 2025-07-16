// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // เพิ่มพาธเหล่านี้เข้าไป เพื่อให้ Tailwind สแกนไฟล์ในโปรเจกต์ของคุณ
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // ถ้าคุณมีโฟลเดอร์ src ด้วย ให้เพิ่มพาธนี้เข้าไป
    // "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};