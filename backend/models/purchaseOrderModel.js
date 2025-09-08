const { pool } = require("../config/db");
const { generateDocNo } = require("../utils/docCounter");

// ✅ ดึง PO ทั้งหมด (รวม items + files)
async function getAllPOs(status) {
  try {
    let query = `
      SELECT 
        po.po_id,
        po.po_no,
        po.po_date,
        po.status AS po_status,
        po.subtotal,
        po.vat_amount,
        po.grand_total,
        po.is_vat_included,
        po.notes,
        po.created_at,
        po.updated_at,
        s.supplier_id,
        s.supplier_name,
        s.supplier_contact_name,
        s.supplier_phone,
        s.supplier_email,
        s.supplier_address,
        s.supplier_tax_id,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'po_item_id', poi.po_item_id,
              'item_id', poi.item_id,
              'item_name', i.item_name,
              'item_category', i.item_category,
              'quantity', poi.quantity,
              'unit', poi.unit,
              'price', poi.price,
              'total', poi.total,
              'note', poi.note
            )
          ) FILTER (WHERE poi.po_item_id IS NOT NULL), '[]'
        ) AS items,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'file_id', pf.file_id,
              'file_name', pf.file_name,
              'file_type', pf.file_type,
              'file_category', pf.file_category, -- ✅ เพิ่มตรงนี้
              'file_path', pf.file_path,
              'file_url', pf.file_url,
              'uploaded_at', pf.uploaded_at
            )
          ) FILTER (WHERE pf.file_id IS NOT NULL), '[]'
        ) AS attachments
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
      LEFT JOIN items i ON poi.item_id = i.item_id
      LEFT JOIN po_files pf ON po.po_id = pf.po_id
      GROUP BY po.po_id, s.supplier_id
      ORDER BY po.created_at DESC
    `;

    if (status) {
      query = `SELECT * FROM (${query}) sub WHERE sub.po_status = $1`;
      const { rows } = await pool.query(query, [status]);
      return rows;
    } else {
      const { rows } = await pool.query(query);
      return rows;
    }
  } catch (err) {
    console.error("Error in getAllPOs:", err);
    throw new Error(`Failed to fetch POs: ${err.message}`);
  }
}

// ✅ ดึง PO ตาม id (รวม items + files)
async function getPOById(id) {
  try {
    const { rows } = await pool.query(
      `
      SELECT 
        po.po_id,
        po.po_no,
        po.po_date,
        po.status AS po_status,
        po.subtotal,
        po.vat_amount,
        po.grand_total,
        po.is_vat_included,
        po.notes,
        po.created_at,
        po.updated_at,
        s.supplier_id,
        s.supplier_name,
        s.supplier_contact_name,
        s.supplier_phone,
        s.supplier_email,
        s.supplier_address,
        s.supplier_tax_id,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'po_item_id', poi.po_item_id,
              'item_id', poi.item_id,
              'item_name', i.item_name,
              'item_category', i.item_category,
              'quantity', poi.quantity,
              'unit', poi.unit,
              'price', poi.price,
              'total', poi.total,
              'note', poi.note
            )
          ) FILTER (WHERE poi.po_item_id IS NOT NULL), '[]'
        ) AS items,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'file_id', pf.file_id,
              'file_name', pf.file_name,
              'file_type', pf.file_type,
              'file_category', pf.file_category, -- ✅ เพิ่มตรงนี้
              'file_path', pf.file_path,
              'file_url', pf.file_url,
              'uploaded_at', pf.uploaded_at
            )
          ) FILTER (WHERE pf.file_id IS NOT NULL), '[]'
        ) AS attachments
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.supplier_id
      LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
      LEFT JOIN items i ON poi.item_id = i.item_id
      LEFT JOIN po_files pf ON po.po_id = pf.po_id
      WHERE po.po_id = $1
      GROUP BY po.po_id, s.supplier_id
      `,
      [id]
    );
    if (!rows[0]) throw new Error(`PO with id ${id} not found`);
    return rows[0];
  } catch (err) {
    console.error("Error in getPOById:", err);
    throw new Error(`Failed to fetch PO ${id}: ${err.message}`);
  }
}

// ✅ สร้าง PO ใหม่
async function createPO({ supplier_id, items, notes, created_by }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const po_no = await generateDocNo(client, "purchase_order");

    const subtotal = items?.reduce((s, it) => s + it.quantity * it.price, 0) || 0;
    const vat_amount = subtotal * 0.07;
    const grand_total = subtotal + vat_amount;

    const { rows } = await client.query(
      `INSERT INTO purchase_orders 
        (po_no, po_date, supplier_id, status, notes, subtotal, vat_amount, grand_total, is_vat_included, created_by, created_at)
        VALUES ($1, NOW(), $2,'รอดำเนินการ',$3,$4,$5,$6,false,$7,NOW())
        RETURNING po_id`,
      [po_no, supplier_id, notes, subtotal, vat_amount, grand_total, created_by]
    );

    const po_id = rows[0].po_id;

    for (const item of items || []) {
      await client.query(
        `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit, price, note)
          VALUES ($1,$2,$3,$4,$5,$6)`,
        [po_id, item.item_id, item.quantity, item.unit, item.price, item.note || ""]
      );
    }

    await client.query("COMMIT");
    return await getPOById(po_id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(`Failed to create PO: ${err.message}`);
  } finally {
    client.release();
  }
}

// ✅ อัปเดต PO
async function updatePO(id, { items, notes, status }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const subtotal = items?.reduce((s, it) => s + it.quantity * it.price, 0) || 0;
    const vat_amount = subtotal * 0.07;
    const grand_total = subtotal + vat_amount;

    if (status !== undefined) {
      await client.query(
        `UPDATE purchase_orders 
          SET subtotal=$1, vat_amount=$2, grand_total=$3, notes=$4, status=$5, updated_at=NOW()
          WHERE po_id=$6`,
        [subtotal, vat_amount, grand_total, notes, status, id]
      );
    } else {
      await client.query(
        `UPDATE purchase_orders 
          SET subtotal=$1, vat_amount=$2, grand_total=$3, notes=$4, updated_at=NOW()
          WHERE po_id=$5`,
        [subtotal, vat_amount, grand_total, notes, id]
      );
    }

    await client.query(`DELETE FROM purchase_order_items WHERE po_id=$1`, [id]);
    for (const item of items || []) {
      await client.query(
        `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit, price, note)
          VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, item.item_id, item.quantity, item.unit, item.price, item.note || ""]
      );
    }

    await client.query("COMMIT");
    return await getPOById(id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw new Error(`Failed to update PO ${id}: ${err.message}`);
  } finally {
    client.release();
  }
}

// ✅ สร้าง PO จาก RFQ
async function createPOFromRFQ({
  rfq_id,
  supplier_id,
  created_by,
  notes,
  items,
  subtotal,
  vat_amount,
  grand_total,
  is_vat_included
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const po_no = await generateDocNo(client, "purchase_order");

    const { rows } = await client.query(
      `INSERT INTO purchase_orders 
        (po_no, po_date, rfq_id, supplier_id, status, notes, subtotal, vat_amount, grand_total, is_vat_included, created_by, created_at) 
        VALUES ($1, NOW(), $2, $3, 'รอดำเนินการ', $4, $5, $6, $7, $8, $9, NOW())
        RETURNING po_id`,
      [po_no, rfq_id, supplier_id, notes || "", subtotal, vat_amount, grand_total, is_vat_included, created_by]
    );

    const po_id = rows[0].po_id;

    for (const item of items || []) {
      let itemId = item.item_id;

      if (!itemId) {
        const { rows: itemRows } = await client.query(
          `SELECT pri.item_id
           FROM rfq_items ri
           JOIN purchase_request_items pri ON ri.pr_item_id = pri.pr_item_id
           WHERE ri.rfq_item_id = $1`,
          [item.rfq_item_id]
        );
        if (itemRows[0]) {
          itemId = itemRows[0].item_id;
        }
      }

      if (!itemId) {
        throw new Error(`ไม่พบ item_id สำหรับ rfq_item_id ${item.rfq_item_id}`);
      }

      await client.query(
        `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit, price, note)
          VALUES ($1, $2, $3, $4, $5, $6)`,
        [po_id, itemId, item.qty, item.unit, item.price, item.note || ""]
      );
    }

    await client.query("COMMIT");
    return await getPOById(po_id);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in createPOFromRFQ:", err);
    throw new Error(`Failed to create PO from RFQ: ${err.message}`);
  } finally {
    client.release();
  }
}

// ✅ เพิ่มไฟล์แนบเข้า PO
async function addPOFiles(po_id, files, uploaded_by = 1) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertPromises = files.map((f) => {
      const normalizedPath = f.file_path.replace(/\\/g, "/");
      return client.query(
        `INSERT INTO po_files 
         (po_id, file_name, file_type, file_category, file_path, file_url, uploaded_by, uploaded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [po_id, f.file_name, f.file_type, f.file_category, normalizedPath, f.file_url.replace(/\\/g, "/"), uploaded_by]
      );
    });
    await Promise.all(insertPromises);

    await client.query("COMMIT");
    return await getPOById(po_id);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in addPOFiles:", err);
    throw new Error(`Failed to add PO files: ${err.message}`);
  } finally {
    client.release();
  }
}


// ✅ อัปเดตไฟล์แนบของ PO
async function updatePOFiles(po_id, newFiles, existingFileIdsToKeep = [], uploaded_by = 1) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (existingFileIdsToKeep.length > 0) {
      const placeholders = existingFileIdsToKeep.map((_, i) => `$${i + 2}`).join(",");
      await client.query(
        `DELETE FROM po_files WHERE po_id = $1 AND file_id NOT IN (${placeholders})`,
        [po_id, ...existingFileIdsToKeep]
      );
    } else {
      await client.query(`DELETE FROM po_files WHERE po_id = $1`, [po_id]);
    }

    for (const f of newFiles) {
      const normalizedPath = f.file_path.replace(/\\/g, "/");
      await client.query(
        `INSERT INTO po_files 
         (po_id, file_name, file_type, file_category, file_path, file_url, uploaded_by, uploaded_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [po_id, f.file_name, f.file_type, f.file_category, normalizedPath, f.file_url.replace(/\\/g, "/"), uploaded_by]
      );
    }

    await client.query("COMMIT");
    return await getPOById(po_id);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating PO files:", err);
    throw new Error(`Failed to update PO files: ${err.message}`);
  } finally {
    client.release();
  }
}

// ✅ Mark ว่าใช้ใน GR แล้ว
async function markPOAsUsed(po_id) {
  try {
    await pool.query(
      `UPDATE purchase_orders 
       SET updated_at = NOW() 
       WHERE po_id = $1`,
      [po_id]
    );
    return { message: `PO ${po_id} ถูกทำเครื่องหมายว่าใช้แล้ว` };
  } catch (err) {
    console.error("Error in markPOAsUsed:", err);
    throw new Error(`Failed to mark PO as used: ${err.message}`);
  }
}

  module.exports = {
    getAllPOs,
    getPOById,
    createPO,
    updatePO,
    createPOFromRFQ,
    addPOFiles,
    updatePOFiles,
    markPOAsUsed,
  };
