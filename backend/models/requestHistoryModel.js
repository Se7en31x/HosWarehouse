const { pool } = require("../config/db");

// ✅ ดึงรายการคำขอทั้งหมด
exports.getAllRequests = async (userId = null, role = "user") => {
  let query = `
    SELECT 
      r.request_id,
      r.request_code,
      r.request_date,
      r.request_status,
      r.request_type,          
      r.is_urgent,             
      r.request_note,
      r.updated_at,
      u.firstname || ' ' || u.lastname AS requester_name,   -- ✅ fullname
      d.department_name_th AS department_name,              -- ✅ department
      COUNT(rd.request_detail_id) AS total_items,
      COALESCE(SUM(rd.requested_qty),0) AS total_requested,
      COALESCE(SUM(rd.approved_qty),0) AS total_approved
    FROM requests r
    JOIN "Admin".users u ON r.user_id = u.user_id
    LEFT JOIN "Admin".departments d ON r.department_id = d.department_id   -- ✅ join แผนก
    LEFT JOIN request_details rd ON r.request_id = rd.request_id
    WHERE r.is_deleted = false
  `;
  const params = [];

  if (role === "user" && userId) {
    query += ` AND r.user_id = $1`;
    params.push(userId);
  }

  query += `
    GROUP BY r.request_id, u.firstname, u.lastname, d.department_name_th
    ORDER BY r.request_date DESC
  `;

  const result = await pool.query(query, params);
  return result.rows;
};

// ✅ ดึงรายละเอียดคำขอ (header + details)
exports.getRequestById = async (requestId, userId = null, role = "user") => {
  let headerQuery = `
    SELECT 
      r.request_id,
      r.request_code,
      r.request_date,
      r.request_status,
      r.request_type,
      r.is_urgent,
      r.request_note,
      r.user_id,
      u.firstname || ' ' || u.lastname AS requester_name,   -- ✅ fullname
      d.department_name_th AS department_name,              -- ✅ department
      COUNT(rd.request_detail_id) AS total_items,
      COALESCE(SUM(rd.requested_qty),0) AS total_requested,
      COALESCE(SUM(rd.approved_qty),0) AS total_approved
    FROM requests r
    JOIN "Admin".users u ON r.user_id = u.user_id
    LEFT JOIN "Admin".departments d ON r.department_id = d.department_id   -- ✅ join แผนก
    LEFT JOIN request_details rd ON r.request_id = rd.request_id
    WHERE r.request_id = $1
      AND r.is_deleted = false
  `;

  const params = [requestId];
  if (role === "user" && userId) {
    headerQuery += ` AND r.user_id = $2`;
    params.push(userId);
  }

  headerQuery += ` GROUP BY r.request_id, u.firstname, u.lastname, d.department_name_th`;

  const headerRes = await pool.query(headerQuery, params);
  const header = headerRes.rows[0];
  if (!header) return null;

  const detailQuery = `
    SELECT
      rd.request_detail_id,
      i.item_name,
      i.item_unit,
      i.item_category,
      i.item_img,
      rd.requested_qty,
      rd.approved_qty,
      rd.approval_status,
      rd.processing_status,
      rd.expected_return_date,
      rd.request_detail_note,
      rd.request_detail_type,
      COALESCE(
        med.med_code, 
        ms.medsup_code, 
        eq.equip_code, 
        md.meddevice_code, 
        gen.gen_code
      ) AS item_code
    FROM request_details rd
    JOIN items i ON rd.item_id = i.item_id
    LEFT JOIN medicine_detail med ON i.item_id = med.item_id
    LEFT JOIN medsup_detail ms ON i.item_id = ms.item_id
    LEFT JOIN equipment_detail eq ON i.item_id = eq.item_id
    LEFT JOIN meddevices_detail md ON i.item_id = md.item_id
    LEFT JOIN generalsup_detail gen ON i.item_id = gen.item_id
    WHERE rd.request_id = $1
  `;
  const detailRes = await pool.query(detailQuery, [requestId]);

  return { header, details: detailRes.rows };
};
