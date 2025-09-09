// middleware/auth.js
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
require("dotenv").config();

function authMiddleware(roles = []) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ หา user จริงจาก Admin.users
      const { rows } = await pool.query(
        `SELECT u.user_id, u.username, u.firstname, u.lastname, u.role, u.is_active
         FROM "Admin".users u
         WHERE u.user_id = $1`,
        [decoded.id]
      );

      if (!rows.length) {
        return res.status(401).json({ error: "User not found" });
      }

      const dbUser = rows[0];

      // ✅ เซ็ต req.user จาก DB
      req.user = {
        id: dbUser.user_id,
        username: dbUser.username,
        firstname: dbUser.firstname,
        lastname: dbUser.lastname,
        role: dbUser.role,
        is_active: dbUser.is_active,
      };

      // ตรวจสอบ role
      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: "Forbidden: insufficient rights" });
      }

      next();
    } catch (err) {
      console.error("❌ Auth error:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

module.exports = authMiddleware;
