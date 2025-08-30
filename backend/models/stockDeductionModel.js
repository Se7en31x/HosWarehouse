const { pool } = require("../config/db");
const { getIO } = require("../socket");
const { generateStockoutCode } = require("../utils/stockoutCounter");
const inventoryModel = require('./inventoryModel'); // ยังจำเป็นต้องใช้เพื่อดึงข้อมูลล่าสุด

/* ====================== Queries หลัก ====================== */
async function getApprovedRequestsForDeduction() {
  try {
    const query = `
            SELECT
                r.request_id,
                r.request_code,
                r.request_date,
                u.user_fname || ' ' || u.user_lname AS requester,
                u.department AS department,
                r.request_type AS type,
                r.request_status AS status,
                COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved') AS total_approved_count,
                COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved' AND rd.processing_status = 'pending')      AS pending_count,
                COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved' AND rd.processing_status = 'preparing')   AS preparing_count,
                COUNT(rd.request_detail_id) FILTER (WHERE rd.approval_status = 'approved' AND rd.processing_status = 'delivering') AS delivering_count
            FROM requests r
            JOIN users u ON r.user_id = u.user_id
            JOIN request_details rd ON r.request_id = rd.request_id
            WHERE rd.approval_status = 'approved'
            GROUP BY
                r.request_id, r.request_code, r.request_date,
                u.user_fname, u.user_lname, u.department,
                r.request_type, r.request_status
            ORDER BY r.request_date DESC;
        `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error("Error fetching requests ready for processing (Model):", error);
    throw new Error("Failed to retrieve requests ready for processing.");
  }
}

async function getRequestDetailsForProcessing(requestId) {
  try {
    const requestQuery = `
            SELECT
                r.request_id,
                r.request_code,
                r.request_date,
                u.user_fname || ' ' || u.user_lname AS user_name,
                u.department AS department_name,
                r.request_type,
                r.request_status,
                r.updated_at,
                r.request_note
            FROM requests r
            JOIN users u ON r.user_id = u.user_id
            WHERE r.request_id = $1;
        `;
    const { rows: requestRows } = await pool.query(requestQuery, [requestId]);
    if (requestRows.length === 0) return null;
    const request = requestRows[0];

    const itemsQuery = `
            SELECT
                rd.request_detail_id,
                rd.item_id,
                i.item_name,
                i.item_unit,
                rd.requested_qty,
                rd.approved_qty,
                rd.approval_status,
                rd.processing_status,
                rd.request_detail_note,
                rd.updated_at AS detail_updated_at,
                COALESCE(SUM(il.qty_remaining), 0) AS current_stock_qty
            FROM request_details rd
            JOIN items i ON rd.item_id = i.item_id
            LEFT JOIN item_lots il ON rd.item_id = il.item_id
            WHERE rd.request_id = $1
            GROUP BY rd.request_detail_id, rd.item_id, i.item_name, i.item_unit,
                rd.requested_qty, rd.approved_qty, rd.approval_status,
                rd.processing_status, rd.request_detail_note, rd.updated_at
            ORDER BY rd.request_detail_id ASC;
        `;
    const { rows: itemRows } = await pool.query(itemsQuery, [requestId]);

    request.details = itemRows;
    return request;
  } catch (error) {
    console.error(`Error fetching details for request ${requestId}:`, error);
    throw new Error("Failed to retrieve request details for processing.");
  }
}

/* ====================== ตัดสต็อก ====================== */
async function deductStock(requestId, updates, userId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const stockoutNo = await generateStockoutCode(client);

    const { rows: reqRows } = await client.query(
      `SELECT request_type FROM requests WHERE request_id = $1`,
      [requestId]
    );
    if (reqRows.length === 0) throw new Error(`Request ${requestId} not found`);
    const requestType = reqRows[0].request_type;
    let stockoutType = "withdraw";
    if (requestType === "borrow") stockoutType = "borrow";

    const { rows: stockoutRows } = await client.query(
      `INSERT INTO stock_outs (stockout_no, stockout_date, stockout_type, note, user_id, created_at)
            VALUES ($1, NOW()::timestamp, $2, $3, $4, NOW()::timestamp)
            RETURNING stockout_id`,
      [stockoutNo, stockoutType, `request#${requestId}`, userId]
    );
    const stockoutId = stockoutRows[0].stockout_id;

    for (const update of updates) {
      const {
        request_detail_id,
        newStatus,
        current_approval_status,
        current_processing_status,
        item_id,
        requested_qty,
        deduction_reason,
      } = update;

      if (current_approval_status !== "approved") {
        throw new Error(
          `Item ${request_detail_id} (item ${item_id}) approval_status='${current_approval_status}'`
        );
      }

      if (newStatus === "preparing" && current_processing_status === "pending") {
        let remainingToDeduct = requested_qty;

        const { rows: unitRows } = await client.query(
          `SELECT item_unit FROM items WHERE item_id = $1`,
          [item_id]
        );
        const itemUnit = unitRows[0]?.item_unit || "ชิ้น";

        const { rows: lots } = await client.query(
          `SELECT lot_id, qty_remaining, exp_date
                    FROM item_lots
                    WHERE item_id = $1 AND qty_remaining > 0
                    ORDER BY exp_date ASC
                    FOR UPDATE`,
          [item_id]
        );

        for (const lot of lots) {
          if (remainingToDeduct <= 0) break;

          const deductQty = Math.min(remainingToDeduct, lot.qty_remaining);

          const newLotBalance = lot.qty_remaining - deductQty;

          // 1. UPDATE ยอดคงเหลือใน lot
          await client.query(
            `UPDATE item_lots
                        SET qty_remaining = $1,
                            updated_at = NOW()::timestamp
                        WHERE lot_id = $2`,
            [newLotBalance, lot.lot_id]
          );

          // 3. INSERT รายละเอียดการเบิกจ่ายลงใน stock_out_details
          await client.query(
            `INSERT INTO stock_out_details (stockout_id, item_id, lot_id, qty, unit, note)
                        VALUES ($1, $2, $3, $4, $5, $6)`,
            [stockoutId, item_id, lot.lot_id, deductQty, itemUnit, `detail:${stockoutType}`]
          );

          // 4. INSERT ข้อมูลการยืม หากเป็น request_type = 'borrow'
          if (requestType === 'borrow') {
            await client.query(
              `INSERT INTO borrow_detail_lots
                            (request_detail_id, lot_id, qty)
                            VALUES ($1, $2, $3)`,
              [request_detail_id, lot.lot_id, deductQty]
            );
          }

          remainingToDeduct -= deductQty;
        }

        if (remainingToDeduct > 0) {
          throw new Error(
            `Insufficient stock for item ${item_id}. Need ${requested_qty}, deducted only ${requested_qty - remainingToDeduct
            }`
          );
        }
      }

      // อัปเดตสถานะใน request_details
      await client.query(
        `INSERT INTO request_status_history
                    (request_id, request_detail_id, changed_by, changed_at,
                    history_type, old_value_type, old_value, new_value, note)
                VALUES
                    ($1, $2, $3, NOW(),
                    'processing_status_change', 'processing_status', $4, $5,
                    $6)`,
        [
          requestId,
          request_detail_id,
          userId,
          current_processing_status,
          newStatus,
          `เปลี่ยนสถานะจาก '${current_processing_status || "ไม่ระบุ"}' → '${newStatus}'.`,
        ]
      );

      const resUpd = await client.query(
        `UPDATE request_details
                    SET processing_status = $1,
                        updated_at = NOW()::timestamp
                WHERE request_detail_id = $2
                    AND approval_status = 'approved'
                    AND processing_status IS NOT DISTINCT FROM $3`,
        [newStatus, request_detail_id, current_processing_status]
      );
      if (resUpd.rowCount === 0) {
        throw new Error(
          `Failed to update processing status for detail ${request_detail_id}.`
        );
      }

      if (deduction_reason && deduction_reason.trim() !== "") {
        const reasonNote = `\n[${new Date().toLocaleString(
          "th-TH"
        )}] เหตุผลเบิกไม่ครบ: ${deduction_reason}`;
        await client.query(
          `UPDATE request_details
                        SET request_detail_note = COALESCE(request_detail_note, '') || $1
                    WHERE request_detail_id = $2`,
          [reasonNote, request_detail_id]
        );
      }
    }

    await client.query("COMMIT");

    // Broadcast การอัปเดตไปยัง Client ทุกตัว
    const io = getIO();
    if (io) {
      const updatedItemsForStaff = await inventoryModel.getAllItemsForWithdrawal();
      io.emit("itemsDataForWithdrawal", updatedItemsForStaff);

      const updatedItemsDetailed = await inventoryModel.getAllItemsDetailed();
      io.emit("itemsData", updatedItemsDetailed);

      for (const update of updates) {
        const updatedItem = await inventoryModel.getItemById(update.item_id);
        if (updatedItem) {
          io.emit("itemUpdated", {
            item_id: updatedItem.item_id,
            item_name: updatedItem.item_name,
            item_unit: updatedItem.item_unit,
            item_img: updatedItem.item_img,
            current_stock: updatedItem.total_on_hand_qty,
          });
        }
      }
    }

    return {
      success: true,
      message: `Stock deducted for request ${requestId}`,
      stockout_no: stockoutNo,
      stockout_type: stockoutType,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (e) { }
    console.error("Error during stock deduction transaction:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* ====================== Exports ====================== */
module.exports = {
  getApprovedRequestsForDeduction,
  getRequestDetailsForProcessing,
  deductStock,
};