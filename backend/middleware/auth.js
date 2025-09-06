// middleware/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function authMiddleware(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("📥 Incoming Authorization header:", authHeader || "❌ NONE");

    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    console.log("🔎 Extracted token:", token ? token.slice(0, 30) + "..." : "❌ NONE");

    try {
      // ✅ verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ แปลง id ให้เป็น int
      req.user = {
        id: decoded.id ? parseInt(decoded.id, 10) : null, 
        username: decoded.username,
        role: decoded.role,
        is_active: decoded.is_active,
        departments: decoded.departments || [],
      };

      // console.log("🔑 decoded JWT payload:", decoded);
      // console.log("👉 req.user.id (int):", req.user.id);
      // console.log("✅ role in token:", decoded.role);
      // console.log("✅ roles allowed on this route:", roles);

      // ตรวจสอบ role
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        console.warn("⛔ Forbidden: role not allowed:", req.user.role);
        return res.status(403).json({ error: "Forbidden: insufficient rights" });
      }

      next();
    } catch (err) {
      console.error("❌ Auth error: JWT verification failed");
      console.error("   → Message:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

module.exports = authMiddleware;
