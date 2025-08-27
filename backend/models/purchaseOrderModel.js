const { pool } = require("../config/db");
const { generateDocNo } = require("../utils/docCounter");

// ✅ ดึง PO ทั้งหมด (รวม items + files)
async function getAllPOs() {
  try {
    const { rows } = await pool.query(`
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
        po.supplier_name,
        po.supplier_address,
        po.supplier_phone,
        po.supplier_email,
        po.supplier_tax_id,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'po_item_id', poi.po_item_id,
              'item_id', poi.item_id,
              'item_name', i.item_name,  -- ✅ เพิ่ม: ดึงชื่อสินค้าจากตาราง items
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
              'file_path', pf.file_path,
              'file_url', pf.file_url,
              'uploaded_at', pf.uploaded_at
            )
          ) FILTER (WHERE pf.file_id IS NOT NULL), '[]'
        ) AS attachments
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
      LEFT JOIN items i ON poi.item_id = i.item_id  -- ✅ เพิ่ม: JOIN กับตาราง items
      LEFT JOIN po_files pf ON po.po_id = pf.po_id
      GROUP BY po.po_id
      ORDER BY po.created_at DESC
    `);
    return rows;
  } catch (err) {
    console.error("Error in getAllPOs:", err);
    throw new Error(`Failed to fetch POs: ${err.message}`);
  }
}

// ✅ ดึง PO ตาม id
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
        po.supplier_name,
        po.supplier_address,
        po.supplier_phone,
        po.supplier_email,
        po.supplier_tax_id,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'po_item_id', poi.po_item_id,
              'item_id', poi.item_id,
              'item_name', i.item_name,  -- ✅ เพิ่ม: ดึงชื่อสินค้าจากตาราง items
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
              'file_path', pf.file_path,
              'file_url', pf.file_url,
              'uploaded_at', pf.uploaded_at
            )
          ) FILTER (WHERE pf.file_id IS NOT NULL), '[]'
        ) AS attachments
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON po.po_id = poi.po_id
      LEFT JOIN items i ON poi.item_id = i.item_id  -- ✅ เพิ่ม: JOIN กับตาราง items
      LEFT JOIN po_files pf ON po.po_id = pf.po_id
      WHERE po.po_id = $1
      GROUP BY po.po_id
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
async function createPO({ supplier_name, supplier_address, supplier_phone, supplier_email, supplier_tax_id, items, notes, created_by }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const po_no = await generateDocNo(client, "purchase_order");

    const subtotal = items?.reduce((s, it) => s + (it.quantity * it.price), 0) || 0;
    const vat_amount = subtotal * 0.07;
    const grand_total = subtotal + vat_amount;

    const { rows } = await client.query(
      `INSERT INTO purchase_orders 
        (po_no, po_date, supplier_name, supplier_address, supplier_phone, supplier_email, supplier_tax_id, status, notes, subtotal, vat_amount, grand_total, is_vat_included, created_by, created_at)
        VALUES ($1, NOW(), $2,$3,$4,$5,$6,'รอดำเนินการ',$7,$8,$9,$10,false,$11,NOW())
        RETURNING po_id`,
      [po_no, supplier_name, supplier_address, supplier_phone, supplier_email, supplier_tax_id, notes, subtotal, vat_amount, grand_total, created_by]
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
async function updatePO(id, { items, attachments, notes, status }) { // ✅ แก้ไข: เพิ่ม attachments กลับเข้ามาใน parameter
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const subtotal = items?.reduce((s, it) => s + (it.quantity * it.price), 0) || 0;
    const vat_amount = subtotal * 0.07;
    const grand_total = subtotal + vat_amount;

    await client.query(
      `UPDATE purchase_orders 
        SET subtotal = $1, vat_amount = $2, grand_total = $3, notes = $4, status = $5, updated_at = NOW()
        WHERE po_id = $6`,
      [subtotal, vat_amount, grand_total, notes, status || "รอดำเนินการ", id]
    );

    await client.query(`DELETE FROM purchase_order_items WHERE po_id = $1`, [id]);
    for (const item of items || []) {
      await client.query(
        `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit, price, note)
          VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, item.item_id, item.quantity, item.unit, item.price, item.note || ""]
      );
    }

    // ✅ ส่วนนี้คือโค้ดจัดการไฟล์ที่คุณต้องการและเคยมีอยู่ในโค้ดเดิม
    await client.query(`DELETE FROM po_files WHERE po_id = $1`, [id]);
    for (const file of attachments || []) {
      await client.query(
        `INSERT INTO po_files (po_id, file_name, file_type, file_path, file_url, uploaded_by, uploaded_at)
          VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [
          id,
          file.name,
          file.type,
          `/uploads/po/${file.name}`,
          `http://localhost:5000/uploads/po/${file.name}`,
          file.uploaded_by || 1
        ]
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
  supplier_name,
  supplier_address,
  supplier_phone,
  supplier_email,
  supplier_tax_id,
  created_by,
  notes,
  items,
  attachments
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const po_no = await generateDocNo(client, "purchase_order");

    const subtotal = items?.reduce((s, it) => s + (it.qty * it.price), 0) || 0;
    const vat_amount = subtotal * 0.07;
    const grand_total = subtotal + vat_amount;

    const { rows } = await client.query(
      `INSERT INTO purchase_orders 
        (po_no, po_date, rfq_id, supplier_name, supplier_address, supplier_phone, supplier_email, supplier_tax_id, status, notes, subtotal, vat_amount, grand_total, is_vat_included, created_by, created_at) 
        VALUES ($1, NOW(), $2,$3,$4,$5,$6,$7,'รอดำเนินการ',$8,$9,$10,$11,false,$12,NOW())
        RETURNING po_id`,
      [po_no, rfq_id, supplier_name, supplier_address, supplier_phone, supplier_email, supplier_tax_id, notes || "", subtotal, vat_amount, grand_total, created_by]
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
        if (itemRows[0]) itemId = itemRows[0].item_id;
      }

      if (!itemId) throw new Error(`ไม่พบ item_id สำหรับ rfq_item_id ${item.rfq_item_id}`);

      await client.query(
        `INSERT INTO purchase_order_items (po_id, item_id, quantity, unit, price, note)
          VALUES ($1,$2,$3,$4,$5,$6)`,
        [po_id, itemId, item.qty, item.unit, item.price, item.note || ""]
      );
    }

    // ✅ เพิ่มโค้ดส่วนนี้เพื่ออัปเดตสถานะของ RFQ
    await client.query(
      `UPDATE request_for_quotations
       SET status = 'สร้าง PO แล้ว'
       WHERE rfq_id = $1`,
      [rfq_id]
    );

    for (const file of attachments || []) {
      await client.query(
        `INSERT INTO po_files (po_id, file_name, file_type, file_path, file_url, uploaded_by, uploaded_at)
          VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [
          po_id,
          file.name,
          file.type,
          `/uploads/po/${file.name}`,
          `http://localhost:5000/uploads/po/${file.name}`,
          created_by
        ]
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

async function addPOFiles(po_id, files, uploaded_by = 1) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // ✅ ใช้ await Promise.all เพื่อเพิ่มไฟล์ทั้งหมดพร้อมกัน
    const insertPromises = files.map(f =>
      client.query(
        `INSERT INTO po_files (po_id, file_name, file_type, file_path, file_url, uploaded_by, uploaded_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [po_id, f.file_name, f.file_type, f.file_path, f.file_url, uploaded_by]
      )
    );
    await Promise.all(insertPromises);

    await client.query("COMMIT");
    // ✅ ส่งข้อมูล PO ที่มีไฟล์แนบอัปเดตแล้วกลับไป
    return await getPOById(po_id);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in addPOFiles:", err); // ✅ เพิ่ม log เพื่อดูข้อผิดพลาด
    throw new Error(`Failed to add PO files: ${err.message}`);
  } finally {
    client.release();
  }
}

async function updatePOFiles(po_id, newFiles, existingFileIdsToKeep) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. ลบไฟล์ที่ไม่ได้อยู่ในรายการ "ไฟล์ที่ต้องเก็บไว้"
    if (existingFileIdsToKeep && existingFileIdsToKeep.length > 0) {
      // ลบไฟล์ที่ไม่ตรงกับ file_id ที่ส่งมาจาก frontend
      await client.query(
        `DELETE FROM po_files WHERE po_id = $1 AND file_id NOT IN (${existingFileIdsToKeep.join(',')})`,
        [po_id]
      );
    } else {
      // ถ้าไม่มีไฟล์เก่าให้เก็บไว้เลย ให้ลบทั้งหมด
      await client.query(`DELETE FROM po_files WHERE po_id = $1`, [po_id]);
    }

    // 2. เพิ่มไฟล์ใหม่
    for (const f of newFiles) {
      await client.query(
        `INSERT INTO po_files (po_id, file_name, file_type, file_path, file_url, uploaded_by, uploaded_at)
        VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [po_id, f.file_name, f.file_type, f.file_path, f.file_url, 1] // uploaded_by อาจมาจาก req.user.id
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


module.exports = { getAllPOs, getPOById, createPO, updatePO, createPOFromRFQ ,addPOFiles ,updatePOFiles} ;