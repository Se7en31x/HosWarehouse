const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ เช็กก่อนว่ามีค่า env ครบหรือยัง
if (!url || !key) {
  console.error("❌ Missing Supabase environment variables.");
  console.error("SUPABASE_URL:", url || "undefined");
  console.error("SUPABASE_SERVICE_ROLE_KEY:", key ? key.slice(0, 8) + "..." : "undefined");
  throw new Error("Supabase config is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.");
}

const supabase = createClient(url, key);

module.exports = supabase;
