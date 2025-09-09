// controllers/userController.js
const { pool } = require("../config/db");

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows } = await pool.query(
      `
      SELECT 
  u.user_id,
  u.username,
  u.firstname AS user_fname,
  u.lastname AS user_lname,
  u.role,
  u.is_active
FROM "Admin".users u
WHERE u.user_id = $1

      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ getProfile error:", err.message);
    return res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};
