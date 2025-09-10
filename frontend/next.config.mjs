/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'ijvzxcyfkvahhlveukow.supabase.co'
    ],
  },
  // ✅ เพิ่มการตั้งค่านี้เข้าไป
  experimental: {
    // This option allows global selectors like `:root` in CSS Modules files.
    // Use with caution, as it can lead to style conflicts.
    allowGlobal: true,
  },
};

export default nextConfig;