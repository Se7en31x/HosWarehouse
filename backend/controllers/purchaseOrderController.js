const purchaseOrderModel = require("../models/purchaseOrderModel");
const supabase = require("../supabase");
const sanitize = require("sanitize-filename");

// ตรวจสอบ environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not defined in environment variables");
}

// รายการหมวดหมู่ที่ถูกต้อง
const validCategories = [
  "quotation",
  "delivery_note",
  "tax_invoice",
  "invoice",
  "payment_proof",
  "receipt",
  "contract",
  "other",
];

// ฟังก์ชันทำความสะอาดชื่อไฟล์
const cleanFileName = (fileName) => {
  try {
    // ใช้ sanitize-filename เพื่อลบอักขระที่ไม่ปลอดภัย
    let safeFileName = sanitize(fileName);
    
    // ถ้าชื่อไฟล์มีอักขระนอก ASCII ให้ใช้ fallback เป็น ASCII
    if (/[^\x00-\x7F]/.test(safeFileName)) {
      console.warn(`Non-ASCII characters detected in filename: ${safeFileName}, using fallback`);
      const extension = fileName.match(/\.[^/.]+$/)?.[0] || ".pdf";
      safeFileName = `file_${Date.now()}${extension}`;
    } else {
      // เข้ารหัสชื่อไฟล์ด้วย encodeURIComponent
      safeFileName = encodeURIComponent(safeFileName);
      safeFileName = safeFileName.replace(/%20/g, "_");
      const extension = fileName.match(/\.[^/.]+$/)?.[0] || ".pdf";
      const encodedExtension = encodeURIComponent(extension);
      safeFileName = safeFileName.endsWith(encodedExtension) ? safeFileName : `${safeFileName}${encodedExtension}`;
    }
    
    return safeFileName;
  } catch (err) {
    console.error("Error cleaning filename:", err);
    // Fallback: ใช้ timestamp และนามสกุล ASCII
    return `file_${Date.now()}.pdf`;
  }
};

// ✅ GET /po
exports.getAllPOs = async (req, res) => {
  try {
    const { status } = req.query;
    const pos = await purchaseOrderModel.getAllPOs(status);
    res.json(pos);
  } catch (err) {
    console.error("❌ getAllPOs error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ GET /po/:id
exports.getPOById = async (req, res) => {
  try {
    const po = await purchaseOrderModel.getPOById(req.params.id);
    if (!po) return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });
    res.json(po);
  } catch (err) {
    console.error("❌ getPOById error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ POST /po
exports.createPO = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const newPO = await purchaseOrderModel.createPO({
      ...req.body,
      created_by: userId,
    });
    res.status(201).json(newPO);
  } catch (err) {
    console.error("❌ createPO error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ PUT /po/:id
exports.updatePO = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const updatedPO = await purchaseOrderModel.updatePO(req.params.id, {
      ...req.body,
      updated_by: userId,
    });
    res.json(updatedPO);
  } catch (err) {
    console.error("❌ updatePO error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ POST /po/from-rfq
exports.createPOFromRFQ = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const newPO = await purchaseOrderModel.createPOFromRFQ({
      ...req.body,
      created_by: userId,
    });
    res.status(201).json(newPO);
  } catch (err) {
    console.error("❌ createPOFromRFQ error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ Upload Attachments
exports.uploadPOFiles = async (req, res) => {
  try {
    const po_id = req.params.id;
    const userId = req.user?.id || null;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "กรุณาเลือกไฟล์อัปโหลด" });
    }

    console.log("Full req.body:", req.body);

    const categories = req.body["categories[]"] || req.body.categories
      ? Array.isArray(req.body["categories[]"] || req.body.categories)
        ? (req.body["categories[]"] || req.body.categories).map((cat) => cat?.trim().toLowerCase())
        : [(req.body["categories[]"] || req.body.categories)?.trim().toLowerCase()]
      : new Array(req.files.length).fill("other");

    const originalNames = req.body["originalNames[]"] || req.body.originalNames
      ? Array.isArray(req.body["originalNames[]"] || req.body.originalNames)
        ? (req.body["originalNames[]"] || req.body.originalNames)
        : [(req.body["originalNames[]"] || req.body.originalNames)]
      : new Array(req.files.length).fill(null);

    console.log("Received files:", req.files.map((f) => f.originalname));
    console.log("Received categories (raw):", req.body["categories[]"] || req.body.categories);
    console.log("Received original names (raw):", req.body["originalNames[]"] || req.body.originalNames);
    console.log("Processed categories:", categories);
    console.log("Processed original names:", originalNames);
    console.log("Number of files:", req.files.length);
    console.log("Number of categories:", categories.length);
    console.log("Number of original names:", originalNames.length);

    if (req.files.length !== categories.length || req.files.length !== originalNames.length) {
      console.error(`Mismatch: ${req.files.length} files, ${categories.length} categories, ${originalNames.length} original names`);
      return res.status(400).json({ message: "จำนวนไฟล์, หมวดหมู่, หรือชื่อไฟล์ไม่ตรงกัน" });
    }

    const files = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const originalFileName = originalNames[i] || Buffer.from(file.originalname, "latin1").toString("utf8");
      const safeFileName = cleanFileName(originalFileName);
      const filePath = `po/${po_id}/${Date.now()}-${safeFileName}`;

      const category = validCategories.includes(categories[i]) ? categories[i] : "other";
      if (!validCategories.includes(categories[i])) {
        console.warn(`Invalid category for file ${safeFileName}: "${categories[i]}", defaulting to "other"`);
      }

      console.log("Original filename:", originalFileName);
      console.log("Cleaned filename:", safeFileName);
      console.log("Generated filePath:", filePath);

      // อัปโหลดไฟล์โดยใช้ filePath ที่เข้ารหัสแล้ว
      const { data, error } = await supabase.storage
        .from("hospital-files")
        .upload(filePath, file.buffer, { contentType: file.mimetype });

      if (error) {
        console.error("Supabase upload error details:", error);
        throw new Error(`Failed to upload file ${safeFileName}: ${error.message}`);
      }

      console.log("Supabase upload response:", data);

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/hospital-files/${filePath}`;

      files.push({
        original_file_name: originalFileName,
        file_name: safeFileName,
        file_type: file.mimetype,
        file_category: category,
        file_path: filePath,
        file_url: filePath,
        public_url: publicUrl,
      });
    }

    const updatedPO = await purchaseOrderModel.addPOFiles(po_id, files, userId);
    res.status(201).json(updatedPO);
  } catch (err) {
    console.error("❌ uploadPOFiles error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ Update Attachments
exports.updatePOAttachments = async (req, res) => {
  try {
    const po_id = req.params.id;
    const userId = req.user?.id || null;
    const { existingAttachments } = req.body;

    console.log("Full req.body:", req.body);

    const categories = req.body["categories[]"] || req.body.categories
      ? Array.isArray(req.body["categories[]"] || req.body.categories)
        ? (req.body["categories[]"] || req.body.categories).map((cat) => cat?.trim().toLowerCase())
        : [(req.body["categories[]"] || req.body.categories)?.trim().toLowerCase()]
      : req.files
      ? new Array(req.files.length).fill("other")
      : [];

    const originalNames = req.body["originalNames[]"] || req.body.originalNames
      ? Array.isArray(req.body["originalNames[]"] || req.body.originalNames)
        ? (req.body["originalNames[]"] || req.body.originalNames)
        : [(req.body["originalNames[]"] || req.body.originalNames)]
      : req.files
      ? new Array(req.files.length).fill(null)
      : [];

    console.log("Received files:", req.files?.map((f) => f.originalname) || "No files");
    console.log("Received categories (raw):", req.body["categories[]"] || req.body.categories);
    console.log("Received original names (raw):", req.body["originalNames[]"] || req.body.originalNames);
    console.log("Processed categories:", categories);
    console.log("Processed original names:", originalNames);
    console.log("Number of files:", req.files?.length || 0);
    console.log("Number of categories:", categories.length);
    console.log("Number of original names:", originalNames.length);
    console.log("Existing attachments:", existingAttachments);

    if (req.files && req.files.length !== categories.length) {
      console.error(`Mismatch: ${req.files.length} files, ${categories.length} categories`);
      return res.status(400).json({ message: "จำนวนไฟล์และหมวดหมู่ไม่ตรงกัน" });
    }
    if (req.files && req.files.length !== originalNames.length) {
      console.error(`Mismatch: ${req.files.length} files, ${originalNames.length} original names`);
      return res.status(400).json({ message: "จำนวนไฟล์และชื่อไฟล์ไม่ตรงกัน" });
    }

    const newFiles = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const originalFileName = originalNames[i] || Buffer.from(file.originalname, "latin1").toString("utf8");
        const safeFileName = cleanFileName(originalFileName);
        const filePath = `po/${po_id}/${Date.now()}-${safeFileName}`;

        const category = validCategories.includes(categories[i]) ? categories[i] : "other";
        if (!validCategories.includes(categories[i])) {
          console.warn(`Invalid category for file ${safeFileName}: "${categories[i]}", defaulting to "other"`);
        }

        console.log("Original filename:", originalFileName);
        console.log("Cleaned filename:", safeFileName);
        console.log("Generated filePath:", filePath);

        // อัปโหลดไฟล์โดยใช้ filePath ที่เข้ารหัสแล้ว
        const { data, error } = await supabase.storage
          .from("hospital-files")
          .upload(filePath, file.buffer, { contentType: file.mimetype });

        if (error) {
          console.error("Supabase upload error details:", error);
          throw new Error(`Failed to upload file ${safeFileName}: ${error.message}`);
        }

        console.log("Supabase upload response:", data);

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/hospital-files/${filePath}`;

        newFiles.push({
          original_file_name: originalFileName,
          file_name: safeFileName,
          file_type: file.mimetype,
          file_category: category,
          file_path: filePath,
          file_url: filePath,
          public_url: publicUrl,
        });
      }
    }

    const updatedPO = await purchaseOrderModel.updatePOFiles(
      po_id,
      newFiles,
      JSON.parse(existingAttachments || "[]"),
      userId
    );

    res.status(200).json(updatedPO);
  } catch (err) {
    console.error("❌ updatePOAttachments error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตไฟล์แนบ", error: err.message });
  }
};

// ✅ GET Attachments (with Signed URL)
exports.getPOFiles = async (req, res) => {
  try {
    const po_id = req.params.id;
    const files = await purchaseOrderModel.getPOFiles(po_id);

    if (!files || files.length === 0) {
      return res.status(404).json({ message: "ไม่พบไฟล์แนบสำหรับ PO นี้" });
    }

    const filesWithUrls = files.map((file) => {
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/hospital-files/${file.file_path}`;
      console.log("📂 Public URL for", file.original_file_name || file.file_name, ":", publicUrl);
      return { ...file, public_url: publicUrl };
    });

    res.json(filesWithUrls);
  } catch (err) {
    console.error("❌ getPOFiles error:", err.message);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};

// ✅ Mark PO used in GR
exports.markPOAsUsed = async (req, res) => {
  try {
    const po_id = req.params.id;
    const userId = req.user?.id || null;
    const result = await purchaseOrderModel.markPOAsUsed(po_id, userId);
    res.json({ message: "อัปเดต PO ว่าใช้ใน GR แล้ว", ...result });
  } catch (err) {
    console.error("❌ markPOAsUsed error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาด", error: err.message });
  }
};