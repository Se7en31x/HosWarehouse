const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const authMiddleware = require("../middleware/auth");

// ✅ ดึงตะกร้าของ user
router.get(
  "/cart",
  authMiddleware(["warehouse_manager"]), 
  cartController.getCart
);

// ✅ เพิ่ม item ลงตะกร้า
router.post(
  "/cart/add",
  authMiddleware(["warehouse_manager"]), 
  cartController.addToCart
);

// ✅ ลบ item จากตะกร้า
router.delete(
  "/cart/:cart_id",
  authMiddleware(["warehouse_manager"]), 
  cartController.removeFromCart
);

// ✅ เคลียร์ตะกร้า
router.delete(
  "/cart",
  authMiddleware(["warehouse_manager"]), 
  cartController.clearCart
);

// ✅ ยืนยันตะกร้า → สร้าง PR จริง
router.post(
  "/cart/checkout",
  authMiddleware(["warehouse_manager"]), 
  cartController.checkoutCart
);

module.exports = router;
