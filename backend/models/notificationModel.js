const { pool } = require("../config/db");
const { getIO } = require("../ioInstance"); // ✅ ใช้ ioInstance ที่คุณมีอยู่

const NotificationModel = {
    async getByUser(userId) {
        const result = await pool.query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        return result.rows;
    },

    async markAsRead(notificationId) {
        const result = await pool.query(
            `UPDATE notifications SET is_read = true WHERE notification_id = $1 RETURNING *`,
            [notificationId]
        );
        return result.rows[0];
    },

    async markAllAsRead(userId) {
        await pool.query(
            `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
    },

    // ✅ ใช้ตอนยิงให้ user เฉพาะ
    async create(userId, title, message, category, relatedTable, relatedId) {
        const result = await pool.query(
            `INSERT INTO notifications 
       (user_id, title, message, category, related_table, related_id, created_at, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, NOW() AT TIME ZONE 'Asia/Bangkok', false) 
       RETURNING *`,
            [userId, title, message, category, relatedTable, relatedId]
        );

        const noti = result.rows[0];

        const io = getIO();
        io.to(`user_${userId}`).emit("newNotification", noti);

        return noti;
    },

    // ✅ ใช้ตอนยิงให้ทั้ง role (เช่น manager)
    async createForRole(role, title, message, category, relatedTable, relatedId) {
        // ดึง user ที่อยู่ใน role
        const users = await pool.query(
            `SELECT user_id FROM users WHERE user_role = $1`,
            [role]
        );

        const io = getIO();
        const inserted = [];

        for (const u of users.rows) {
            const result = await pool.query(
                `INSERT INTO notifications 
         (user_id, title, message, category, related_table, related_id, created_at, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() AT TIME ZONE 'Asia/Bangkok', false) 
         RETURNING *`,
                [u.user_id, title, message, category, relatedTable, relatedId]
            );

            const noti = result.rows[0];
            inserted.push(noti);

            // ส่ง socket เข้า room user
            io.to(`user_${u.user_id}`).emit("newNotification", noti);
        }

        // 👉 เผื่ออนาคต ถ้าอยากส่งห้องรวม role เช่น role_manager ก็ emit ได้
        io.to(`role_${role}`).emit("newNotificationBatch", inserted);

        return inserted;
    },

    async delete(notificationId) {
        const result = await pool.query(
            `DELETE FROM notifications WHERE notification_id = $1 RETURNING *`,
            [notificationId]
        );
        return result.rows[0]; // ✅ คืนค่าทั้ง object ของ notification ที่ถูกลบ
    },

    async clearByUser(userId) {
        await pool.query(
            `DELETE FROM notifications WHERE user_id = $1`,
            [userId]
        );
        return true;
    },

    async countUnread(userId) {
        const result = await pool.query(
            `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
        return parseInt(result.rows[0].count, 10);
    },

    async getByCategory(userId, category) {
        const result = await pool.query(
            `SELECT * FROM notifications 
       WHERE user_id = $1 AND category = $2 
       ORDER BY created_at DESC`,
            [userId, category]
        );
        return result.rows;
    }
};

module.exports = NotificationModel;
