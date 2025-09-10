// src/app/components/pdf/helpers.js
// ฟังก์ชันช่วยเหลือ เช่น โหลดฟอนต์ / dataURL

// โหลด URL เป็น DataURL
export async function loadDataUrl(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// แปลง ArrayBuffer เป็น Base64
export function bufferToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
