const pool = require("../config/db");

exports.getCart = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { rows } = await pool.query(
      `SELECT c.cart_id, c.qty, c.note,
              i.item_name, i.item_unit
       FROM purchase_cart c
       JOIN items i ON c.item_id = i.item_id
       WHERE c.user_id = $1`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "ดึงข้อมูลตะกร้าล้มเหลว", error: err.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { item_id, qty, note } = req.body;
    await pool.query(
      `INSERT INTO purchase_cart (user_id, item_id, qty, note)
       VALUES ($1, $2, $3, $4)`,
      [userId, item_id, qty, note || null]
    );
    res.json({ message: "เพิ่มลงตะกร้าแล้ว" });
  } catch (err) {
    res.status(500).json({ message: "เพิ่มตะกร้าล้มเหลว", error: err.message });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { cart_id } = req.params;
    await pool.query(
      `DELETE FROM purchase_cart WHERE cart_id = $1 AND user_id = $2`,
      [cart_id, userId]
    );
    res.json({ message: "ลบออกจากตะกร้าแล้ว" });
  } catch (err) {
    res.status(500).json({ message: "ลบตะกร้าล้มเหลว", error: err.message });
  }
};

exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.user_id;
    await pool.query(`DELETE FROM purchase_cart WHERE user_id = $1`, [userId]);
    res.json({ message: "ลบตะกร้าทั้งหมดแล้ว" });
  } catch (err) {
    res.status(500).json({ message: "เคลียร์ตะกร้าล้มเหลว", error: err.message });
  }
};

exports.checkoutCart = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.user_id;

    await client.query("BEGIN");

    // ✅ สร้าง PR header
    const prRes = await client.query(
      `INSERT INTO purchase_requests (requester_id, status, created_at)
       VALUES ($1, 'pending', NOW())
       RETURNING pr_id`,
      [userId]
    );

    const prId = prRes.rows[0].pr_id;

    // ✅ ดึง item ใน cart
    const { rows: cartItems } = await client.query(
      `SELECT item_id, qty, note FROM purchase_cart WHERE user_id = $1`,
      [userId]
    );

    for (const item of cartItems) {
      await client.query(
        `INSERT INTO purchase_request_items (pr_id, item_id, qty_requested, unit, note)
         VALUES ($1, $2, $3,
           (SELECT item_unit FROM items WHERE item_id = $2),
           $4)`,
        [prId, item.item_id, item.qty, item.note]
      );
    }

    // ✅ เคลียร์ cart
    await client.query(`DELETE FROM purchase_cart WHERE user_id = $1`, [userId]);

    await client.query("COMMIT");
    res.json({ message: "สร้าง PR จากตะกร้าเรียบร้อย", pr_id: prId });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "checkout ล้มเหลว", error: err.message });
  } finally {
    client.release();
  }
};
