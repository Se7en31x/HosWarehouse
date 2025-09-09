const { createClient } = require("@supabase/supabase-js");

// console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
// console.log("SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) + "...");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
  
);

module.exports = supabase;
