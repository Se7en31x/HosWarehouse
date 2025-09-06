// middleware/checkPermission.js
const rolePermissions = require("../config/rolePermissions");

function checkPermission(requiredCategories) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({ message: "ไม่พบ role ของผู้ใช้งาน" });
    }

    const allowed = rolePermissions[role] || [];
    const hasPermission = requiredCategories.some(
      (cat) => allowed.includes(cat) || allowed.includes("*")
    );

    if (!hasPermission) {
      return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงหมวดนี้" });
    }

    next();
  };
}

module.exports = checkPermission;
