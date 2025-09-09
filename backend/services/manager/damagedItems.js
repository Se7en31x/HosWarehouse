const { pool } = require("../../config/db");
const Notification = require("../../models/notificationModel");
const { getIO } = require("../../socket");

// -----------------------------
// Helper: format ข้อความ
// -----------------------------
function formatDamagedMessage(item, type = "new") {
  const reportDate = new Date(item.damaged_date).toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
  });

  if (type === "new") {
    return (
      `พัสดุ: ${item.item_name}\n` +
      `จำนวนที่รายงานชำรุด: ${item.damaged_qty} ${item.item_unit}\n` +
      `วันที่รายงาน: ${reportDate}`
    );
  }

  if (type === "remaining") {
    return (
      `พัสดุ: ${item.item_name}\n` +
      `คงเหลือที่ยังไม่ได้ดำเนินการ: ${item.remaining_qty} ${item.item_unit}\n` +
      `จำนวนที่รายงานชำรุดทั้งหมด: ${item.damaged_qty} ${item.item_unit}\n` +
      `วันที่รายงาน: ${reportDate}`
    );
  }

  return "";
}

// -----------------------------
// 1) ฟังก์ชันรายงานพัสดุชำรุด (API)
// -----------------------------
async function reportDamaged(req, res) {
  try {
    const { item_id, damaged_qty, damaged_note, reported_by } = req.body;

    const result = await pool.query(
      `INSERT INTO damaged_items 
         (item_id, damaged_qty, repaired_qty, disposed_qty, damaged_date, damaged_note, reported_by)
       VALUES ($1, $2, 0, 0, NOW(), $3, $4) 
       RETURNING *`,
      [item_id, damaged_qty, damaged_note, reported_by]
    );
    const damaged = result.rows[0];

    const { rows: itemRows } = await pool.query(
      `SELECT item_name, item_unit FROM items WHERE item_id=$1`,
      [item_id]
    );
    const itemInfo = itemRows[0];

    const message = formatDamagedMessage({ ...damaged, ...itemInfo }, "new");

    // ✅ ดึง warehouse_manager
    const { rows: managers } = await pool.query(`
      SELECT user_id FROM "Admin".users
      WHERE role = 'warehouse_manager' AND is_active = true
    `);

    const io = getIO();
    const notiResults = [];

    for (const manager of managers) {
      const noti = await Notification.create(
        manager.user_id,
        "มีการรายงานพัสดุชำรุดใหม่",
        message,
        "inventory",
        "damaged_items",
        damaged.damaged_id
      );

      io.to(`user_${manager.user_id}`).emit("newNotification", noti);
      notiResults.push(noti);
    }

    res.status(201).json({ damaged, notifications: notiResults });
  } catch (err) {
    console.error("❌ Error reportDamaged:", err.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
}

// -----------------------------
// 2) ฟังก์ชันตรวจสอบพัสดุชำรุดอัตโนมัติ (cron job)
// -----------------------------
async function checkDamagedItems() {
  try {
    const RULE_DAMAGED = 4;

    const { rows: managers } = await pool.query(`
      SELECT user_id FROM "Admin".users
      WHERE role = 'warehouse_manager' AND is_active = true
    `);

    if (managers.length === 0) {
      console.warn("⚠️ No active warehouse_manager found");
      return;
    }

    const io = getIO();

    const { rows } = await pool.query(`
      SELECT d.damaged_id, d.item_id, d.damaged_qty, d.repaired_qty, d.disposed_qty, 
             d.damaged_date, d.damaged_note,
             i.item_name, i.item_unit,
             (COALESCE(d.damaged_qty,0) - (COALESCE(d.repaired_qty,0) + COALESCE(d.disposed_qty,0))) AS remaining_qty
      FROM damaged_items d
      JOIN items i ON i.item_id = d.item_id
    `);

    for (const dmg of rows) {
      try {
        const remaining = Number(dmg.remaining_qty);

        const { rows: logRes } = await pool.query(
          `SELECT 1 FROM notification_log 
           WHERE rule_id = $1 AND related_table = 'damaged_items' AND related_id = $2`,
          [RULE_DAMAGED, dmg.damaged_id]
        );
        const hasLog = logRes.length > 0;

        if (remaining > 0) {
          if (!hasLog) {
            const message = formatDamagedMessage(dmg, "remaining");

            for (const manager of managers) {
              const noti = await Notification.create(
                manager.user_id,
                "พบพัสดุชำรุดที่ยังไม่ดำเนินการ",
                message,
                "inventory",
                "damaged_items",
                dmg.damaged_id
              );

              io.to(`user_${manager.user_id}`).emit("newNotification", noti);
            }

            await pool.query(
              `INSERT INTO notification_log (rule_id, related_table, related_id, sent_at)
               VALUES ($1, 'damaged_items', $2, NOW())`,
              [RULE_DAMAGED, dmg.damaged_id]
            );
          } else {
          }
        } else {
          if (hasLog) {
            await pool.query(
              `DELETE FROM notification_log 
               WHERE rule_id = $1 AND related_table = 'damaged_items' AND related_id = $2`,
              [RULE_DAMAGED, dmg.damaged_id]
            );
          }
        }
      } catch (err) {
        console.error(`❌ Error processing damaged_id=${dmg.damaged_id}:`, err.message);
      }
    }

  } catch (err) {
    console.error("❌ Error in checkDamagedItems:", err.message);
  }
}

module.exports = { reportDamaged, checkDamagedItems };
