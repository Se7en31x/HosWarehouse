import { jwtDecode } from "jwt-decode";

export const getToken = (roleKey = "manage") => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`authToken_${roleKey}`);
};

export const decodeToken = (token) => {
  try {
    if (!token) return null;
    const decoded = jwtDecode(token);
    console.log("🔎 Decoded token:", decoded);
    return decoded;
  } catch (err) {
    console.error("❌ Error decoding token:", err);
    return null;
  }
};

export const getUserIdFromToken = (roleKey = "manage") => {
  const token = getToken(roleKey);
  const decoded = decodeToken(token);
  // ✅ รองรับ id, user_id, sub
  return decoded?.user_id || decoded?.id || decoded?.sub || null;
};

export const getUserRoleFromToken = (roleKey = "manage") => {
  const token = getToken(roleKey);
  const decoded = decodeToken(token);
  return decoded?.role || null;
};

export const isTokenValid = (roleKey = "manage") => {
  const token = getToken(roleKey);
  const decoded = decodeToken(token);
  if (!decoded?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp > now;
};
